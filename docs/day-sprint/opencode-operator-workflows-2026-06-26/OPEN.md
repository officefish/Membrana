# OPEN: OpenCode operator workflows & commands

| Поле | Значение |
|------|----------|
| **Sprint** | `opencode-operator-workflows-2026-06-26` |
| **Registry** | `opencode-operator-workflows-2026-06-26` |
| **Issue** | [#183](https://github.com/officefish/Membrana/issues/183) |
| **Kind** | day-sprint |
| **Status** | **closed** (see [`CLOSURE.md`](./CLOSURE.md)) |
| **Started** | 2026-06-26 |
| **Closed** | 2026-06-26 |
| **Size** | M (1 PR) |

**Prompt:** [`OPENCODE_OPERATOR_WORKFLOWS_SPRINT_PROMPT.md`](../../prompts/OPENCODE_OPERATOR_WORKFLOWS_SPRINT_PROMPT.md)
**Config:** [`opencode.json`](../../../opencode.json) · **Skills:** [`.opencode/skills/`](../../../.opencode/skills) · **Commands:** `.opencode/command/`

---

## Phases

| Phase | Registry id | Deliverable | Status |
|-------|-------------|-------------|--------|
| **B0** | `oc-b0-register` | prompt + registry + OPEN tracker | ✅ |
| **B1** | `oc-b1-skills` | 4 SKILL.md | ✅ |
| **B2** | `oc-b2-commands` | 6 `.opencode/command/*.md` | ✅ |
| **B3** | `oc-b3-config` | `opencode.json` + `AGENTS.md` | ✅ |
| **B4** | `oc-b4-closure` | verify + archive + Issue report | ✅ |

---

## Acceptance criteria (Issue #183)

1. Day sprint registered in `docs/tasks/registry.json` with active prompt + phase breakdown.
2. New OpenCode skills: client-module guard, full CI operator, issue triage, self-maintenance.
3. New OpenCode commands: standup, main-day, ritual-evening, full-ci, triage-issues, close-task.
4. Project config points OpenCode at expected skills/instructions; command files auto-discoverable.
5. Docs/task artifacts reflect the sprint; workflow follows `TASK_PROMPT_WORKFLOW.md`.

---

## Verify

```bash
node -e "JSON.parse(require('fs').readFileSync('opencode.json','utf8')); console.log('opencode.json OK')"
ls .opencode/command/*.md
ls -d .opencode/skills/membrana-{client-module-guard,full-ci-operator,issue-triage,opencode-self-maintenance}
node scripts/task-list.mjs | tail -3
```
