# Membrana Local Sprint CLOSURE: trace-freeze-dual-candidate-sprint

| Field | Result |
|-------|--------|
| Issues | #2476, #2485; #2505 used as independent render evidence |
| Cut | Five blocks; owner ratified v1 at 15:15, `register-ipc.ts` re-cut at 15:37, and mandatory `tests-master` pin at 15:59 |
| Live Studio | Missing sync reply reproduced; after fix, full 10 000-line flush is 20.5-34.2 ms |
| Library render | Old branch: full list; mainline #2505: 23 265 -> 891 DOM nodes with 40-row page |
| Probe truth | Portable source tooth 7/7; real-module behavioral tooth 5/5 |
| Script tests | `tasks` group: 744/744; `tests-master` pin audit: 0 findings |
| Architecture | R2 not started; it still requires consilium |
| Gate | 5/5 `honest_pair`, findings 0; procedure journal closed `pass` |
| Experience | `cut-1` and final `cut-2`, both outcome `hit` |
| Delivery | Pending non-merged PR, PR review and published review-gate |

## Verdict

The original 2.1-3.6 ms result excludes only renderer-side buffer teardown. It does not exclude
the whole stop path. Live Studio proved that the synchronous IPC contract had no reply: main
wrote the trace while renderer remained blocked in `sendSync`. An explicit empty reply after the
write removes the unbounded wait without weakening beforeunload durability.

After that correction, a 1 418 889-character trace blocks renderer for 20.5-34.2 ms. This is a
visible one-to-two-frame hitch, not the previous indefinite wait. Full-library rendering was a
second, independent source of synchronous work in old builds and has already been paginated by
#2505 on mainline.

## Boundaries Kept

- No `yarn install` was run in this worktree.
- R2 and evidence-sink redesign were not started.
- `ServerStorageBackend.listSamples` pagination/loading was not redesigned.
- The PR must remain unmerged.
