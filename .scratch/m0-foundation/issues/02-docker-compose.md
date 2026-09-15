# M0-02 — Docker Compose: postgres + redis + api

Status: resolved

## Задача

`docker-compose.yml` с тремя сервисами: `postgres`, `redis`, `api`. API должен стартовать
только после того, как база **реально готова принимать соединения**, а не после того, как
контейнер запустился.

## Definition of Done

- У `postgres` и `redis` есть `healthcheck`
- У `api` — `depends_on: { postgres: { condition: service_healthy } }`
- Данные postgres переживают `docker compose restart` (named volume)
- Порты наружу не конфликтуют с локально установленными postgres/redis
- В репозитории есть `.env.example` со всеми переменными

## На что смотрю на ревью

- **`sleep 5` вместо healthcheck — автоматический возврат на доработку**
- Healthcheck проверяет соединение (`pg_isready`, `redis-cli ping`), а не «процесс существует»
- Пароли не захардкожены в compose-файле

## Comments

### 2026-09-11 — ревью #1: возврат на доработку

Проверено: `docker build --target production`, `docker compose config`, поведение
`redis-cli ping` под `--requirepass`, `PGDATA` в `postgres:18`.

**Blocking**

1. `npm ci` в pnpm-воркспейсе — build падает, lock-файла нет в контексте.
2. Healthcheck redis всегда зелёный: `redis-cli ping` под `requirepass` печатает
   `NOAUTH` и выходит с кодом 0. Плюс `api` ждёт redis по `service_started`,
   а не `service_healthy` — DoD не выполнен.
3. `DATABASE_URL` = `localhost:5433/old_poshta`: изнутри контейнера `localhost` — это сам
   api; база называется `barabas`.
4. Сервис `api` не запускает приложение (`build` закомментирован, голый `node:26-alpine`).
5. `pg_isready -U postgres -d barabas` — хардкод вместо переменных; auth не проверяется.

**Принято как правильное**: `postgres_data:/var/lib/postgresql` — верно именно для
`postgres:18` (образ объявляет `VOLUME /var/lib/postgresql`, `PGDATA=/var/lib/postgresql/18/docker`).

Nitpicks: нет `.dockerignore`; нет `start_period` у postgres; разнобой `restart`;
`container_name`; redis на дефолтном 6379 наружу; `env_file` раздаётся всем сервисам.

### 2026-09-11 — ревью #2

Закрыто: redis `depends_on: service_healthy`; порт redis 6378; `start_period` у postgres;
единый `restart`; `container_name` убраны.

Частично: `DATABASE_URL` в compose теперь верный (`postgres:5432/barabas`), но приложение
читает `POSTGRES_DATABASE_URL` (env.schema.ts), а он в `.env.example` всё ещё
`localhost:5433/old_poshta`. Два имени для одной вещи — выбрать одно.

Не закрыто: `redis-cli -a ... ping` возвращает 0 даже при `WRONGPASS` (проверено) — код
возврата не годится, нужен разбор вывода; пароль из `${REDIS_PASS}` попадает в
`docker inspect`; `pg_isready` с хардкодом; `api` не запускает приложение; Dockerfile/pnpm.

Поправка к ревью #1: старый `redis-cli ping` не был «зелёным всегда» — при отказе в
соединении он даёт exit 1, то есть порядок старта им проверялся. Не проверялись креды.

### 2026-09-11 — ревью #3: принято

DoD проверен запуском, не чтением.

| Пункт DoD | Проверка | Итог |
| --- | --- | --- |
| healthcheck у postgres и redis | `docker compose ps` → обе `(healthy)` | ок |
| `api` ждёт зависимости по здоровью | `Waiting` → `Healthy` → `Starting` в логе `up` | ок |
| данные переживают рестарт | таблица пережила `restart` и полный `down` + `up` | ок |
| порты не конфликтуют | 5433 и 6378 наружу | ок |
| `.env.example` со всеми переменными | корень, рядом с compose | ок |
| пароли не захардкожены | только `POSTGRES_DB` литералом | ок |

Дополнительно: redis реально под паролем (`redis-cli ping` → `NOAUTH`), AOF включён,
Nest стартует в контейнере, интерполяция без warning'ов.

Dockerfile (multi-stage, pnpm-воркспейс) написан агентом — см. решение в диалоге 2026-09-11,
граница из [[tooling-tasks-agent-does-domain-stays-review-driven]]: упаковка образа бекенду
не учит. Healthcheck'и и compose Роман сделал сам.

**Перенесено дальше, не блокирует:**

1. `pg_isready -U postgres -d barabas` — литералы вместо `POSTGRES_USER` / `POSTGRES_DB`.
   Работает только потому, что значения в `.env` совпали.
2. `redis-cli -a ... ping` возвращает 0 даже при `WRONGPASS` — healthcheck не валидирует
   креды, только доступность порта. Всплывёт в M0-05, где readiness должен различать
   «redis жив» и «redis отвечает мне».
3. Анонимный том `/usr/src/app/node_modules` в dev-таргете создаётся один раз и не
   обновляется при смене зависимостей. Симптом будет: поставил пакет на хосте — в
   контейнере `ERR_MODULE_NOT_FOUND`. Лечение: `docker compose down -v` и пересборка.
