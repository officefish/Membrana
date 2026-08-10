# Обсуждение: block-b2-adr-vesnin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-10 12:32 UTC · vesnin

**Вопрос:** Блок b2-adr-forecast-amnesty спринта s-queue-tail-2026-08-10 — ты автор ADR-0026 (amnesty-by-schema). Факты носителя: (1) scripts/lib/procedure-run-journal.mjs держит константу JOURNAL_SCHEMA='procedure-run-journal@1'; validateProcedureRunRecord требует ТОЧНОГО совпадения schema; (2) open-записи создаёт инструмент: ensureSprintRunOpen при sprint:cut --ratify (запись создаётся инструментом, не рукой); close — closeProcedureRun из execution-gate; (3) записи прогнозов живут в docs/sprint/experience/forecast-records.jsonl, ключ связки — sprintId (равен runId прогона спринта), валидатор validateForecastRecord; (4) вердикт tarasov: маркер живёт в schemaVersion ленты (@2 или @1.1 additive), поле forecastRequired обязательно у новых open-записей, у @1 отсутствует и трактуется как false (амнистия), ставит его держатель прогона при open, гейт только читает. Реши для ADR: (а) @2 или @1.1 — учитывая, что validate сейчас точное сравнение и обе версии должны жить в одной ленте; (б) forecastRequired обязателен у ЛЮБОЙ @2-записи или только у open (runPhase=open)? (в) что именно проверяет гейт при close с forecastRequired=true — существование валидной записи прогноза с sprintId==runId (predicted достаточно) или требовать и observed/outcome? (г) имя и одну формулу ADR.

**Ответ:**

[память:подсознание] emerge vesnin-2026-08-03-static-mmbrn-container-m1-boundary — образец «форма контракта = положительная граница + отрицательная граница + инвариант смены версии»; ровно этот каркас нужен для amnesty-by-schema, чтобы @1/@2 держались в одной ленте без течей.

Конструкция. Валидатор сейчас — точное равенство schema. Значит канон один: **множественная схема в одной ленте**. Выбираю **@2** (не @1.1): маркер обязан быть заметным, «additive» скроет разлом и через месяц никто не вспомнит, что @1 = амнистия. @1.1 маскирует semantics-change под косметику — это декор.

Варианты и цена.
- **@2 + `forecastRequired` только у open** — минимально; close/append записей не таскают лишнее поле, ключ связки sprintId==runId уже несёт остальное. Цена: гейт обязан читать open-запись прогона, а не любую последнюю. Так и так читает — норма.
- @2 + поле у любой записи — избыточно, close-хвост дублирует флаг, риск рассинхрона open↔close.

Проверка на close. Гейт при `forecastRequired=true` требует **только `predicted`** с `sprintId==runId` и валидной по `validateForecastRecord`. `observed/outcome` — это ретроспектива, она живёт на своём такте (после факта спринта), тянуть её в close-гейт значит смешать прогноз и ретро — граница поедет.

Затронутые модули: `scripts/lib/procedure-run-journal.mjs` (константа + ветка валидации по schema), `execution-gate` (closeProcedureRun: чтение open-записи и проверка forecast при флаге), `sprint:cut --ratify` (проставление `forecastRequired` при create-open), docs/sprint/experience/forecast-records.jsonl (не меняется).

ADR-0026 · имя: **«Amnesty-by-schema для forecastRequired: @1 = амнистия, @2 = явный флаг у open»**.
Формула: `требуется_прогноз(run) := run.schema === 'procedure-run-journal@2' && run.runPhase === 'open' && run.forecastRequired === true`; при `true` close валиден ⇔ `∃ forecast: schema==forecast-record, sprintId==run.runId, validateForecastRecord(forecast)==ok`.

Рекомендация: **нужен ADR** (это смена контракта ленты), консилиум не требуется — вердикт Тарасова уже задал рамку, я лишь фиксирую границу.

---
