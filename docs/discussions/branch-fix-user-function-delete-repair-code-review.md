<!-- Сгенерировано: 2026-06-24 (branch review, PR #160) -->

Tier: T2

[Teamlead]: Ветка `fix/user-function-delete-repair` — три блока: (1) P0 duplicate `fn-1` — repair на hydrate, delete по `draftIndex`, `activeFunctionDraftIndex`; (2) CGF F1 — exec-поток **первым** портом на Input/Output (`canonicalizeScenarioFunctionPinOrder` в core), exec pins неудаляемы; (3) subgraph-блоки на ветках — бейдж **custom**, заголовок = имя пользователя (`parseEncodedSubgraphRefLabel`), без `::fn-id` в UI; сериализация без двойного кодирования label. Комплементарно PR #159. **LGTM** после зелёного CI.

[Структурщик]: **C1** — `@membrana/core` (pins) + `@membrana/device-board` (repair, collapse, pin-ops, subgraph-ref, board-flow-node, serialize). Repair — pure `repair-duplicate-scenario-functions.ts`. Runtime `blockKind: 'subgraph'` + `functionId` не менялись. Тесты: repair, remove, pin order, exec guard, subgraph-ref. ✅

[Математик]: —

[Музыкант]: —

[Верстальщик]: Канвас: `custom` badge (`badge-secondary`) на subgraph-блоках; title — user-defined name. Inspector при выборе блока — имя из draft. Exec pins: read-only, без delete. Список функций: `key={fn.id::index}`. ✅

---

**Итоговый артефакт:**  
Repair/delete дубликатов функций, exec-first pins, UX subgraph-блоков (custom tag + точное имя).

**Definition of Done:**
```bash
yarn workspace @membrana/core test -- src/contracts/device-board/device-board.test.ts
yarn workspace @membrana/device-board test -- src/graph/repair-duplicate-scenario-functions.test.ts src/graph/remove-user-function.test.ts src/graph/collapse-to-function.test.ts src/graph/function-pin-ops.test.ts src/graph/subgraph-ref.test.ts
yarn workspace @membrana/device-board lint
```

**Риски:** P2 — без PR #159 новые collapse могут создавать дубликаты id; repair/delete смягчают. Legacy data-only function pins получат exec-in/out при hydrate.

**Вердикт:** **LGTM**
