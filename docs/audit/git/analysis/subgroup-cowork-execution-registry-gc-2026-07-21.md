# Subgroup GC — cowork-execution-registry leftover — 2026-07-21

Owner-approved discard («Ок дискард») after
[`subgroup-cowork-execution-registry-2026-07-21.md`](./subgroup-cowork-execution-registry-2026-07-21.md)
(verdict **discard** ×3). Branch: `chore/git-gc-cat5`.

Sprint already on main via squash [#675](https://github.com/officefish/Membrana/pull/675);
Issue [#660](https://github.com/officefish/Membrana/issues/660) CLOSED.

## Pre-delete safety

| Check | Result |
| --- | --- |
| `git worktree list` | none of the three targets checked out |
| Current HEAD | `chore/git-gc-cat5` (not a target) |
| Open PR `--head` | none (from attention report) |

## Deleted (tip SHA before delete)

| Branch | Tip (before) | Local `-D` | Remote `--delete` |
| --- | --- | --- | --- |
| `cowork/cowork-execution-registry/lead-persona` | `740f2bdd` | deleted | deleted |
| `cowork/cowork-execution-registry/snapshot-cold-migration` | `000e1bd9` | deleted | deleted |
| `cowork/cowork-execution-registry/units-trace-measure` | `7fff51ec` | deleted | deleted |

## Post

`git fetch --prune` — all six refs (3 local + 3 `origin/…`) **GONE**.

## Final counts

- Local deleted: **3**
- Remote deleted: **3**
- Failed: **0**
