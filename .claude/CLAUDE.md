# Membrana — Claude Code

Read first: [`AGENTS.md`](../AGENTS.md), [`.cursorrules`](../.cursorrules).

**Project agent skills (canonical):** [`.cursor/skills/README.md`](../.cursor/skills/README.md)

Claude Code skills in `.claude/skills/` are **thin mirrors** — follow the linked `.cursor/skills/*/SKILL.md` for full playbooks.

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

## Parallel sessions

**Второй и последующие агенты — всегда в отдельном worktree** (`membrana-worktree`),
не в основном дереве: параллельные сессии в одном worktree коллизят (инцидент
2026-07-09 — чужая сессия переключила ветку; вынужденная сериализация работы).
Коммитить строго свои файлы поимённо, никогда `git add -A` при параллельной работе.

## CLI

```bash
yarn claude:code    # proxy-aware Claude Code launcher
```

Do not commit `.env` or deploy logs to repo root — use `%TEMP%` / `$TMPDIR`.
