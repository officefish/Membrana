#!/usr/bin/env bash
#
# Scoped commit for day-sprint opencode-operator-workflows-2026-06-26 (Issue #183).
#
# Stages ONLY this sprint's files. The working tree has unrelated uncommitted work
# (apps/cabinet, .github/workflows, datasets) — those are left untouched.
#
# NOTE: opencode.json, AGENTS.md, docs/tasks/registry.json and docs/tasks/README.md
# are also touched by the #182 sprint. If you committed #182 first, that is fine —
# git stages current file state; both sprints' changes land coherently.
#
# Run from repo root on your machine (where git works normally):
#   bash docs/day-sprint/opencode-operator-workflows-2026-06-26/commit-sprint.sh

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git config core.fileMode false

echo "==> Sanity: opencode.json must be valid JSON"
python3 -m json.tool opencode.json >/dev/null && echo "    opencode.json OK"

echo "==> Staging #183 artifacts…"
# Task prompt
git add docs/prompts/OPENCODE_OPERATOR_WORKFLOWS_SPRINT_PROMPT.md

# New OpenCode skills (4) + commands (6)
git add .opencode/skills/membrana-client-module-guard \
        .opencode/skills/membrana-full-ci-operator \
        .opencode/skills/membrana-issue-triage \
        .opencode/skills/membrana-opencode-self-maintenance \
        .opencode/command

# Config + steering
git add opencode.json AGENTS.md

# Sprint tracker + review
git add docs/day-sprint/opencode-operator-workflows-2026-06-26 \
        docs/discussions/opencode-operator-workflows-code-review.md

# Registry + indexes + phase archive cards
git add docs/tasks/registry.json docs/tasks/README.md \
        docs/tasks/archive/oc-b0-register.md \
        docs/tasks/archive/oc-b1-skills.md \
        docs/tasks/archive/oc-b2-commands.md \
        docs/tasks/archive/oc-b3-config.md \
        docs/tasks/archive/oc-b4-closure.md \
        docs/tasks/archive/opencode-operator-workflows-2026-06-26.md

echo "==> Guard: refuse unrelated paths"
if git diff --cached --name-only | grep -E 'apps/(cabinet|demos)|\.github/workflows|device-scenario.*\.json'; then
  echo "ERROR: unexpected paths staged — aborting." >&2
  exit 1
fi

echo "==> Staged summary:"
git diff --cached --stat | tail -n 25
echo "    total staged: $(git diff --cached --name-only | wc -l) files"

git commit -m "feat(opencode): operator workflows & commands (#183)" -m "\
- 4 operator skills: client-module-guard, full-ci-operator, issue-triage, opencode-self-maintenance
- 6 commands (.opencode/command): standup, main-day, ritual-evening, full-ci, triage-issues, close-task
- opencode.json references.opencode-commands (auto-discovery); AGENTS.md operator commands section
- registry sprint opencode-operator-workflows-2026-06-26 + phases oc-b0..b4 (archived)
- all commands are thin wrappers over existing yarn scripts (no new logic)

Closes #183"

echo "==> Done. Review with: git show --stat HEAD"
