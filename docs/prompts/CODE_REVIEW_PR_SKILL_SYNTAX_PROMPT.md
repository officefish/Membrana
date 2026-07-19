# Промпт: скилл code-review — синтаксис `yarn code-review:pr`

> **Task-промпт.** Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **XS**. Артефакт: **1 PR** — канон команд синхронизировать с TF-2.
> Реестр: `id` = `code-review-pr-skill-syntax`. **GitHub Issue:** [#587](https://github.com/officefish/Membrana/issues/587).

---

## Контекст

Эпизод 16.07: скилл звал `yarn code-review:pr -- <N>` → yarn съедал `--`,
скрипт получал `pr="--"` (TF-2: теперь внятный отказ). Работает:
`yarn code-review:pr <N>` (без `--`). Подсказка в `code-review-ritual.mjs` уже
правильная; канон в скилле / части docs врёт.

### Что править

1. `.cursor/skills/membrana-code-review/SKILL.md` — таблица Commands.
2. Зеркала с той же строкой: `.opencode/skills/membrana-code-review/SKILL.md`.
3. Согласовать однострочники-канон, если всё ещё с `--`:
   - `docs/prompts/CODE_REVIEW_REGULATION.md` (таблица команд);
   - `AGENTS.md` (таблица Key commands; грабля уже верная — не ломать);
   - комментарий в шапке `scripts/code-review.mjs`.
4. `.claude/skills/membrana-code-review` — только делегирует на `.cursor/`; правки кода не нужны.

### Out of scope

Менять парсер argv, поведение yarn, lint скиллов против package.json (#587 follow-up).

### DoD

- [ ] Ни один скилл `membrana-code-review` не учит форме с `--`.
- [ ] `CODE_REVIEW_REGULATION` / `AGENTS` Key commands / шапка скрипта согласованы.
- [ ] `Closes #587`. LGTM Teamlead.

---

## Заметки

`yarn task:archive code-review-pr-skill-syntax --notes "PR #…"`.
