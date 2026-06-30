# Membrana — Claude Code

Read first: [`AGENTS.md`](../AGENTS.md), [`.cursorrules`](../.cursorrules).

**Project agent skills (canonical):** [`.cursor/skills/README.md`](../.cursor/skills/README.md)

Claude Code skills in `.claude/skills/` are **thin mirrors** — follow the linked `.cursor/skills/*/SKILL.md` for full playbooks.

## ⛔ Pre-sprint gate — ОБЯЗАТЕЛЕН перед первым Write/Edit нового спринта

Когда пользователь говорит «начинаем», «да», «поехали», «продолжаем спринт», «идём в спринт» —
**СТОП**. Прежде чем открыть первый файл:

1. Вызвать `membrana-task-lifecycle start <id>` (скилл загружен и применён)
2. Задача в `docs/tasks/registry.json`: `"id": "<id>", "status": "active"`
3. GitHub issue открыт, номер известен
4. `docs/day-sprint/<id>-YYYY-MM-DD/OPEN.md` создан с фазами DoD
5. `docs/DAY_SPRINT_ACTIVE.md` обновлён

**Только после всех 5 пунктов — первый коммит с кодом.**
Пропуск любого пункта — нарушение регламента.

## Shell: PowerShell 5.1 (Windows)

Среда разработки — Windows, shell — **PowerShell 5.1**. Bash-синтаксис не работает.

| Нужно | Запрещено |
|-------|-----------|
| `@'...'@` (heredoc) | `cat <<'EOF'` |
| `; if ($?) { B }` (цепочка) | `A && B` |
| `$env:VAR` | `$VAR` (без env:) |
| `New-Item -ItemType Directory -Force` | `mkdir -p` |

## Уточнение перед реализацией

Если термин допускает ≥2 разные интерпретации (пример: «регрессия» = closeness или containment?) —
**задай вопрос до написания первой строки кода**. Не угадывай.

## Daily rhythm

- Morning: `yarn ritual:day` — see `membrana-developer-rhythm`
- Evening: `yarn ritual:evening` — archive day before code-review
- Task close: `yarn task:archive <id>` then evening `yarn task:close-github`

## Mandatory end-of-session: Team Evening Feedback

**`membrana-team-evening-feedback` is a process obligation, not an option.**

After `yarn ritual:evening` completes (or when the user signals end of day — "уходим на
вечерний ритуал", "до завтра", "closing the day"), Claude Code MUST run:

```bash
yarn team-evening-feedback
```

Rules:
- Run even if `code-review` step failed — feedback is independent.
- If `ANTHROPIC_API_KEY` is unavailable, run `yarn team-evening-feedback:dry` and show
  the context to the user instead.
- Commit `docs/seanses/team-evening-feedback-<date>.md` after a successful run.
- Do not skip silently — if blocked, tell the user explicitly and offer `--dry` fallback.

## CLI

```bash
yarn claude:code    # proxy-aware Claude Code launcher
```

Do not commit `.env` or deploy logs to repo root — use `%TEMP%` / `$TMPDIR`.
