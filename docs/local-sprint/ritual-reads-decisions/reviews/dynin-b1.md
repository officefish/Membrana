# Dynin Review: b1 `decisions-ledger-core`

Subject: scripts/lib/decisions-ledger.mjs, scripts/lib/decisions-ledger.test.mjs — diff против origin/main (спринт ritual-reads-decisions, 30.09).
Прогон: `node scripts/ask-persona.mjs dynin --ticket-file <diff-b1> --no-save`, 30.09 12:31Z.

## Ревью b1 `decisions-ledger-core` — LGTM

**Что проверено по коду (не по прозе):**

- Чистота ядра: в `decisions-ledger.mjs` нет `node:fs`, `node:net`, `Date.now`, `new Date()`, `fetch`. Единственный импорт — константа `SPRINT_PROCEDURE_ID` из `sprint-run.mjs`. Условие нарезки соблюдено.
- Предикат решения: `ratifiedDecisionsOf` требует `isPlainObject(r) && r.by === RATIFIED_BY` и читаемый `dayOf(r.at)`. Порча в тесте (`noNode`, `lead=angelina`, `noAt`) даёт 0 — покрыто.
- Синонимия ключей: `DECISION_KEY = /^\/\/(decisions?|recut(-[A-Za-z0-9-]+)?)$/u` — `//decisions`, `//decision`, `//recut`, `//recut-<slug>` внутри; `//why`, `//recut_x`, `//decisions-note` — снаружи. Тест закрывает границу.
- `closedSprintRunsOf`: фильтр `procedureId === SPRINT_PROCEDURE_ID && runPhase === 'close'`, повторное закрытие сворачивается по `max(closedAt)` через `Map` — тест `fail→pass` подтверждает.
- `joinClosedSprintsWithCards`: `stale = active-эпик ∨ phasesActive>0`; `absent` не подделан под `archived`. Матрица 4 случая покрыта.
- `staleCandidates`: возвращает и `kept`, и `excluded` с причиной — «исключать И помечать» реализовано структурно, а не текстом.

**Находки (минорные, не блокирующие):**

- `decisions-ledger.mjs:117` — сортировка `closedSprintRunsOf` по `closedAt` строкой. Работает для ISO с Z или одинаковой TZ, но `2026-09-29T16:22:00+03:00` лексикографически > `2026-09-29T14:22:00Z`, хотя это один момент. Для окна дня не критично, но если появятся смешанные TZ — порядок «свежее сверху» поплывёт. Предлагаю нормализовать через `Date.parse` при сравнении (без выхода в часы — парсинг строки чист).
- `ratifiedDecisionsOf:75` — та же сортировка по строке `ratifiedAt`. Тот же комментарий.
- `clipDecision`: обрезка по кодовым единицам, не по графемам — для эмодзи/суррогатов может дать битую пару. Для протокольных решений маловероятно, оставляю на усмотрение.

**Вне зоны блока:** порт (`b2`), интеграция в вечер/каркас дня/зуб (`b3+`), чтение ФС и лент — сюда не смотрел. Тело PR и `CLOSURE.md` ведомостью не читаются по условию — согласен.

**Вердикт: LGTM.** Ядро тестируемое, инварианты названы предикатами, порча в тестах реальная. TZ-замечание — на следующий круг, не блокер.

[память:подсознание] emerge dynin-2026-08-21-duty-node-detection-m8-pasport — предикат `legal(metric, record)` того же жанра: здесь `decision(plan) ⇔ ratification.by=owner ∧ dayOf(at)≠null`, форма ратификации важнее прозы ключа, как форма сигнала важнее усиления.
[память:подсознание] emerge dynin-2026-09-08-tariff-single-truth-m1-reseed — тот же инвариант «одна SSOT, проекции равны версии»: план с `ratification` = источник, `//decisions`/`//recut-*` = проекции одного согласия, различать по имени ключа — искусственная синонимия, что регексп `DECISION_KEY` и фиксирует.
