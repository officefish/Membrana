# Competition Sprint ACTIVE

| Поле | Значение |
|------|----------|
| **status** | `open` |
| **sprintId** | `comp-mvp-packaging-2026-06-21` |
| **brief** | [`docs/competition-sprint/comp-mvp-packaging-2026-06-21/COMPETITION_SPRINT_BRIEF.md`](./competition-sprint/comp-mvp-packaging-2026-06-21/COMPETITION_SPRINT_BRIEF.md) |
| **baseBranch** | `main` |
| **baseSha** | `b73fd4f9fcb6b848bd0ebb348c405e4b2bf602ad` |
| **phase** | **3** (Consilium — compare & demo) |
| **openedAt** | 2026-06-21 |
| **teams** | alpha (Vesnin+Музыкант), beta (Ozhegov+Dynin), gamma (Rodchenko) |

## Branches

| Team | Branch | UserCase id |
|------|--------|-------------|
| Alpha | `comp/comp-mvp-packaging-2026-06-21/alpha` | `usercase-mvp-microphone-alpha` |
| Beta | `comp/comp-mvp-packaging-2026-06-21/beta` | `usercase-mvp-microphone-beta` |
| Gamma | `comp/comp-mvp-packaging-2026-06-21/gamma` | `usercase-mvp-microphone-gamma` |

## Phase gate

- [x] Brief LGTM
- [x] Phase 1: три `CONCEPT.md` pushed
- [x] Phase 2α: vertical slice + verify-layout
- [x] Phase 2β: full DoD — 3 UserCase ids, ≥2 functions, catalog community, CI green
- [ ] Phase 3: consilium protocol complete
- [ ] Phase 4: SCORECARD + WINNER.md
- [ ] Phase 5: merge winner

## Artifacts

| Artifact | Path |
|----------|------|
| Consilium | [`docs/discussions/competition-sprint-comp-mvp-packaging-2026-06-21-consilium.md`](./discussions/competition-sprint-comp-mvp-packaging-2026-06-21-consilium.md) |
| Scorecard | [`docs/competition-sprint/comp-mvp-packaging-2026-06-21/SCORECARD.md`](./competition-sprint/comp-mvp-packaging-2026-06-21/SCORECARD.md) |

## Build & verify

```bash
yarn usercase:build usercase-mvp-microphone-alpha
yarn usercase:build usercase-mvp-microphone-beta
yarn usercase:build usercase-mvp-microphone-gamma
yarn workspace @membrana/device-board test
```
