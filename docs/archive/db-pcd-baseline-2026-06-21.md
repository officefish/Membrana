# NB0 baseline — device-board-post-comp-debt-night-build

> **Дата:** 2026-06-21T19:43Z  
> **Ветка:** `night/device-board-post-comp-debt-night-build-2026-06-21`  
> **Фаза:** NB0 merge gate

## Scoped CI

| Check | Result |
|-------|--------|
| `@membrana/device-board#lint` | ✅ 0 errors, 0 warnings |
| `@membrana/device-board#typecheck` | ✅ pass |
| `@membrana/device-board#test` | ✅ 81 files, 399 tests |
| `node scripts/usercase.mjs verify-competition` | ✅ alpha, beta, gamma |

## NB0 fixes

- `device-board-shell.tsx`: `scenarioCanvas` wrapped in `useMemo([scenarioBranch, graph])` — сняты 5× `react-hooks/exhaustive-deps` warnings.

## Untracked scope (tracked in NB0 commit)

Runtime: `exec-successor.ts`, `function-call-resolve.ts` (+ tests)  
Scripts: `usercase.mjs`, `build-usercase-competition-all.mjs`, `verify-usercase-prerun.mjs`  
Docs: competition closure, USERCASE regulation, night epic prompt, consilium  
CI: `.github/workflows/usercase-competition.yml`

## Next

NB1 — runtime DRY audit (`function-pin-ops` vs `function-call-resolve` vs `exec-successor`).
