#!/usr/bin/env bash
#
# Scoped commit for day-sprint docs-actions-phase-a-2026-06-26 (Issue #182).
#
# Why this script exists: the working tree contains unrelated uncommitted work
# (apps/cabinet, .github/workflows, datasets, daily archives, ...). This stages
# ONLY the phase-A sprint changes:
#   - explicit sprint artifacts (by path)
#   - "pure link-rewrite" files: diffs that ONLY rewrite
#     device-board-scripts/<MD>.md -> actions/device-board/... links
# Files with any other content change are left unstaged.
#
# Run from repo root on your machine (where git works normally):
#   bash docs/day-sprint/docs-actions-phase-a-2026-06-26/commit-sprint.sh
# Review `git diff --cached`, then it commits. Push is left to you.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

git config core.fileMode false

ROOTS=(docs scripts packages apps .cursor .claude AGENTS.md .cursorrules)

echo "==> Classifying modified files (pure link-rewrite vs mixed)…"
PURE=()
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    apps/demos/*) continue ;;                       # nested repo / submodule — skip
    docs/device-board-scripts/*) continue ;;        # stubs handled explicitly below
  esac
  body=$(git diff --unified=0 -- "$f" | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' || true)
  other=$(printf '%s\n' "$body" | grep -vE 'device-board-scripts|actions/device-board' | grep -vE '^[+-][[:space:]]*$' || true)
  if [ -z "$other" ]; then PURE+=("$f"); fi
done < <(git diff --name-only -- "${ROOTS[@]}")

echo "    pure link-rewrite files: ${#PURE[@]}"
[ "${#PURE[@]}" -gt 0 ] && printf '%s\n' "${PURE[@]}" | git add --pathspec-from-file=- 2>/dev/null || \
  { for f in "${PURE[@]}"; do git add -- "$f"; done; }

echo "==> Staging explicit sprint artifacts…"
# Moved processes, new actions hub, sprint tracker, archived team reviews
git add docs/actions \
        docs/day-sprint/docs-actions-phase-a-2026-06-26 \
        docs/archive/device-board-reviews

# Redirect-stubs + fixtures-hub README (MD only — never the JSON fixtures)
git add docs/device-board-scripts/*.md

# Phase archive cards (this sprint only)
git add docs/tasks/archive/da-a0-taxonomy-adr.md \
        docs/tasks/archive/da-a1-scaffold-mv.md \
        docs/tasks/archive/da-a2-link-audit.md \
        docs/tasks/archive/da-a3-steering-sync.md \
        docs/tasks/archive/da-a4-verify-ci.md \
        docs/tasks/archive/da-a5-rag-index.md \
        docs/tasks/archive/da-a6-closure.md \
        docs/tasks/archive/docs-actions-phase-a-2026-06-26.md

# Registry + indexes + migration script
git add docs/tasks/registry.json docs/tasks/README.md docs/prompts/README.md \
        scripts/migrate-docs-actions-phase-a.mjs

echo "==> Guard: refuse to stage JSON fixtures or unrelated paths"
if git diff --cached --name-only | grep -E 'device-scenario.*\.json|device-board-scripts/.*/|apps/demos|apps/cabinet'; then
  echo "ERROR: unexpected paths staged — aborting." >&2
  exit 1
fi

echo "==> Staged summary:"
git diff --cached --stat | tail -n 20
echo "    total staged: $(git diff --cached --name-only | wc -l) files"

echo "==> Sanity: verify-paths must stay green"
node scripts/usercase.mjs verify-paths

git commit -m "docs(actions): phase A — extract device-board MD processes to docs/actions (#182)" -m "\
- git mv 13 MD processes -> docs/actions/device-board/** (smoke, cookbooks, sign-offs, specs)
- redirect-stubs on old docs/device-board-scripts/*.md (remove no earlier than 2026-07-26)
- link audit: device-board-scripts/<MD>.md -> actions/device-board across docs, scripts, skills
- team reviews -> docs/archive/device-board-reviews/
- steering sync: .cursorrules #11, AGENTS.md, skills mirror, VIRTUAL_TEAM_PROMPT, prompts/README
- registry + phase archive cards da-a0..da-a6; CLOSURE.md + Teamlead LGTM
- A5 RAG incremental index deferred to local post-merge run (D-ACT-7)

Closes #182"

echo "==> Done. Review with: git show --stat HEAD"
echo "    Post-merge (local): yarn rag:index:incremental && yarn rag:query \"USERCASE_GENERATION_REGULATION\""
