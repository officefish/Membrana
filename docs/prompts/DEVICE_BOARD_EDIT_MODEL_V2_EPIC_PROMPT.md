# Промпт (epic · active): Device-Board — Edit model v2 (навигация + декомпозиция context)

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** эпик **`device-board-edit-model-v2-2026-06-22`**  
> **Предшественник:** PR [#140](https://github.com/officefish/Membrana/pull/140) · [`DEVICE_BOARD_UI_FOLLOWUP_SPRINT_PROMPT.md`](./DEVICE_BOARD_UI_FOLLOWUP_SPRINT_PROMPT.md)  
> **Статус:** **active** — consilium tech-debt после follow-up sprint  
> **Пакет:** `@membrana/device-board` only (без `core` / `vesnin`)

---

## Контекст

Follow-up sprint (F1–F7) доставил undo depth=1, F7 branch snapshot, UI polish. Code review (#140) и Bugbot выявили:

- **God-context** `device-board-graph-context.tsx` (~2700 строк)
- Разрозненная навигация (`setScenarioBranch` vs `enterFunctionBranch`) — регресс fn-switch при F7 revert (исправлен hotfix в #140)
- Нет integration-тестов на matrix переходов dirty/clean

Эпик **не** расширяет undo на drag (D3) и **не** меняет scope undo на ветку (D2) — отдельные фазы backlog.

---

## Product decisions (consilium tech-debt 2026-06-22)

| ID | Решение |
|----|---------|
| **E-NAV-1** | Единый API `navigateScenarioBranch(target, { revertPolicy })` вместо рассыпанных `setScenarioBranch` / `enterFunctionBranch` |
| **E-NAV-2** | `RevertPolicy`: `revert-if-dirty` (sidebar handler tabs, Signal) vs `keep-dirty` (fn-1→fn-2, collapse→function, create function) |
| **E-CTX-1** | Вынести edit/undo + branch navigation из Provider в чистые модули; context — склейка |
| **E-TEST-1** | Integration tests (Vitest + RTL): dirty handler switch, fn switch, collapse→function — без регрессии F7 |

---

## Phases

| Phase | Registry id | Size | DoD summary |
|-------|-------------|------|-------------|
| **E1** | `db-edit-v2-nav-contract` | M | `branch-navigation.ts`: `RevertPolicy`, `planBranchNavigation`, `navigateScenarioBranch` в context; все call sites через API; 0 прямых `setScenarioBranchState` вне модуля |
| **E2** | `db-edit-v2-extract-modules` | L | `edit-undo-controller.ts` + wiring; context −300 LOC; публичный API контекста не ломается |
| **E3** | `db-edit-v2-nav-integration-tests` | M | ≥5 сценариев: handler dirty revert, fn switch keep draft, undo forget on nav, collapse→function, Signal leave |

**Рекомендуемый порядок:** **E1 → E2 → E3**

---

## Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Navigation | `graph/branch-navigation.ts` | E1: policy, plan, pure helpers |
| Undo | `graph/edit-undo-controller.ts` (E2) | snapshot capture/restore, forget, dirty recalc hooks |
| Context | `device-board-graph-context.tsx` | State + вызов navigation/undo modules |
| Tests | `*.integration.test.tsx` (E3) | Provider + shell smoke paths |

### RevertPolicy — матрица (канон)

| Переход | Policy |
|---------|--------|
| Sidebar: handler → handler | `revert-if-dirty` |
| Handler → Signal | `revert-if-dirty` |
| Handler → function (first entry, dirty main) | `revert-if-dirty` |
| function → function (list click) | `keep-dirty` |
| collapse → function | `keep-dirty` |
| create function (already on function) | `keep-dirty` |

Undo clear reasons — `resolveBranchNavigationUndoClearReason` (`edit-step-log.ts`).

---

## Out of scope (backlog)

| ID | Тема |
|----|------|
| D2 | Scoped undo (ветка / function only) |
| D3 | Undo free node drag |
| D7 | Edit logs → scenarioTrace buffer |
| D8 | Shell hooks decomposition |
| D9 | Confirm modal on dirty branch switch |
| D6 | GetServer `server-global` (`vesnin`) |

---

## Definition of Done (эпик)

- [ ] E1–E3 archived в реестре
- [ ] `yarn workspace @membrana/device-board test` green
- [ ] PR merged; closure note в archive card
- [ ] Нет регрессии F7 / F3 из follow-up sprint

---

## Промпт целиком (для агента)

Ты — координатор Membrana (Vesnin). Пакет: `@membrana/device-board` only.

**Цель:** стабильная модель навигации и отката редактирования без god-context.

1. **E1:** реализуй `branch-navigation.ts` и переведи все переходы веток на `navigateScenarioBranch` с явным `RevertPolicy`.
2. **E2:** вынеси undo в `edit-undo-controller.ts`; context импортирует и делегирует.
3. **E3:** integration tests на матрицу из таблицы RevertPolicy.

Не трогай `core`, `apps/client` (кроме alias если нужен), runtime audio. Сохрани публичный API `DeviceBoardGraphContextValue`.

Перед коммитом: `yarn workspace @membrana/device-board test`.
