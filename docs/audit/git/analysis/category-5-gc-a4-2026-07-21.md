# Category 5 GC A4 — 2026-07-21

Owner-approved GC: **only A4** (6 remote behind-only `origin/comp/*`).  
A1/A2 unique-tip leftovers **not** deleted (e.g. local `comp/comp-detection-alarm-*`).  
Branch: `chore/git-gc-cat5`.

## Pre-delete safety (vs `origin/main`)

All six confirmed `ahead=0` before `git push origin --delete`.

| Branch | ahead | behind | tip (before) |
|--------|------:|-------:|--------------|
| comp/comp-mvp-packaging-2026-06-21/alpha | 0 | 906 | c2e13fe9 |
| comp/comp-mvp-packaging-2026-06-21/beta | 0 | 906 | c2e13fe9 |
| comp/comp-mvp-packaging-2026-06-21/gamma | 0 | 906 | c2e13fe9 |
| comp/comp-mvp-async-v2-2026-06-25/alpha | 0 | 782 | 914d3f06 |
| comp/comp-mvp-async-v2-2026-06-25/beta | 0 | 782 | 914d3f06 |
| comp/comp-mvp-async-v2-2026-06-25/gamma | 0 | 782 | 914d3f06 |

## Remote — `git push origin --delete`

| Ref | Result |
|-----|--------|
| origin/comp/comp-mvp-packaging-2026-06-21/alpha | deleted |
| origin/comp/comp-mvp-packaging-2026-06-21/beta | deleted |
| origin/comp/comp-mvp-packaging-2026-06-21/gamma | deleted |
| origin/comp/comp-mvp-async-v2-2026-06-25/alpha | deleted |
| origin/comp/comp-mvp-async-v2-2026-06-25/beta | deleted |
| origin/comp/comp-mvp-async-v2-2026-06-25/gamma | deleted |

Post: `git fetch --prune` — all six `origin/…` refs **GONE**.

## Untouched (by design)

- Local unique-tip `comp/*` (A1/A2), including `comp/comp-detection-alarm-2026-07-10/alpha` and `…/gamma`
- Personas / main / base/* / open-PR heads

## Final counts

- Remote deleted: **6**
- Remote failed: **0**
- Local deleted: **0**
