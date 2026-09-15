# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` — never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading
- An issue moving to `ready-for-human` carries a `## План работ` section — see below

## План работ

Каждый issue, уходящий в `ready-for-human`, получает секцию `## План работ`: чекбоксы
`- [ ]`, у каждого пункта — наблюдаемый признак готовности строкой *«Готово, когда: …»*.
Признак должен быть виден в терминале или в тесте, а не проверяться на глаз.

План читается как **business requirements**: он говорит, что должно стать правдой и в каком
порядке. Он не говорит, как это написать, и **готового кода реализации в нём нет** — режим
работы проекта из `CLAUDE.md` не отменяется. Границу держать так: «подключить X через хук
`genReqId`» — можно, это уровень документации; готовый файл с реализацией — нельзя.

Что ещё входит в пункт, когда уместно:

- **Ловушка**, о которую спотыкаются, делая это первый раз, — прямо в тексте пункта, а не
  в конце issue
- **Точка решения**, если у пункта несколько правильных ответов: сказать, что выбор за
  Романом, и потребовать назвать его на ревью
- Отдельными пунктами в конце — **мутация** (проверить, что тест кусается) и **гейты**
  (`format:check`, `lint`, `typecheck`, `test`) перед ревью

Порядок пунктов — рабочий, а не логический: следующий шаг опирается на то, что предыдущий
уже видно. Роман отмечает выполненное прямо в файле, и на ревью обе стороны ссылаются на
номер пункта.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
