#!/usr/bin/env bash
#
# Scoped commit for day-sprint opencode-operator-skills-wave2-2026-06-26.
#
# Stages ONLY this sprint's files. Unrelated uncommitted work is left untouched.
# NOTE: AGENTS.md, docs/tasks/registry.json, docs/tasks/README.md are shared with
# the #182/#183 sprints — git stages current state; all changes land coherently.
#
# Run from repo root on your machine (git is unreliable from the cowork sandbox):
#   bash docs/day-sprint/opencode-operator-skills-wave2-2026-06-26/commit-sprint.sh

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git config core.fileMode false

echo "==> Staging wave-2 artifacts…"
# 5 new operator skills
git add .opencode/skills/membrana-git-pr \
        .opencode/skills/membrana-yarn-workspace \
        .opencode/skills/membrana-deploy-operator \
        .opencode/skills/membrana-security-review \
        .opencode/skills/membrana-env-secrets-guard

# Prompt + consilium + sprint tracker + review
git add docs/prompts/OPENCODE_OPERATOR_SKILLS_WAVE2_SPRINT_PROMPT.md \
        docs/discussions/opencode-operator-skills-wave2-consilium-2026-06-26.md \
        docs/discussions/opencode-operator-skills-wave2-code-review.md \
        docs/day-sprint/opencode-operator-skills-wave2-2026-06-26

# Steering (shared) + registry + phase archive cards
git add AGENTS.md docs/tasks/registry.json docs/tasks/README.md \
        docs/tasks/archive/wc-c0-register.md \
        docs/tasks/archive/wc-c1-git-yarn.md \
        docs/tasks/archive/wc-c2-deploy.md \
        docs/tasks/archive/wc-c3-security-env.md \
        docs/tasks/archive/wc-c4-wire-close.md \
        docs/tasks/archive/opencode-operator-skills-wave2-2026-06-26.md

echo "==> Guard: refuse unrelated paths"
if git diff --cached --name-only | grep -E 'apps/(cabinet|demos)|\.github/workflows|device-scenario.*\.json'; then
  echo "ERROR: unexpected paths staged — aborting." >&2
  exit 1
fi

echo "==> Staged summary:"
git diff --cached --stat | tail -n 25
echo "    total staged: $(git diff --cached --name-only | wc -l) files"

git commit -m "feat(opencode): operator skills wave 2 (git-pr, deploy, yarn, security, env)" -m "\
- 5 Tier-1 operator skills via team consilium (2026-06-26)
- membrana-git-pr, membrana-yarn-workspace (playbooks)
- membrana-deploy-operator (wraps existing prod scripts, dangling=0)
- membrana-security-review (seeded downloadable + Membrana adapter)
- membrana-env-secrets-guard (.env, proxy, keys, secrets hygiene)
- AGENTS.md operator skills wave-2 section; registry wc-c0..c4 (archived)
- Tier 2 deferred: linear-sync, design-review, edge-capture, .cursor/.claude mirror"

echo "==> Done. Review with: git show --stat HEAD"
