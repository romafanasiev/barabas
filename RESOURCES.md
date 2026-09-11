# Ticketing Backend Resources

Проверенные источники под миссию (см. [MISSION.md](./MISSION.md)). Ссылки проверены
2026-09-10, блок «Наблюдаемость» — 2026-09-11. Знание для уроков берётся отсюда, а не из головы агента.

## Knowledge

### Целостность данных и конкурентность (ядро миссии)

- [PostgreSQL Docs — 13.2. Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
  Первоисточник по Read Committed / Repeatable Read / Serializable, с точными описаниями
  аномалий. Use for: любой вопрос «а что увидит вторая транзакция».
- [PostgreSQL Docs — 13.3. Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
  Row-level locks (`FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`), дедлоки, advisory locks.
  Use for: реализация брони места, разбор дедлоков.
- [PostgreSQL Docs — 14.1. Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
  Use for: чтение планов запросов, доказательство что индекс реально используется.
- [Use The Index, Luke! — Markus Winand](https://use-the-index-luke.com/)
  Лучший бесплатный текст про индексы для разработчиков (не для DBA). Use for: M8,
  проектирование составных индексов, ORDER BY + LIMIT, покрывающие индексы.
- [Designing Data-Intensive Applications — Martin Kleppmann](https://www.dataintensive.net/)
  Книга. Главы 7 (Transactions) и 8 (Trouble with Distributed Systems) — фундамент.
  Use for: понимание *почему* существуют уровни изоляции, write skew, lost update.
- [Transactional Outbox pattern — microservices.io](https://microservices.io/patterns/data/transactional-outbox.html)
  Use for: M5 — как атомарно записать заказ и опубликовать событие.

### Проектирование схемы

- [Database Design Patterns — Redgate](https://www.red-gate.com/blog/database-design-patterns/)
  Обзор паттернов схемы, включая audit-таблицы и историчность. Use for: `M1-10`, `M1-11`.
- [Mastering Relational Database Design — dev.to](https://dev.to/louaiboumediene/mastering-relational-database-design-a-comprehensive-guide-3jh8)
  Нормализация, cardinality, ключи — компактно и по делу. Use for: `M1-02`, `M1-09`.
  Вторичный источник: сверяй спорное с документацией PostgreSQL.
- [PostgreSQL Docs — Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
  Use for: `M1-10` — как сохранить `UNIQUE` при soft delete
  (`CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL`).

### Domain-Driven Design (тактический)

- [Domain-Driven Design Reference — Eric Evans](https://www.domainlanguage.com/ddd/reference/)
  Бесплатный PDF: сжатые определения всех паттернов от автора. Use for: точные формулировки,
  когда спорим о терминах. Читать как справочник, не подряд.
- [Effective Aggregate Design — Vaughn Vernon](https://www.dddcommunity.org/library/vernon_2011/)
  Три статьи, лучший существующий текст про **границы агрегатов**. Use for: `M1-13`, `M1-14`.
  Обязательное чтение перед проектированием агрегатов — там же правило «маленькие агрегаты»
  и «ссылайся по id».
- [DDD_Aggregate — Martin Fowler](https://martinfowler.com/bliki/DDD_Aggregate.html)
  Определение на одну страницу. Use for: быстрое напоминание.
- [AnemicDomainModel — Martin Fowler](https://martinfowler.com/bliki/AnemicDomainModel.html)
  Антипаттерн, в который скатывается 90% попыток DDD. Use for: самопроверка на ревью `M1-17`.
- [ValueObject — Martin Fowler](https://martinfowler.com/bliki/ValueObject.html)
  Use for: `M1-16`, зачем нужен `Money`.
- [Repository — Martin Fowler (PoEAA)](https://martinfowler.com/eaaCatalog/repository.html)
  Use for: `M1-18`, чем репозиторий отличается от DAO.
- [BoundedContext — Martin Fowler](https://martinfowler.com/bliki/BoundedContext.html)
  Use for: понимание, почему у нас один контекст, а не пять.
- [CQRS — Martin Fowler](https://martinfowler.com/bliki/CQRS.html)
  Use for: `M2-15` — обоснование, почему чтение идёт мимо агрегатов. Берём только разделение
  чтения и записи, не полный CQRS с двумя хранилищами.
- [Hexagonal Architecture — Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
  Первоисточник про порты и адаптеры. Use for: `M1-15`, направление зависимостей.
- [.NET Microservices — DDD & CQRS patterns (Microsoft)](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/)
  Лучшее бесплатное подробное руководство по слоям и агрегатам. Примеры на C#, но идеи и
  структура папок переносятся один в один. Use for: `M1-15`, структура модуля.
- [Domain-Driven Hexagon](https://github.com/Sairyss/domain-driven-hexagon)
  Референсный репозиторий на **TypeScript + NestJS** с этой архитектурой. Use for: посмотреть,
  как это выглядит в коде. Осторожно: местами избыточно — не копировать целиком, брать идеи.
- [Introduction to DDD — Khalil Stemmler](https://khalilstemmler.com/articles/domain-driven-design-intro/)
  DDD применительно к TypeScript/Node. Use for: мягкое введение перед Vernon.

### Дизайн REST API

- [RFC 9457 — Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc9457)
  Стандартный формат тела ошибки (`application/problem+json`). Первоисточник, читается за
  20 минут. Use for: `M2-11`. Заменяет самодельный `{ error: "..." }`.
- [RFC 9110 — HTTP Semantics](https://datatracker.ietf.org/doc/html/rfc9110)
  Первоисточник по методам, статус-кодам, идемпотентности и безопасности методов.
  Use for: спор «какой код возвращать» — тут ответ, а не мнение из блога.
- [Richardson Maturity Model — Martin Fowler](https://martinfowler.com/articles/richardsonMaturityModel.html)
  Четыре уровня зрелости REST, от «один URI на всё» до HATEOAS. Use for: `M2-08` — решить,
  докуда доводим API, и уметь это защитить.
- [restfulapi.net](https://restfulapi.net/)
  Разбор шести REST constraints и практики URI-дизайна. Use for: `M2-08`, `M2-09`.
  Не первоисточник, но связно и без воды.
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)
  Реальный промышленный свод правил: URI, версионирование, пагинация, ошибки.
  Use for: `M2-09`, `M2-10` — образец того, как выглядит style guide живой компании.
- [RESTful API Design Guide — Strapi](https://strapi.io/blog/restful-api-design-guide-principles-best-practices)
  Практические рекомендации. Use for: быстрый чеклист перед ревью `M2`.
- [NestJS — Versioning](https://docs.nestjs.com/techniques/versioning)
  Use for: `M2-10`, встроенные стратегии версионирования (URI, header, media type).

### NestJS

- [NestJS Documentation](https://docs.nestjs.com/)
  Официальные доки. Use for: всё по фреймворку — модули, providers, pipes, interceptors.
- [NestJS — Authentication](https://docs.nestjs.com/security/authentication)
  Use for: M3, JWT-стратегия, guards, роли.
- [NestJS — Testing](https://docs.nestjs.com/fundamentals/testing)
  `Test.createTestingModule`, overrideProvider, e2e через supertest. Use for: M7.
- [NestJS — OpenAPI (Swagger)](https://docs.nestjs.com/openapi/introduction)
  Use for: M2, генерация спеки из DTO-декораторов.
- [NestJS — Interceptors](https://docs.nestjs.com/interceptors)
  Use for: `M0-04` (correlation id), `M2-11` (единая обёртка ответа).
- [NestJS — Exception Filters](https://docs.nestjs.com/exception-filters)
  Use for: `M2-05`, `M2-11` — как превратить любое исключение в Problem Details.

### Data layer

- [node-postgres (pg)](https://node-postgres.com/)
  Драйвер. Use for: понимание пула соединений и того, что транзакция живёт на *одном*
  соединении — источник половины багов у новичков.
- [TypeORM Docs](https://typeorm.io/)
  Use for: миграции, `QueryRunner`, `setLock('pessimistic_write')`.
- [Kysely](https://kysely.dev/)
  Типобезопасный query builder без магии ORM. Use for: альтернатива, если ORM начнёт мешать.
- [Prisma Docs](https://www.prisma.io/docs)
  Use for: справка. Осторожно: прячет SQL и блокировки — плохой выбор для *этой* миссии.

### Инфраструктура, тесты, эксплуатация

- [Testcontainers for Node.js](https://node.testcontainers.org/)
  Настоящий PostgreSQL в Docker на время integration-тестов. Use for: M7 — тесты без моков БД.
- [Testcontainers](https://testcontainers.com/) — общая документация проекта.
- [Docker Compose Docs](https://docs.docker.com/compose/)
  Use for: M0 и M9 — healthchecks, depends_on, профили.
- [Redis — Develop docs](https://redis.io/docs/latest/develop/)
  Use for: M4 (TTL-брони, атомарность через Lua) и M6 (pub/sub для fanout SSE).
- [Pino](https://getpino.io/)
  Структурированное логирование для Node. Use for: `M0-04`, `M0-07` — correlation id и
  `redact` на токены и email.
- [OpenAPI Specification](https://swagger.io/specification/)
  Use for: справка по формату, когда генератор делает что-то странное.
- [Node.js Best Practices — Yoni Goldberg](https://github.com/goldbergyoni/nodebestpractices)
  Use for: общий чеклист качества бекенда, обработка ошибок, безопасность.
- [JavaScript Testing Best Practices — Yoni Goldberg](https://github.com/goldbergyoni/javascript-testing-best-practices)
  Use for: M7 — как *называть* и структурировать тесты, AAA, что не мокать.
- [Jest — Getting Started](https://jestjs.io/docs/getting-started)
  Use for: `M7-01`, справка по matchers, `jest.fn`, `jest.spyOn`.
- [Test Double — Martin Fowler](https://martinfowler.com/bliki/TestDouble.html)
  Каноническое разделение dummy / stub / spy / mock / fake (по Meszaros). Use for: `M7-08`
  и урок `0016`. Читать до того, как назовёшь очередную заглушку «моком».
- [supertest](https://github.com/ladjs/supertest)
  HTTP-ассерты поверх приложения без поднятия порта. Use for: `M7-03`.
- [Playwright — Best Practices](https://playwright.dev/docs/best-practices)
  Use for: `M7-09`, `M7-12` — устойчивые селекторы, авто-ожидания, изоляция тестов,
  почему `waitForTimeout` запрещён.
- [Integration Testing with Node.js — dev.to](https://dev.to/claradev32/integration-testing-with-nodejs-370c)
  Use for: `M7-02`, обзорно. Testcontainers из этого же раздела — надёжнее для тестовой БД.

### Наблюдаемость

- [Google SRE Book — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
  Первоисточник по **четырём золотым сигналам** (latency, traffic, errors, saturation).
  Ключевое место: latency успешных и упавших запросов надо мерить **раздельно** — 500-ка
  отвечает быстро и портит среднее. Use for: `M8-10`, `M8-14`.
- [Prometheus — Metric and label naming](https://prometheus.io/docs/practices/naming/)
  Суффиксы (`_total`, `_seconds`), базовые единицы, что должно быть label, а что именем.
  Дословно про ловушку: «Do not use labels to store dimensions with high cardinality (many
  different label values), such as user IDs, email addresses, or other unbounded sets of
  values». Use for: `M8-10`, `M8-11`.
- [Prometheus — Histograms and summaries](https://prometheus.io/docs/practices/histograms/)
  Почему p99 считается на сервере из buckets, и почему усреднять готовые квантили
  бессмысленно. Use for: `M8-10` — histogram вместо gauge со средним.
- [Prometheus — Alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
  Синтаксис правил, `for`, labels и annotations. Use for: `M8-14`.
- [OpenTelemetry — JavaScript](https://opentelemetry.io/docs/languages/js/)
  Первоисточник по SDK, авто-инструментации и экспортёрам. Use for: `M8-12` — span на
  транзакцию и на ожидание блокировки, `trace_id` в логах.
- [PostgreSQL Docs — 27.2. The Cumulative Statistics System](https://www.postgresql.org/docs/current/monitoring-stats.html)
  `pg_stat_database` (deadlocks, conflicts), `pg_stat_activity` (кто кого ждёт),
  `pg_stat_statements`. Use for: `M8-13` — наблюдаемость БД без сторонних агентов.
- [PostgreSQL Docs — 19.8. Error Reporting and Logging](https://www.postgresql.org/docs/current/runtime-config-logging.html)
  `log_min_duration_statement`, `log_lock_waits`, `log_line_prefix`. Use for: `M8-13`.

### Property-based и мутационное тестирование

- [fast-check](https://fast-check.dev/) · [Getting started](https://fast-check.dev/docs/introduction/getting-started/)
  Property-based тестирование для TypeScript. Генерирует входные данные и **сжимает**
  найденный контрпример до минимального. Use for: `M7-14`, `M7-15`.
- [fast-check — Model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/)
  Случайные последовательности команд против упрощённой модели. Use for: `M7-16` — самый
  сильный тест в проекте. Читать внимательно, механика неочевидная.
- [«What is property-based testing?» — Hypothesis](https://hypothesis.works/articles/what-is-property-based-testing/)
  Лучшее короткое введение в идею. Примеры на Python, идея языконезависима.
  Use for: понять принцип до того, как открывать API fast-check.
- [«Testing the Hard Stuff and Staying Sane» — John Hughes](https://www.youtube.com/watch?v=zi0rHwfiX1Q)
  Доклад автора QuickCheck: как property-based тесты находят баги, которые не находит никто.
  Use for: мотивация перед `M7-15`. Час, но окупается.
- [Stryker Mutator — StrykerJS](https://stryker-mutator.io/docs/stryker-js/introduction/)
  Мутационное тестирование для JS/TS, работает с Jest. Use for: `M7-17`.
- [Stryker — Mutant states and metrics](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/)
  Killed / survived / no coverage / timeout и как считается mutation score.
  Use for: `M7-18` — чтобы разбирать отчёт, а не смотреть на цифру.

### Прикладные разборы (вторичные, но по делу)

- [SELECT FOR UPDATE in PostgreSQL — Stormatics](https://stormatics.tech/blogs/select-for-update-in-postgresql)
  Разбор контеншена и дедлоков на практике.
- [Handling the Double-Booking Problem in Databases](https://adamdjellouli.com/articles/databases_notes/07_concurrency_control/04_double_booking_problem)
  Прямо про задачу двойного бронирования.

## Wisdom (Communities)

- [NestJS Discord](https://discord.gg/nestjs)
  Официальный сервер, ядро команды отвечает. Use for: вопросы по DI, структуре модулей,
  «почему provider не резолвится».
- [r/PostgreSQL](https://www.reddit.com/r/PostgreSQL/)
  Use for: ревью схемы и планов запросов. Приносить `EXPLAIN ANALYZE`, а не «медленно работает».
- [r/node](https://www.reddit.com/r/node/)
  Use for: общие бекенд-вопросы, ревью структуры проекта.
- [Stack Overflow — postgresql tag](https://stackoverflow.com/questions/tagged/postgresql)
  Use for: конкретные ошибки с текстом ошибки.

## Gaps

- Нет хорошего единого источника именно по **ticketing-домену** (модель мест, holds, fraud).
  Пока компенсируется общими материалами по concurrency. Искать: инженерные блоги
  Ticketmaster / Eventbrite / DICE.
- Нет проверенного русскоязычного источника по изоляции транзакций достаточного качества —
  учимся по англоязычным первоисточникам, объяснения даёт агент.
- Community-предпочтения Романа не уточнены: не подтверждал, что готов писать в Discord/Reddit.
  Спросить перед тем, как всерьёз отправлять его за wisdom.
