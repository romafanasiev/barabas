# Ticketing — учебный проект

Это одновременно **учебный воркспейс** и **репозиторий проекта**. Роман учится бекенду,
строя систему продажи билетов на концерты. Миссия — в [MISSION.md](./MISSION.md), план —
в [ROADMAP.md](./ROADMAP.md), правила преподавания — в [NOTES.md](./NOTES.md).

## Режим работы — важно

**Агент не пишет продакшн-код этого проекта.** Роман берёт issue и делает сам; агент учит
(уроки в `lessons/`), ревьюит и возвращает на доработку. Писать агенту можно: уроки,
reference-документы, демонстрационные сниппеты внутри уроков, схемы.

Если Роман просит «сделай задачу за меня» — сначала уточнить, точно ли он хочет отойти от
этого режима; см. [learning-records/0002](./learning-records/0002-review-driven-workflow.md).

## Agent skills

### Issue tracker

Issues живут markdown-файлами в `.scratch/<этап>/issues/NN-<slug>.md`. См. `docs/agents/issue-tracker.md`.

### Triage labels

Пять канонических ролей, имена совпадают со значениями: `needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, `wontfix`. См. `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` и `docs/adr/` в корне. См. `docs/agents/domain.md`.

## Язык

Объяснения, уроки и ревью — на русском. Технические термины — на английском
(`transaction`, `constraint`, `guard`, `race condition`). Имена в коде, коммиты и
комментарии в коде — на английском.

## Единый язык домена

Все имена сущностей, таблиц, эндпоинтов и заголовков issue берутся из [CONTEXT.md](./CONTEXT.md).
Не «reservation», а **Hold**. Не «write-off», а **CheckIn**.
