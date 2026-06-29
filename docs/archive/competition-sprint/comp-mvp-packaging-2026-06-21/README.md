# Archive: competition UserCases v1 (`comp-mvp-packaging-2026-06-21`)

**Archived:** 2026-06-25 (prep sprint `competition-async-v2-prep-2026-06-25`)

## Что здесь

| id | Team | Статус |
|----|------|--------|
| `usercase-mvp-microphone-alpha` | Alpha — Live Observation Pipeline | archived |
| `usercase-mvp-microphone-beta` | Beta — Measured modular | archived |
| `usercase-mvp-microphone-gamma` | Gamma — Poster UserCase | archived |

**Источники (repo):**

- `docs/device-board-scripts/usercase-mvp-microphone-{alpha,beta,gamma}/`
- `packages/device-board/src/graph/default-usercase-mvp-microphone-{alpha,beta,gamma}.generated.ts`
- Синтез замыслов: [`COMPETITION_V1_DESIGN_SYNTHESIS.md`](../../competition-sprint/comp-mvp-packaging-2026-06-21/COMPETITION_V1_DESIGN_SYNTHESIS.md)

## Catalog

С 2026-06-25 forks **не** в picker (`BUNDLED_USER_CASE_ENTRIES`). Loader сохранён в `archived-competition-user-case-entries.ts` для rebuild/CI.

## Rebuild (если нужно)

```bash
yarn usercase:build-mvp-microphone
yarn usercase:build-competition-all
node scripts/usercase.mjs verify-competition
```

## Следующий шаг

Новое соревнование: `comp-mvp-async-v2-2026-06-25` — brief в `docs/competition-sprint/comp-mvp-async-v2-2026-06-25/`.
