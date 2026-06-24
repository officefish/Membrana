<!-- Сгенерировано: 2026-06-24 (branch review, PR #160) -->

Tier: T2

[Teamlead]: Ветка `fix/user-function-delete-repair` — два блока: (1) P0 duplicate `fn-1` — repair на hydrate, delete по `draftIndex`, `activeFunctionDraftIndex`; (2) CGF F1 — exec-поток **первым** портом на Input/Output при создании, collapse и hydrate (`canonicalizeScenarioFunctionPinOrder` в core); exec pins неудаляемы (graph + UI). Комплементарно PR #159. **LGTM** после зелёного CI.

[Структурщик]: **C1** — `@membrana/core` (контракт pins: `canonicalizeScenarioFunctionPinOrder`, расширенный `normalizeScenarioFunctionPins`) + `@membrana/device-board` (collapse, commit draft, pin-ops, inspector). Repair — pure `repair-duplicate-scenario-functions.ts`, hydrate до sync subgraph. Тесты: repair, remove, pin order, exec delete guard. ✅

[Математик]: —

[Музыкант]: —

[Верстальщик]: Порядок handles на канвасе = порядок массива pins → exec сверху. Inspector: exec без кнопки удаления, имя read-only, badge `exec`. Список функций: `key={fn.id::index}`. ✅

---

**Итоговый артефакт:**  
Восстановление/безопасное удаление дубликатов пользовательских функций + канонический exec-first порядок граничных pins.

**Definition of Done:**
```bash
yarn workspace @membrana/core test -- src/contracts/device-board/device-board.test.ts
yarn workspace @membrana/device-board test -- src/graph/repair-duplicate-scenario-functions.test.ts src/graph/remove-user-function.test.ts src/graph/collapse-to-function.test.ts src/graph/function-pin-ops.test.ts
yarn workspace @membrana/device-board lint
```

**Риски:** P2 — без PR #159 новые collapse всё ещё могут создавать дубликаты id; repair/delete смягчают последствия. Legacy сценарии с data-only function pins получат exec-in/out при hydrate.

**Вердикт:** **LGTM**
