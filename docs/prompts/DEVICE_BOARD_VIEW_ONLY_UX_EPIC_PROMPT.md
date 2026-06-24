# Промпт (эпик): Device-Board — UX режима «только просмотр»

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** `id` = **`device-board-view-only-ux`**  
> **Статус:** **active** — новый спринт (после defer merge PR #162)  
> **Пакет:** `@membrana/device-board` (+ smoke в `apps/client`)

---

## Контекст

При открытии **системного UserCase** (`DeviceBoardSession.kind === 'system-preview'`) доска помечается badge **«Только просмотр»**, граф блокирует мутации через `structureLockRef` / `isSessionReadOnly`, сохранение отключено. Однако UI **не согласован** с продуктовыми ожиданиями:

| # | Требование оператора | Текущее состояние (gap) |
|---|----------------------|-------------------------|
| 1 | Pan/zoom канваса и viewport остаются | Канвас получает `readOnly={isRuntime \|\| isSessionReadOnly}`; pan/zoom ReactFlow в целом работают, но `readOnly` смешивает «структура» и «навигация» — нужно зафиксировать контракт и регрессионные тесты |
| 2 | Палитра скрыта при любых действиях внутри сценария | `canEditScenario={!isSignal}` **не** учитывает `isSessionReadOnly`; `BoardNodePalettePanel` показывается на пустом выделении |
| 3 | Правый сайдбар: редактирование переменных и прочих полей заблокировано | `editDisabled = isRuntime \|\| !canEditScenario` — session read-only не участвует; инспектор активен |
| 4 | Левый сайдбар: edit/delete переменных и функций заблокированы | `constructorDisabled = !isScenarioLayer \|\| isRuntime` — session read-only не участвует; «+», карандаш, корзина активны |

**Не путать** с **конкурсным** режимом (`isCompetitionMode`): там структура locked, но **параметры** узлов менять можно. Этот эпик — только `system-preview` / `isSessionReadOnly`, если Teamlead не расширит scope на C0.

**Связанные PR (параллельно, не блокируют спринт):**

- [#162](https://github.com/officefish/Membrana/pull/162) — palette в редакторе функции (ветка `fix/function-editor-palette`); merge после smoke оператора, **до** или **после** R1–R3 — на усмотрение Teamlead.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) | Run = read-only canvas; system UserCase preview |
| [`docs/catalog/client/prompts/modules/device-board.md`](../catalog/client/prompts/modules/device-board.md) | Catalog prompt |
| [`DEVICE_BOARD_USER_FUNCTION_CLOSEOUT_EPIC_PROMPT.md`](./DEVICE_BOARD_USER_FUNCTION_CLOSEOUT_EPIC_PROMPT.md) | Недавний UX функций — не ломать navigation/view |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы device-board vs client |

**GitHub Issue:** [#163](https://github.com/officefish/Membrana/issues/163)

---

## Product / tech scope

### In scope

1. Единый флаг **`isScenarioViewOnly`** (или прокидывание `graph.isSessionReadOnly`) в shell → left/right sidebar + canvas props.
2. **Канвас:** разделить «structure read-only» (нет drag/connect/delete/marquee) и «viewport interactive» (pan, zoom, minimap, Controls) — явный контракт в `BoardFlowCanvas`.
3. **Правый сайдбар:** не рендерить `BoardNodePalettePanel` при view-only; все поля инспектора `disabled` + read-only copy где уместно; function pin inspector — только просмотр.
4. **Левый сайдбар:** disable add/rename/delete переменных; disable create/rename/delete user functions; **разрешить** навигацию по веткам, выбор функции для просмотра, collapse sidebar.
5. Unit/component тесты на ключевые ветки UI (минимум shell props + sidebar disabled states).
6. CONCEPT + catalog: абзац про system-preview UX.

### Out of scope

- Изменение `isDeviceBoardSessionReadOnly` semantics или competition `isStructureLocked`.
- Редактирование signal-слоя (отдельная сессия).
- Новые permission-модели cabinet / membrane ACL.
- Merge PR #162 (отдельное решение оператора).

---

## Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Session | `packages/device-board/src/types/device-board-session.ts` | `system-preview` → read-only session |
| Graph | `device-board-graph-context.tsx` | `isSessionReadOnly`, structure lock на мутациях |
| Shell | `device-board-shell.tsx` | Сводный `isScenarioViewOnly`, props в sidebars/canvas |
| Canvas | `board-flow-canvas.tsx` | `structureReadOnly` vs viewport (не ломать pan/zoom) |
| Left UI | `board-left-sidebar.tsx`, `board-function-list.tsx` | Disable CRUD, keep navigation |
| Right UI | `board-right-sidebar.tsx` | Скрыть palette; `editDisabled` включает view-only |

**Запрещено:**

- Дублировать проверки `session?.kind === 'system-preview'` в каждом обработчике — один источник из shell/context.
- Ломать competition mode (параметры редактируемы при structure lock).

---

## Фазы спринта

| Фаза | Task id | Ответственный | Артефакт |
|------|---------|---------------|----------|
| **R0** | `db-vo-r0-audit` | **Vesnin** | Таблица gap (этот промпт) + решение: scope только system-preview |
| **R1** | `db-vo-r1-canvas-viewport` | **Ozhegov** | Canvas: pan/zoom при structure read-only; тесты |
| **R2** | `db-vo-r2-right-sidebar` | **Rodchenko** | Palette hidden; inspector disabled |
| **R3** | `db-vo-r3-left-sidebar` | **Rodchenko** | Variables/functions CRUD disabled |
| **R4** | `db-vo-r4-docs-tests` | **Ozhegov** + Rodchenko | CONCEPT, catalog, CI green |
| **R5** | `db-vo-r5-archive` | **Vesnin** | `yarn task:archive device-board-view-only-ux` |

**Порядок PR (default):** R1 → R2 → R3 можно объединить в один PR если diff < 400 строк; иначе R1 отдельно, R2+R3 вместе.

---

## Definition of Done (эпик)

- [ ] System-preview UserCase: pan/zoom/minimap работают; узлы не двигаются, рёбра не редактируются.
- [ ] Палитра нод **не** видна на scenario-слое в view-only (включая function branch).
- [ ] Правый инспектор: все edit controls disabled; просмотр метаданных узла/переменной доступен.
- [ ] Левый сайдбар: нет add/rename/delete переменных и функций; ветки и просмотр функций работают.
- [ ] `yarn workspace @membrana/device-board test` + полный turbo CI green.
- [ ] LGTM Teamlead; Issue закрыт; epic archived.

---

## Промпт целиком (для агента)

> Ты — координатор виртуальной команды Membrana под руководством **Vesnin**. Реализуй эпик **device-board-view-only-ux**: согласованный UX режима «только просмотр» для system-preview UserCase.
>
> **Шаг 0:** Прочитай `device-board-shell.tsx`, `board-left-sidebar.tsx`, `board-right-sidebar.tsx`, `board-flow-canvas.tsx`, `device-board-graph-context.tsx` (isSessionReadOnly). Подтверди gap-таблицу из промпта.
>
> **Шаг 1 (R1):** В shell введи `isScenarioViewOnly = graph.isSessionReadOnly && !isSignal` (или эквивалент). Передай в canvas флаг, который блокирует структурные мутации, но **не** pan/zoom. Добавь тест на `BoardFlowCanvas` props / shell wiring.
>
> **Шаг 2 (R2):** `canEditScenario={!isSignal && !graph.isSessionReadOnly}`. В `BoardRightSidebar` не показывай `BoardNodePalettePanel` когда view-only; показывай empty-state «Режим просмотра» при `selectedNodeId === null`. Все `disabled={editDisabled}` должны включать view-only.
>
> **Шаг 3 (R3):** В `BoardLeftSidebar` расширь `constructorDisabled` (или отдельный `crudDisabled`) на `isSessionReadOnly`. `BoardFunctionList`: disable +, rename, delete; оставь select для навигации.
>
> **Шаг 4 (R4):** Обнови CONCEPT § про system preview; `yarn catalog:verify-client` если catalog prompt изменён.
>
> **Шаг 5:** PR `Closes #163`. Не трогай competition parameter editing.
>
> **Формат ответа:** virtual team labels + список файлов + чеклист DoD.

---

## Заметки для постановщика

1. Issue создано как imperfection/wish по acceptance criteria из чата оператора.
2. PR #162 merge — отдельно; после merge rebase ветку view-only от `main`.
3. Ручная проверка: открыть system UserCase → badge «Только просмотр» → пройти чеклист DoD.

### Проверка после PR

```bash
yarn workspace @membrana/device-board test
yarn turbo run lint typecheck test build --filter=@membrana/device-board --filter=@membrana/client --continue
```
