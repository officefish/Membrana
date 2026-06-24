# Консилиум: закрытие user functions — PR #159 / #160

**Дата:** 2026-06-24  
**Эпик:** `device-board-user-function-closeout` · [`DEVICE_BOARD_USER_FUNCTION_CLOSEOUT_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_USER_FUNCTION_CLOSEOUT_EPIC_PROMPT.md)  
**Повестка:** порядок merge, пробелы в документации, рефакторинг P0/P1, operator smoke перед archive.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант, Верстальщик (Rodchenko).

**Порядок реплик:** Teamlead → Структурщик → Математик → Музыкант → Верстальщик (цикл).

---

[Teamlead]: Открываем closeout по user functions. В полёте PR #159 (профилактика id при collapse) и #160 (repair legacy, exec-first pins, custom badge + user name). Цель сеанса — merge train и doc gaps, без новых фич.

[Структурщик]: #159 трогает только `collapse-to-function` + context — минимальный diff. #160 затрагивает core `canonicalizeScenarioFunctionPinOrder` — additive API. Merge order: сначала #159, потом rebase #160. Иначе #160 может устареть относительно collapse.

[Математик]: Exec-first — инвариант порядка массива pins, не формула. Тесты в core + device-board достаточны. Интеграционный тест «два collapse подряд» желателен в C5 smoke, unit в #159 уже есть.

[Музыкант]: Runtime exec-subgraph не менялся — `blockKind: subgraph` и `functionId` на месте. Run smoke после merge: вызов функции с exec-in сверху на boundary. Headless CI без микрофона — OK.

[Верстальщик]: Badge `custom` на subgraph — presentation only, не путать с `blockKind: custom` у Event. Имя на канвасе через `parseEncodedSubgraphRefLabel` — принимаю. В user-functions.mdx нужны скриншоты/описание exec сверху и тег custom.

[Teamlead]: Согласен: UI `custom` ≠ schema `custom`. Документируем явно в CONCEPT.

[Структурщик]: R-UF-1 (единый `userFunctionSubgraphBlockData`) — P2, после merge. Дублирование в collapse/insert/sync не блокер. R-UF-2 serialize — частично в #160, закрыть в C3 если ещё дыры.

[Математик]: Repair `fn-1` на hydrate — детерминированный remap по порядку вхождения. Математически корректно при occurrence index. Не смешивать с id generation — разные слои.

[Музыкант]: —

[Верстальщик]: `draftIndex` в списке функций и delete modal — must keep. MiniMap keys `fn.id::index` — проверить вручную после merge #160.

[Teamlead]: Doc checklist C3 обязателен до archive. Catalog `device-board.md` + Mintlify `user-functions.mdx` — Rodchenko lead.

[Структурщик]: #160 не должен жить без #159 в долгую — иначе снова плодим дубликаты. Merge #159 сегодня при зелёном CI.

[Математик]: `MAX_SCENARIO_FUNCTION_PINS_PER_SIDE = 9` не затронут. Canonicalize не увеличивает count.

[Музыкант]: —

[Верстальщик]: Inspector: exec read-only, data CRUD — задокументировать в operator doc. Rename функции → sync subgraph label — упомянуть.

[Teamlead]: Refactor P0 до merge — только если CI ломается. Иначе C4 → Issues.

[Структурщик]: Rebase #160: возможен конфликт в `device-board-graph-context.tsx` если #159 тоже трогал context — разрешать в пользу объединения обоих патчей.

[Математик]: Принимаю merge order #159 → #160.

[Музыкант]: Operator smoke: main branch, две функции marquee, reload, delete first — без console duplicate keys.

[Верстальщик]: Принимаю. После merge обновлю user-functions.mdx в C3.

[Teamlead]: Консенсус: merge train, docs C3, P2 refactor в backlog. Эпик archive после C5.

[Структурщик]: Принимаю.

[Математик]: Принимаю.

[Музыкант]: Принимаю.

[Верстальщик]: Принимаю.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Порядок merge | **#159 → `main` → rebase #160 → merge #160** |
| Конфликты rebase | Объединить collapse-id + repair/delete в graph-context |
| Документация | C3: CONCEPT §18, catalog device-board, `user-functions.mdx`, code-review links |
| Рефакторинг P0 | Нет (только при блокере CI) |
| Рефакторинг P1/P2 | R-UF-1..4 в Issues или post-merge PR |
| UI `custom` vs `blockKind` | Badge `custom` на subgraph; schema остаётся `subgraph` |
| Operator smoke | Две функции, reload, delete, exec-first, custom badge |
| Archive | `yarn task:archive device-board-user-function-closeout` после C5 |

## Definition of Done (эпик)

- PR #159 и #160 в `main`, CI green
- Документация C3 закрыта
- Smoke пройден
- GitHub Issue закрыт, эпик в архиве

**Вердикт Teamlead:** **LGTM** на план closeout.
