# CURRENT_TASK

> **Буфер** — при конфликте проигрывает [`MAIN_DAY_ISSUE.md`](./MAIN_DAY_ISSUE.md), реестру и task-промпту.

## Канон текущего sprint (2026-06-30)

**Текущий sprint:** `tdoa-localizer-spec-s1` ← **сейчас**
**Issue:** [#211](https://github.com/officefish/Membrana/issues/211)
**Prompt:** [`docs/prompts/TDOA_LOCALIZER_SPEC_S1_PROMPT.md`](./prompts/TDOA_LOCALIZER_SPEC_S1_PROMPT.md)
**OPEN:** [`docs/day-sprint/tdoa-localizer-spec-s1-2026-06-30/OPEN.md`](./day-sprint/tdoa-localizer-spec-s1-2026-06-30/OPEN.md)

### Фокус

TDOA/localizer Stage 2/3 **spec/design-review** без разморозки runtime-реализации.

### Особое правило

Каждый шаг реализации имеет ровно одного accountable owner из виртуальной команды Membrana.

### Текущая фаза

**TL2 — Closure / PR handoff** (Owner: Vesnin): подготовить CLOSURE.md после PR/LGTM и архивировать `tdoa-localizer-spec-s1`.

### Проверки

```bash
yarn workspace @membrana/core typecheck
```
