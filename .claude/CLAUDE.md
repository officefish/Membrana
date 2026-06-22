# Membrana — Claude Code

Read first: [`AGENTS.md`](../AGENTS.md), [`.cursorrules`](../.cursorrules).

**Project agent skills (canonical):** [`.cursor/skills/README.md`](../.cursor/skills/README.md)

Claude Code skills in `.claude/skills/` are **thin mirrors** — follow the linked `.cursor/skills/*/SKILL.md` for full playbooks.

## Daily rhythm

- Morning: `yarn ritual:day` — see `membrana-developer-rhythm`
- Evening: `yarn ritual:evening` — archive day before code-review
- Task close: `yarn task:archive <id>` then evening `yarn task:close-github`

## CLI

```bash
yarn claude:code    # proxy-aware Claude Code launcher
```

Do not commit `.env` or deploy logs to repo root — use `%TEMP%` / `$TMPDIR`.
