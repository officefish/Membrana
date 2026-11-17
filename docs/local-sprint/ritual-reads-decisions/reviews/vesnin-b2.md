# Vesnin Review: b2 `evening-reads-decisions`

Subject: scripts/lib/decisions-ledger-port.mjs, scripts/lib/team-evening-feedback-ritual.mjs, scripts/team-evening-feedback.mjs, scripts/team-evening-feedback-ritual.test.mjs — diff против origin/main (спринт ritual-reads-decisions, 30.09).
Прогон: `node scripts/ask-persona.mjs vesnin --ticket-file <diff-b2> --no-save`, 30.09 12:35Z.

## Ревью b2 evening-reads-decisions

**Вердикт: LGTM** (с одним замечанием, не блокирующим).

**Проверено по коду:**

- Порт читает только верхний уровень `docs/sprint/cut/*.json`: `readdir(cutDir)` + фильтр `.endsWith('.json')`, без рекурсии — `fixtures/ghost.json` в fixture подтверждает, что подкаталоги молча пропускаются (`decisions-ledger-port.mjs:73–83`).
- Окно лент: `daysOfWindow(sinceDay, today)` итерирует UTC-дни включительно; отсутствие файла дня — `continue`, не находка (`decisions-ledger-port.mjs:90–98`). Тест на `2026-09-15.jsonl` за окном это фиксирует.
- Реестр обязателен: отсутствие/битость → строка в `unreadable` со словами «состояние карточек не сверено» (`decisions-ledger-port.mjs:101–107`). Тест `ПОРЧА` держит формулировку.
- Порядок в промпте: `doneWorkBlock` → `decisionsBlock` → `## Свежесть входов` → `## Документы дня` (`team-evening-feedback-ritual.mjs:340–348`), тест на `indexOf` это гарантирует.
- Один порт на трёх читателей: `collectDecisionsLedger` — единственная точка сбора; в `team-evening-feedback.mjs` дергается один раз, синонимов-фасадов нет.
- Нечитаемое не роняет вечер: `try/catch` вокруг JSON.parse планов и лент, `ok=false` без throw (`decisions-ledger-port.mjs:78–82, 94–98`).

**Находка (не блок):**

- `decisions-ledger-port.mjs:47` — `DEFAULT_IO` объявлен `Object.freeze`, но в `collectDecisionsLedger` делается `{ ...DEFAULT_IO, ...(opts.io ?? {}) }` — это ок; однако сам порт **импортирует** `existsSync/readFileSync/readdirSync` и `readProcedureRunTrail` статически. Для теста-каркаса дня и зуба утверждений (двух других читателей по нарезке) это значит: подменить ФС можно только через `opts.io`, но `readTrail` по умолчанию всё равно упирается в реальную `procedure-run-journal.mjs`. В фикстуре сработало, потому что писали настоящие файлы. Для полноценной изоляции у трёх читателей стоит убедиться, что `opts.io.readTrail` действительно перекрывает путь — на первый взгляд да (`decisions-ledger-port.mjs:96`: `io.readTrail(cwd, rel)`), значит порт готов. Оставляю как заметку архитектору-потребителю: не забудьте прокинуть `readTrail` в каркасе дня.

**Вне зоны блока b2:**

- Форматирование `formatDecisionsBlock`, `ratifiedDecisionsOf`, `joinClosedSprintsWithCards` — ядро `decisions-ledger.mjs`, здесь не тронуто; ревью формы блока — на ядре.
- Гейт магистрали (b3) и книга сделанного (b1) — соседние блоки.
- CI-интеграция вывода `[decisions-ledger] …` в лог — операционная деталь, не архитектурная.

Границы блока чистые: foundation-логика в `lib/`, ритуальная композиция — в `team-evening-feedback-ritual.mjs`, CLI-склейка — в `team-evening-feedback.mjs`. Форма выдерживает нагрузку трёх читателей.
