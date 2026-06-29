# Промпт (эпик): Device-Board — закрытие user functions (PR #159 / #160)

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** `id` = **`device-board-user-function-closeout`**  
> **Родитель:** follow-up к [`DEVICE_BOARD_CANVAS_GROUPS_FUNCTIONS_EPIC_PROMPT.md`](./DEVICE_BOARD_CANVAS_GROUPS_FUNCTIONS_EPIC_PROMPT.md) (U8 / CGF F1)  
> **Статус:** **active** — консилиум + merge train  
> **Ветки:** `fix/user-function-id-collision` (#159), `fix/user-function-delete-repair` (#160)

---

## Контекст

После merge PR #158 (comment groups, Phase 3) в работе два связанных PR по **пользовательским функциям**:

| PR | Ветка | Содержание | Review |
|----|-------|------------|--------|
| [#159](https://github.com/officefish/Membrana/pull/159) | `fix/user-function-id-collision` | Уникальный `functionId` при marquee collapse | LGTM (branch review) |
| [#160](https://github.com/officefish/Membrana/pull/160) | `fix/user-function-delete-repair` | Repair дубликатов на hydrate, safe delete по `draftIndex`, exec-first pins, badge **custom** + имя пользователя на subgraph-блоке | LGTM ([`branch-fix-user-function-delete-repair-code-review.md`](../discussions/branch-fix-user-function-delete-repair-code-review.md)) |

Без #159 новые collapse могут снова создавать коллизии `fn-1`; #160 смягчает legacy, но профилактика предпочтительна.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) §18 | User functions, pins, subgraph |
| [`DEVICE_BOARD_CANVAS_GROUPS_FUNCTIONS_EPIC_PROMPT.md`](./DEVICE_BOARD_CANVAS_GROUPS_FUNCTIONS_EPIC_PROMPT.md) | D-PINS-9, D-DEPTH-1 |
| [`docs/catalog/client/prompts/modules/device-board.md`](../catalog/client/prompts/modules/device-board.md) | Catalog prompt |
| [`apps/docs/device-board/editor/user-functions.mdx`](../../apps/docs/device-board/editor/user-functions.mdx) | Операторская документация |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы `@membrana/core` vs `device-board` |

**GitHub Issue:** [#161](https://github.com/officefish/Membrana/issues/161)

---

## Product / tech scope эпика

### In scope

1. **Консилиум** — обсуждение PR #159/#160, порядок merge, список doc/refactor follow-ups.
2. **Merge train** — #159 → rebase #160 → CI green → merge в `main`.
3. **Документация** — CONCEPT, catalog, Mintlify user-functions, при необходимости core JSDoc (`canonicalizeScenarioFunctionPinOrder`).
4. **Рефакторинг (условно)** — только то, что консилиум пометит P0/P1 до merge; остальное — Issues backlog.

### Out of scope

- Multi-function manager, nested subgraph (depth > 1).
- Новые продуктовые фичи user functions (expand inline, undo stack).
- Изменения runtime exec-subgraph semantics без LGTM Vesnin.

---

## Фазы

| Фаза | Task id | Ответственный | Артефакт |
|------|---------|---------------|----------|
| **C0** | `db-ufc-c0-consilium` | **Vesnin** | `docs/seanses/device-board-user-function-closeout-2026-06-24.md` |
| **C1** | `db-ufc-c1-merge-159` | **Ozhegov** | PR #159 merged |
| **C2** | `db-ufc-c2-merge-160` | **Ozhegov** | PR #160 rebased + merged |
| **C3** | `db-ufc-c3-docs-sync` | **Rodchenko** + Ozhegov | Doc PR или коммит в train |
| **C4** | `db-ufc-c4-refactor-backlog` | **Ozhegov** | Issue(s) или мини-PR по таблице консилиума |
| **C5** | `db-ufc-c5-archive` | **Vesnin** | `yarn task:archive device-board-user-function-closeout` |

**Порядок merge (default, подтвердить на C0):** #159 первым → `main` → rebase #160 → merge #160.

---

## Чеклист документации (C3)

- [ ] `DEVICE_BOARD_CONCEPT.md` — exec-first pins, `custom` badge на subgraph-блоке, `draftIndex` при duplicate id
- [ ] `docs/catalog/client/prompts/modules/device-board.md` — user functions UX (имя, pins, custom tag)
- [ ] `apps/docs/device-board/editor/user-functions.mdx` — оператор: создание, collapse, exec-in/out сверху, удаление функции
- [ ] `packages/core` — JSDoc на `canonicalizeScenarioFunctionPinOrder` (если публичный API)
- [ ] `docs/discussions/branch-fix-user-function-*-code-review.md` — ссылки в Issue close report

---

## Кандидаты рефакторинга (обсудить на C0)

| ID | Тема | Приоритет default |
|----|------|-------------------|
| R-UF-1 | Единый helper `userFunctionSubgraphBlockData(draft)` вместо дублирования в collapse/insert/sync | P2 (после merge) |
| R-UF-2 | Serialize: всегда `parseEncodedSubgraphRefLabel` перед `encodeSubgraphRef` | P1 (частично в #160) |
| R-UF-3 | `selectUserFunction` по `(id, index)` везде в UI (MiniMap, breadcrumbs) | P2 |
| R-UF-4 | Интеграционный тест: collapse двух функций подряд → уникальные id | P1 (покрыто unit в #159) |

---

## Промпт целиком (для агента)

> Ты — координатор виртуальной команды Membrana под руководством **Vesnin**. Закрой эпик user-function closeout: консилиум → merge #159/#160 → docs → archive.
>
> **Шаг 0:** `yarn consilium --save-as device-board-user-function-closeout-2026-06-24 "Порядок merge PR #159/#160, doc gaps, refactor P0/P1 для user functions"`
>
> **Шаг 1:** Дождаться CI green на #159, merge в `main`.
>
> **Шаг 2:** Rebase #160 на `main`, resolve conflicts, CI green, merge.
>
> **Шаг 3:** Выполнить чеклист C3; `yarn catalog:verify-client` если тронут catalog.
>
> **Шаг 4:** P0 refactor из консилиума — в том же train или отдельный PR с ссылкой на Issue.
>
> **DoD:** оба PR merged, docs обновлены, Issue закрыт, `yarn task:archive device-board-user-function-closeout`.

---

## Definition of Done (эпик)

- [ ] Консилиум ≥20 реплик, решение по merge order зафиксировано
- [ ] PR #159 merged
- [ ] PR #160 merged (rebased)
- [ ] Документация C3 — чеклист закрыт или явный defer в Issue
- [ ] `yarn turbo run lint typecheck test build --continue` green на `main`
- [ ] Operator smoke: две функции через marquee → разные id; reload → delete первой без duplicate keys; subgraph **custom** + user name
- [ ] `yarn task:archive device-board-user-function-closeout`
- [ ] LGTM Vesnin

---

## Заметки для постановщика

```bash
yarn consilium --save-as device-board-user-function-closeout-2026-06-24 \
  "PR #159 unique id on collapse vs PR #160 repair+exec-first+custom UX: merge order, documentation gaps, refactoring backlog"

gh pr checks 159
gh pr checks 160
gh pr merge 159 --squash   # после CI + LGTM
git fetch origin main && gh pr merge 160 --squash  # после rebase
yarn task:archive device-board-user-function-closeout --notes "PR #159+#160 merged; docs C3"
```
