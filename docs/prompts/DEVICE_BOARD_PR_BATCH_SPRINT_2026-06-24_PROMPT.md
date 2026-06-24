# Промпт (day sprint): Device-Board — приёмка PR batch #168–#171

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** эпик **`device-board-pr-batch-sprint-2026-06-24`**  
> **Консилиум:** [`docs/seanses/device-board-pr-batch-sprint-2026-06-24-2026-06-24.md`](../seanses/device-board-pr-batch-sprint-2026-06-24-2026-06-24.md)  
> **Сводный review:** [`docs/discussions/sprint-device-board-pr-batch-2026-06-24-code-review.md`](../discussions/sprint-device-board-pr-batch-2026-06-24-code-review.md)  
> **Пакеты:** `@membrana/device-board` · `@membrana/core` (только #171 pure-eligibility)

---

## Контекст

После merge **#168** (Sequence UX + recording graph clarity) остались два открытых PR:
**#170** (multi-function insert, viewport center, edit hint) и **#171** (pure-eligible
`GetRecorder` / `GetSpectralAnalyser`). Day-sprint: консилиум → code review → docs/tests → merge.

**Уже merged:** [#168](https://github.com/officefish/Membrana/pull/168)  
**В scope:** [#170](https://github.com/officefish/Membrana/pull/170), [#171](https://github.com/officefish/Membrana/pull/171)  
**Вне scope:** #135, #80, #69

---

## Product decisions (консилиум 2026-06-24)

| Вопрос | Решение |
|--------|---------|
| Порядок merge | **#170 → #171** (низкий риск конфликта) |
| #170 тесты | Unit: `insert-function-into-branch.test.ts` (multi-insert + explicit position) |
| #171 тесты | `pure-node-graph.test.ts` — pin sync при `pure: true` на ref-getters |
| #171 API | **Не** новый публичный export функций — pure-eligibility в `scenario-node-pure.ts` + pin sync в graph |
| Документация | CONCEPT §18 multi-insert (#170); CONCEPT §15.7 ref-getters pure (#171) |
| Follow-up | GitHub Issue: fn-blocks inspector (переключение вложенных функций в сайдбаре) |

---

## Phases

| Phase | PR | DoD |
|-------|-----|-----|
| **S0** | — | `yarn consilium` → протокол в `docs/seanses/` |
| **S1** | #170, #171 | `yarn code-review:pr -- 170` / `171` → LGTM |
| **S2** | #170 | CONCEPT multi-insert; push; CI green; squash merge |
| **S3** | #171 | rebase on `main`; CONCEPT §15.7; push; CI green; squash merge |
| **S4** | — | Issue follow-up; `yarn task:archive`; closure doc |

---

## Manual smoke (#170)

1. Device-board editor → main scenario branch.
2. Sidebar → вставить пользовательскую функцию **дважды**.
3. Ожидание: блоки `fn-X-block` и `fn-X-block-2`; edit-hint «функция … добавлена».
4. Оба блока в exec-цепочке → runtime вызывает одну функцию дважды (разные экземпляры).

## Manual smoke (#171)

1. Canvas: `GetRecorder` / `GetSpectralAnalyser` → inspector → галочка **Pure** видна.
2. Pure on → exec pins скрыты; data-only resolve через `resolveInput`.
3. Impure → exec-in/out как раньше.

---

## Definition of Done

- [x] Консилиум сохранён
- [x] Code review LGTM на #170 и #171
- [x] CONCEPT обновлён
- [ ] #170 и #171 merged в `main`, CI green
- [ ] Follow-up Issue создан
- [ ] Эпик archived в `docs/tasks/registry.json`
