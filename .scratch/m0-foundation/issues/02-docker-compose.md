# M0-02 — Docker Compose: postgres + redis + api

Status: needs-triage

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
