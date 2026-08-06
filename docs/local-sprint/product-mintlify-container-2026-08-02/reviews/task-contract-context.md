# Context run: task-contract

**Persona:** Vesnin
**Block:** `task-contract`
**Captured:** 2026-08-02T13:28:00+03:00

Vesnin checked that Issue #1622 is represented as one epic with two sequential
local-sprint children, that Product is the only active child in this run, and
that Harness remains frozen until Product closes and the owner ratifies a fresh
cut.

Evidence inspected:

- `docs/prompts/DUAL_MINTLIFY_PRODUCT_HARNESS_PROMPT.md`
- `docs/prompts/PRODUCT_MINTLIFY_CONTAINER_PROMPT.md`
- `docs/prompts/HARNESS_WORKFLOW_PAGES_PROMPT.md`
- `docs/tasks/registry.json`
- `scripts/tasks-decompose.config.json`

The task-registration helper did not forward `--no-issue`; the two child tasks
were therefore registered directly with explicit `noIssueReason`. The helper
defect is recorded as a procedure/tooling gap and was not repaired inside this
sprint.
