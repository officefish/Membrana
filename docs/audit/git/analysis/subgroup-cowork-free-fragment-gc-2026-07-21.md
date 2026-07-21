# Subgroup GC — cowork-free-fragment-usercases leftover — 2026-07-21

Owner-approved discard («ок дискард») after
[`subgroup-cowork-free-fragment-2026-07-21.md`](./subgroup-cowork-free-fragment-2026-07-21.md)
(verdict **discard** ×3). Branch: `chore/git-gc-free-fragment`.

Sprint already on main via squash [#489](https://github.com/officefish/Membrana/pull/489);
follow-up [#490](https://github.com/officefish/Membrana/pull/490) MERGED;
Issue [#487](https://github.com/officefish/Membrana/issues/487) CLOSED.
Origin twins already gone before this GC.

## Pre-delete safety

| Check | Result |
| --- | --- |
| `git worktree list` | none of the three targets checked out |
| Current HEAD | `chore/git-gc-free-fragment` (not a target) |
| Open PR `--head` | none (from attention report) |

## Deleted (tip SHA before delete)

| Branch | Tip (before) | Local `-D` | Remote `--delete` |
| --- | --- | --- | --- |
| `cowork/cowork-free-fragment-usercases/neuro-detection` | `e2c482db` | deleted | n/a (already gone) |
| `cowork/cowork-free-fragment-usercases/sample-recording` | `6cec99e9` | deleted | n/a (already gone) |
| `cowork/cowork-free-fragment-usercases/spectrum-live` | `c0fdabc5` | deleted | n/a (already gone) |

## Post

`git ls-remote --heads origin 'cowork/cowork-free-fragment-usercases/*'` — empty.
Local refs for the three block-heads — **GONE**.

## Final counts

- Local deleted: **3**
- Remote deleted: **0** (twins already absent)
- Failed: **0**
