# Phase 1: persona roster declarations in scripts

Base: `origin/main` at `00257180ebd3b088a4626261cc2ed8deb476886c`.
Worktree: `codex/personas-source-phase1`.
GitHub Issue: #2542.
Date: 2026-10-01.

## Discovery order

1. `node scripts/tooling-overview.mjs` (fallback for `yarn tooling:overview`: this shell has no global Yarn/Corepack).
2. `node scripts/scripts-registry.mjs --report`.
3. `node scripts/scripts-sets-of.mjs scripts`.
4. `codebase-memory-mcp` fast index + `search_code`; the standard index excludes `scripts/`, so the symbol search returned no script results.
5. Text search with `rg` across `scripts/` and nearby docs.

## Declaration table

| File:line | Form | Composition | Readers | Finding |
|---|---|---|---|---|
| `docs/virtual-team/voices.registry.json:5` | JSON registry, `voices[]` | `tarasov`, `vesnin`, `ozhegov`, `dynin`, `kuryokhin`, `rodchenko`, `angelina`, `farrell` | `scripts/lib/execution-trace/personas.mjs`, `scripts/verify-voices.mjs`, `scripts/voices-registry.test.mjs`, `scripts/persona-memory-roster.test.mjs`, `scripts/sprint-cut-check.mjs` | Looks like the closest existing source of truth for all declared voices. |
| `scripts/ask-persona.mjs:60` | Manual object `const PERSONAS = { ... }` with role, prompt file, description | 7: all voices except `farrell` | CLI help, validation, prompt file lookup, role display; checked indirectly by `verify:voices` and `voices-registry.test.mjs` | Legal semantic filter: callable by `ask`. Risk: role/prompt metadata duplicated from registry; `farrell` absent legally because callable is `storm`, not `ask`. |
| `scripts/consilium.mjs:78` | Manual object `PERSONA_FILES` keyed by consilium role, not persona id | 6 role keys/prompts: `teamlead`, `architect`, `structurer`, `mathematician`, `musician`, `layout` | Consilium prompt assembly; `verify-voices.mjs` checks prompt file presence for callable `consilium` | Legal semantic filter: six room advisers. Risk: role keys hide the actual persona id and rely on a separate map. |
| `scripts/lib/consilium-paths.mjs:7` | Manual array `CONSILIUM_ROLES` of role keys/labels/tags | 6 roles: Teamlead, Architect, Structurer, Mathematician, Musician, Layout | `scripts/consilium.mjs` role order and protocol labels | Legal semantic list of roles, not all voices. Should stay as named role roster. |
| `scripts/lib/persona-memory.mjs:37` | Manual object `PERSONA_ROLE_LABELS` | 8: all registry voices | `readPersonaMemory`, `persona-memory-extract`, `code-review`, `ask-persona`, tests | Legal derived data: protocol labels. Already has a tooth against drift with `voices.registry.json`; could be derived or explicitly checked from the canonical source. |
| `scripts/lib/persona-memory.mjs:49` | Manual object `CONSILIUM_ROLE_KEY_TO_SLUG` | 5 slug mappings: `teamlead -> vesnin`, `structurer -> ozhegov`, `mathematician -> dynin`, `musician -> kuryokhin`, `layout -> rodchenko`; no `architect` key | `scripts/consilium.mjs`, `scripts/_daily-standup.mjs`, `scripts/lib/standup-routing.mjs` | Real drift: Teamlead is `tarasov` in the registry and prompt, but this map still sends Teamlead memory to `vesnin`; `architect` role has no memory slug. |
| `scripts/lib/review-lead.mjs:42` | Manual frozen array `PERSONAS` | 6: `vesnin`, `ozhegov`, `dynin`, `kuryokhin`, `rodchenko`, `tarasov` | `resolveReviewLead`; `code-review.mjs`; `code-review-ritual.test.mjs` | Legal semantic filter: review leads / code owners. Do not merge with all voices; `angelina` and `farrell` are intentionally excluded. Should be derived as `REVIEW_LEAD_PERSONAS` or a named filter. |
| `scripts/lib/day-memo-persona-trace.mjs:23` | Manual frozen array `PERSONAS` | 8: all registry voices | `buildPersonaTraceLayer`; `day-memo.mjs`; `day-memo-persona-trace.test.mjs` | Real duplicate of all voices; should derive from the registry/source. |
| `scripts/lib/execution-trace/personas.mjs:17,23` | File-backed loader `loadKnownPersonas()` | Loads all ids from `docs/virtual-team/voices.registry.json` | `execution-gate.mjs`, `sprint-experience.mjs`, tests | Good pattern: already uses the registry as source. |
| `scripts/lib/procedure-personas.mjs:28` | Manual frozen array `HOLDER_PERSONAS` | 6 code holders: `vesnin`, `ozhegov`, `dynin`, `kuryokhin`, `rodchenko`, `tarasov` | `validate-procedure`, `one-shot-run`, tests | Legal ADR-0025 semantic filter: code holders. Do not collapse into all voices. |
| `scripts/lib/procedure-personas.mjs:43` | Derived frozen array `MODERATOR_PERSONAS = [...HOLDER_PERSONAS, 'angelina']` | 7: holders + `angelina` | `validate-procedure`, tests | Legal derived filter. Existing tooth explicitly forbids hand-copying this list. |
| `scripts/lib/validate-procedure.mjs:149` | Alias `PROCEDURE_PERSONAS = MODERATOR_PERSONAS` | 7, same as moderator roster | `validate-procedure` home holder compatibility | Backward-compatible alias, documented as deprecated. Not a separate source. |
| `scripts/lib/angelina-cascade.mjs:26` | Manual `Set` `AUTHOR_ROLES` | 8 voices + `human` | Provenance validation for ritual cascade | Real duplicate of registry plus a legal extra. Should derive `AUTHOR_ROLES = voices + human`. |
| `scripts/lib/sprint-cut/test-support/live-fixtures.mjs:22` | Test fixture array `FIXTURE_PERSONAS` | 7: `vesnin`, `dynin`, `ozhegov`, `tarasov`, `rodchenko`, `kuryokhin`, `angelina`; no `farrell` | Sprint-cut fixture helper | Test fixture, not production source. Acceptable if named as fixture; should not drive runtime truth. |
| `scripts/lib/repo-branches-decompose.mjs:12` | Branch hygiene set `PERSONA_BRANCHES` | 4 branch names: `ozhegov`, `dynin`, `vesnin`, `boyarskiy` | Branch hygiene classifier | Not team composition; branch-protection category only. Do not merge. |
| `docs/procedures/layer-rules.json:20` | Procedure branch grammar `personas[]` | 7: `vesnin`, `ozhegov`, `dynin`, `kuryokhin`, `rodchenko`, `angelina`, `boyarskiy` | Branch grammar rules | Not scripts runtime roster; branch grammar. Out of scope except for future consistency work. |

