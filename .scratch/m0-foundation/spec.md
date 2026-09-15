# M0 — Фундамент

Status: resolved

Цель этапа: получить репозиторий, который клонируется на чистую машину, поднимается одной
командой и честно отвечает, здоров он или нет. Всё остальное строится поверх.

Контекст и полное описание этапа — в [ROADMAP.md](../../ROADMAP.md), раздел M0.

## Definition of Done для этапа

`git clone && docker compose up` на чистой машине → `GET /health/ready` отвечает `200`.
Останавливаешь контейнер postgres → `/health/ready` отвечает `503`, приложение не падает.

## Issues

- `01` Структура репозитория и тулинг
- `02` Docker Compose: postgres + redis + api
- `03` Конфигурация через env с валидацией на старте
- `04` Структурированное логирование и correlation id
- `05` Health checks: liveness и readiness
- `06` Graceful shutdown
- `07` Гигиена логов: уровни и redaction

## Итог этапа (2026-09-15)

Все семь issue в `resolved`. DoD этапа выполнен: `docker compose up` поднимает postgres, redis
и api, `GET /health/ready` отвечает `200`, остановленный postgres даёт `503` без падения
процесса.

Что осталось в репозитории сверх DoD и на что опирается M1:

- `core/infrastructure/postgres` — пул `pg` с таймаутом коннекта и обработчиком `error`.
  Это уже готовая точка входа в базу, с которой начинается решение `M1-01`
- `core/telemetry/logger` — сериализаторы на allowlist, redaction, правило уровней
  ([docs/logging.md](../../docs/logging.md), [ADR-0003](../../docs/adr/0003-log-redaction-allowlist.md))
- `core/lifecycle` — graceful shutdown и readiness, который умеет отвечать `503` осознанно
- Граница импортов между `apps/server` и `apps/web` на oxlint
  ([ADR-0002](../../docs/adr/0002-oxlint-and-import-boundary.md)) — механизм, которым в `M1-15`
  будет закрыт `domain/`

Работа лежит на ветке `m0-foundation` (8 коммитов впереди `main`). Влить до старта M1 —
решение Романа, см. вопрос в обсуждении перехода.
