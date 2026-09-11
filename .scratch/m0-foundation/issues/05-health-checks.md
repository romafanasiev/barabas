# M0-05 — Health checks: liveness и readiness

Status: needs-triage

## Задача

Два разных эндпоинта с разным смыслом:

- `GET /health` — **liveness**: процесс жив. Не ходит в зависимости. Всегда быстрый.
- `GET /health/ready` — **readiness**: могу обслуживать трафик. Проверяет реальное
  соединение с PostgreSQL и Redis.

## Definition of Done

- `docker compose stop postgres` → `/health/ready` отдаёт `503`, `/health` остаётся `200`
- Ответ readiness показывает, какая именно зависимость сломалась
- Проверка БД — это настоящий запрос (`SELECT 1`), а не «объект соединения не null»
- Есть e2e-тест на оба эндпоинта

## На что смотрю на ревью

- Понимаешь ли ты разницу между liveness и readiness — спрошу словами, зачем нужны оба
- `/health/ready` не должен виснуть навсегда: нужен таймаут на проверку

## Comments
