# Tarasov Review: b4 `claims-probe-reads-decisions`

Subject: scripts/lib/feedback-claims/atoms.mjs (+test), scripts/lib/feedback-claims/verdict.mjs (+test), scripts/feedback-claims-probe.mjs (+test) — diff против origin/main (спринт ritual-reads-decisions, 30.09).
Прогон: `node scripts/ask-persona.mjs tarasov --ticket-file <diff-b4> --no-save`, 30.09 12:35Z.

[память:подсознание] emerge tarasov-2026-07-30-sprint-honest-m3-contract-review — ревью контракта до accept: здесь проверяю ровно то, что просит контракт блока (symbolHeadOf по голове, decidedInOf с полным якорем, OUTCOMES закрыт), а не «красивость» диффа.

**Положение.** Diff меняет только slоварь атомов, контекст пробы и предикат вердикта; клиентского кода и сервисов не касается — вне зоны блока корректно.

**Проверено по коду:**
- `symbolHeadOf` (atoms.mjs): regex `^[ident](\.[ident])* \s*={1,3}\s*\S` — берёт голову, требует непустое значение, двоеточие не оператор. Тесты `atoms.test.mjs` держат порчу: `'NIGHT_RUN_MAX_AGE_MS ='→null`, `'kind: close'→null`, `'two words = 1'→null`, `undefined→null`.
- `classifyToken`: голова-выражение сводится к `[SYMBOL]` только если сама голова опознаётся как SYMBOL; иначе `OPAQUE`. Тест `promo_revoked = true → OPAQUE` подтверждает — литерал протокола символом не становится.
- `collectEvidence` (feedback-claims-probe.mjs:297): `decidedIn` кладётся ДО switch по классам — доступен любому классу. При `ctx.ledger=undefined` — `null` («не узнали»), при подан+не найден — `[]`. Тест `b4: с ведомостью…` держит оба случая.
- `symbolDecls` теперь ищет `symbolHeadOf(token) ?? token` — адрес в `addressOf(SYMBOL)` печатает ту же голову. Согласованность есть.
- `decidedInOf` (verdict.mjs): порог `t.length < 4` защищает от `at`/`id`/`(1)` (тест держит `(1) → []`); печатает полный якорь `path#key (ратифицировано …)` и `спринт закрыт … (status), карточка … — долг закрытия`.
- `withDecided`: хвост «· решено: …» приклеивается ко ВСЕМ трём ветвям (holds/unknown/hard|soft); порядок «reason@sha · решено:» — читаемый. Тест держит: `null → без хвоста`, `[] → без хвоста`, `holds+card active` — хвост есть.
- `OUTCOMES` — `Object.keys` проверен явно: `['HOLDS','HARD','SOFT','UNKNOWN']`. Контракт «не пятый цвет» соблюдён.

**Находки (мелочь, не блокирующая):**
- `feedback-claims-probe.mjs:552` — при `!ledger.ok` в `stderr` пишем и ВСЁ РАВНО кладём ledger в ctx. Это осознанно (частичная ведомость лучше `null`), но тестом на сценарий `ok=false` не покрыто. Не блок, но замечание для эрудиции.
- `decidedInOf`: `d.text.includes(t)` — подстрока без границ. Для коротких `aria-current` работает, но токен вида `id` даже с порогом 4 может ложно совпасть внутри слова. Порог 4 смягчает, не снимает. Приемлемо на v0.1.

**Вне зоны блока:** UI, детекторы, TDOA, media-library, background-* — не тронуты.

**Вердикт: LGTM.** Контракт блока b4 выполнен: голова судится как символ, решённость печатается полным якорем и живёт причиной, список исходов закрыт.
