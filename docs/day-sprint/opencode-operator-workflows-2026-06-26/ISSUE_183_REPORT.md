# Issue #183 — closing report (paste into GitHub)

**Complete.** OpenCode operator ergonomics upgraded: 4 skills + 6 commands, all thin wrappers over existing `yarn` scripts.

## Acceptance criteria

- [x] **AC1** — Day sprint registered in `docs/tasks/registry.json` (`opencode-operator-workflows-2026-06-26` + phases `oc-b0`…`oc-b4`) with active prompt `docs/prompts/OPENCODE_OPERATOR_WORKFLOWS_SPRINT_PROMPT.md`.
- [x] **AC2** — New skills: `membrana-client-module-guard`, `membrana-full-ci-operator`, `membrana-issue-triage`, `membrana-opencode-self-maintenance`.
- [x] **AC3** — New commands: `/standup`, `/main-day`, `/ritual-evening`, `/full-ci`, `/triage-issues`, `/close-task`.
- [x] **AC4** — `opencode.json` valid; `instructions: AGENTS.md`, `skills.paths: .opencode/skills`, `references.opencode-commands` → `.opencode/command` (auto-discovered).
- [x] **AC5** — Docs/task artifacts (prompt, OPEN/CLOSURE, archive cards) follow `TASK_PROMPT_WORKFLOW.md`.

## Verification

```
opencode.json            → VALID JSON (3 references)
.opencode/command/*.md   → 6 (all have frontmatter description)
.opencode/skills/...     → 4 new (name == dir)
wrapped yarn scripts     → no dangling
registry oc-b0..b4       → archived
```

## Command → script → skill

| Command | Wraps | Skill |
|---------|-------|-------|
| `/standup` | `yarn standup` | membrana-developer-rhythm |
| `/main-day` | `yarn main-day-issue` | membrana-developer-rhythm |
| `/ritual-evening` | `yarn ritual:evening` | membrana-developer-rhythm, membrana-code-review |
| `/full-ci` | `yarn turbo run lint typecheck test build --continue` | membrana-full-ci-operator |
| `/triage-issues` | `yarn issues:audit` | membrana-issue-triage |
| `/close-task <id>` | `yarn task:archive <id>` + `yarn task:close-github` | membrana-task-lifecycle |

Prompt: `docs/prompts/OPENCODE_OPERATOR_WORKFLOWS_SPRINT_PROMPT.md`

Closes #183
