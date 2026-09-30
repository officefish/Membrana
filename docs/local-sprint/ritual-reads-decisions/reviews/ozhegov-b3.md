# Ozhegov Review: b3 `day-plan-reads-closures`

Subject: scripts/lib/day-plan-frame.mjs, scripts/day-plan-frame.test.mjs, scripts/day-plan.mjs — diff против origin/main (спринт ritual-reads-decisions, 30.09).
Прогон: `node scripts/ask-persona.mjs ozhegov --ticket-file <diff-b3> --no-save`, 30.09 12:35Z.

## Ревью b3 day-plan-reads-closures

**Вердикт: LGTM** с одной мелкой оговоркой (см. находку 1) — не блокирует.

### Что проверено по коду

- **Граница словаря.** `candidatesFromRegistry` (frame.mjs:139) делегирует «закрыт ↔ карточка» в `staleCandidates` из `decisions-ledger.mjs` — суждение живёт в ведомости, здесь только применение. Это ровно та лемма, что заявлена в JSDoc.
- **Симметрия отбора и исключения.** `excludedCandidates` (frame.mjs:149) вызывает `candidatesFromRegistry(tasks, { size })` **без** `closedSprints` и прогоняет тот же `staleCandidates` — гарантия, что `kept ∪ excluded` = исходный отбор по size. Тест `b3: исключение действует и на размер M` это фиксирует.
- **Три состояния источника — три разных посылки** (day-plan.mjs:171–181): `undefined/null` → «НЕ прочитаны», пусто → «прочитаны, среди кандидатов нет», непусто → поимённо с причиной и явное «в магистраль НЕ предлагать; долг закрытия назвать в санитарных». Слово владельца «исключать И помечать» отражено буквально.
- **Порт один.** `collectDecisionsLedger` (day-plan.mjs:201) вызывается из `main`, значение прокидывается через `sources.closedSprints` — `buildContext` остаётся чистой (тестируется без ФС, что и делает `day-plan-frame.test.mjs`).
- **--dry-run без LLM** (day-plan.mjs:219–229): печатает top-3, исключённых и посылки; `invokeProcedureLlm` не вызывается, `docs/DAY_PLAN.md` не пишется — сказано на stderr явно.
- **Циклов и обходов `index.ts` нет:** `day-plan-frame.mjs` → `decisions-ledger.mjs` (одна стрелка), `day-plan.mjs` → оба + порт. Синонимов-фасадов на «исключение» не завёл.

### Находки

1. **frame.mjs:141 — размер выборки для `excludedCandidates` может разойтись с фактическим отбором `buildContext`.** В `day-plan.mjs:74` при пустом `L` происходит фолбэк на `M`, и `excludedCandidates` вызывается с тем же `size='M'` — здесь всё честно. Но публичный контракт `excludedCandidates(tasks, opts)` в frame.mjs самостоятельно фолбэка не делает: внешний потребитель, повторяющий логику «L → M», обязан помнить о нём сам. Тест `b3: карточка active L…` использует только `L`, где сценарий совпадает. Опровержение частичное — фолбэк живёт в `buildContext`, не в ядре. Предложение: либо задокументировать в JSDoc `excludedCandidates`, что size передаётся тот же, что финально сработал в `candidatesFromRegistry`, либо вынести «L→M с fallback» отдельной функцией в `day-plan-frame.mjs` и переиспользовать в обоих местах. Не блок.

2. **day-plan.mjs:196 — мёртвая строка `readBounded('docs/tasks/registry.json')`** осталась без присваивания (результат отбрасывается, JSON читается ниже отдельно). Опровергается кодом: значение нигде не используется. Убрать.

### Вне зоны блока

- Устройство `collectDecisionsLedger` и `staleCandidates` (ведомость решённого) — их контракт задаёт блок a/ядро ведомости, здесь только потребитель.
- Формат `docs/DAY_PLAN.md`, шапка провенанса, `assemble/sign` — не тронуты диффом.
- Санитарный слот и «долг закрытия» как формулировка в санитарных — посылка обещает, но сам текст санитарного слота собирает LLM по промпту (вне зоны b3).
