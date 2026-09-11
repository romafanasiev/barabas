# M0 — Фундамент

Status: in-progress

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
