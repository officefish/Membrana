# Retrospective — comp-mvp-async-v2-2026-06-25

## Что сработало

- **v1 synthesis** → три независимых CONCEPT с наследием codenames
- **`packMvpUserCaseForTeamAsyncV2`** — дифференциация без смены runtime
- **`verify-competition-async-v2`** — CI gate (layout + prerun)
- **C7 Async clarity** — отдельный критерий для packaging sprint
- **Beta 3-node upload pipeline** — исправление dangling edge (2-node collapse)

## Что улучшить

- **F7 operator smoke** — deferred; нужен один live run на winner
- **Embedded export names** — `usercase-embedded-write.mjs` путал `-async-v2` с v1 (fixed)
- **Margin +1.0** — Alpha C7 почти перехватил победу

## Lessons

1. Async packaging sprint = C7 weight matters (1.5)
2. Winner polish = comment copy cherry-pick, не merge runtime
3. Архивировать forks в `ARCHIVED_COMPETITION_ASYNC_V2_*` как v1

## Team shout-outs

- **Alpha:** StartAsyncJob on main + Act IIb — лучший live C7
- **Beta:** `fn-beta-async-upload-pipeline` — winner + catalog template
- **Gamma:** poster ①–⑥ — cherry-pick ⑤⑥ titles

*Closed 2026-06-25 — см. [`CLOSURE.md`](./CLOSURE.md)*
