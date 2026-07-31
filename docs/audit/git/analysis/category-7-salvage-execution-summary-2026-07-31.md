# Category 7 Salvage — execution summary 2026-07-31

## Scope

- Frozen base: `665a605fe612858245c7f774ed07a60fa1367881`.
- Verdict ledger: [category-7-salvage-verdicts-2026-07-31.md](category-7-salvage-verdicts-2026-07-31.md).
- Audit publication: [PR #1547](https://github.com/officefish/Membrana/pull/1547),
  merge commit `2bc4475d`.
- Owner exclusions remained untouched:
  `ritual/day-2026-07-30`, `ritual/evening-2026-07-29`.
- No worktree was removed.

## Execution

| Gate / action | Result |
| --- | --- |
| First owner ratification | 177 ledger branches: 170 refs deleted, 7 already absent |
| Exact remote-twin audit | 11 twins matched the ratified ledger SHA; 2 twins had moved |
| Second owner ratification | 11 exact remote twins deleted |
| Total mutating ref deletions | **181** |
| ADR-0020 post-check | after every deletion, all 15 live worktrees |
| Live-tree checks | **2715** (`181 × 15`) |
| New tracked deletions | **0** |
| Worktree removals | **0** |

Machine evidence:

- [category-7-salvage-execution-2026-07-31.md](category-7-salvage-execution-2026-07-31.md)
  — the 177-row ledger execution.
- [category-7-salvage-twins-execution-2026-07-31.md](category-7-salvage-twins-execution-2026-07-31.md)
  — 11 exact remote twins and 2 preserved moved twins.
- [BRANCHES_LIST-2026-07-31-post-salvage.md](../registry/BRANCHES_LIST-2026-07-31-post-salvage.md)
  — final inventory after both gates.
- [BRANCHES_DECOMPOSE_LIST-2026-07-31-post-salvage.md](../registry/BRANCHES_DECOMPOSE_LIST-2026-07-31-post-salvage.md)
  — final seven-category decomposition.

## Controlled Stop

The first execute attempt deleted `refs/heads/feat/truth-graph-core` at the
ratified SHA and then stopped on a controller variable-shadowing error before
the next ref. The immediate recovery check covered all 15 live worktrees and
found zero tracked deletions. The controller was corrected, the first event was
recorded explicitly as recovered, and execution resumed from the next ref.

No subsequent step ran across a failed post-check.

## Preserved Truth

Two remote twins moved after the frozen snapshot, so the original evidence no
longer authorizes their deletion:

| Ref | Frozen ledger tip | Current tip | Verdict |
| --- | --- | --- | --- |
| `origin/feat/skill-truth-crystallization` | `95c51bf96e` | `e02e8bb07a` | keep; new audit required |
| `origin/tooling/consilium-input-manifest-2026-07-30` | `82fdaf987c` | `55f952d296` | keep; new audit required |

## Final Category 7

The final decomposition contains 14 rows:

- 4 original “needs work” branches still present:
  `fix/adr-0013-accepted`, `fix/keep-branch-cli`, `pr1410-head`,
  `chore/graphify-public-graph`.
- 1 original live branch:
  `tooling/ship-chain-frictions-3007`.
- 2 moved remote twins listed above.
- 2 owner-excluded ritual branches.
- 5 branches created after the frozen snapshot:
  `fix/protocol-body-tail-echo-2026-07-31`,
  `feat/kit-frame-boundary-2026-07-31`,
  `feat/experience-seam-2026-07-31`,
  `feat/invariant-tooth-2026-07-31`,
  `chore/register-llm-transport-card-2026-07-31`.

The frozen ledger has no unresolved verdicts. New and moved refs are not
silently inherited into the old decision.