## Drift summary

- `CONSILIUM_ROLE_KEY_TO_SLUG.teamlead` is stale: it maps Teamlead memory to `vesnin`, while `voices.registry.json` and `PROMPT_TEAMLEAD.md` say Teamlead is `tarasov`.
- `CONSILIUM_ROLE_KEY_TO_SLUG` has no `architect` mapping, so the Architect role can lose memory injection in consilium.
- All-voice rosters are duplicated in `day-memo-persona-trace.mjs` and `angelina-cascade.mjs`; both should derive from the registry/source.
- `ask-persona.mjs` duplicates callable ask metadata; its 7-person shape is legal, but the metadata should be derived or checked against the source.
- `review-lead.mjs` and `procedure-personas.mjs` are legal filters. They should not be blindly merged into the all-voice roster.

## Proposal

Use one roster source for declared voices, with named derivations:

- Canonical full roster: `docs/virtual-team/voices.registry.json` or a thin `scripts/lib/personas.mjs` loader around it.
- Named filters: `ASK_PERSONAS`, `CONSILIUM_PERSONAS`, `REVIEW_LEAD_PERSONAS`, `HOLDER_PERSONAS`, `MODERATOR_PERSONAS`, `AUTHOR_PERSONAS`.
- Derivatives must carry the reason for exclusion (`farrell` is storm-only; `angelina` moderates but does not hold code; review leads are code-owning reviewers).
- Add a tooth that fails when a new manual list of known persona ids appears outside the canonical module, legal filters, or fixtures.

## Owner forks

- Source format: keep `docs/virtual-team/voices.registry.json` as the source, or mint `scripts/lib/personas.mjs` as the source and generate/check the registry from it.
- Metadata: add role labels/callable filters to the source, or keep them as named derivations checked against the source.
- Scope of phase 2: fix only runtime drift and source derivation, or also tighten `verify-voices` so `consilium` validates persona id mapping, not only prompt file presence.
