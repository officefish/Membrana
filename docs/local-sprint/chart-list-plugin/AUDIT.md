# Audit — chart-list-plugin, phase 1

| Field | Value |
|---|---|
| task | `chart-list-plugin` |
| source tree | fresh worktree from `origin/main` |
| audited HEAD | `2e59a5c33b56df29e11d72db790029625e5ce32d` |
| branch | `codex/chart-list-plugin-phase1` |
| date | 2026-10-03 |
| verdict | implementation DoD is covered; live owner acceptance and closure are still missing |

## Summary

| Scope | done | partial | missing |
|---|---:|---:|---:|
| Definition of Done items | 9 | 0 | 0 |
| Field/closure items | 0 | 0 | 2 |
| Total | 9 | 0 | 2 |

The cabinet journal twin is present on `origin/main`. Studio also has a chart-list surface for
sample-library collections, but it is a separate showcase over media-library collections, not a
replacement for the cabinet journal plugin.

The remaining gap is documentary/field acceptance: `docs/field/chart-list-acceptance-2026-08-22.md`
still says `НЕ ПРОВЕДЕНА`, `docs/local-sprint/chart-list-plugin/CLOSURE.md` does not exist, and
`yarn task:inspect chart-list-plugin` reports the card as active.

## Discovery Commands

| Command | Relevant output |
|---|---|
| `yarn tooling:overview` | tooling inventory ran successfully; package scripts are live, not copied by hand |
| `yarn scripts:registry --report` | `summary: files=1280 yarn→scripts=423 orphans=940 broken=7` |
| `yarn task:inspect chart-list-plugin` | `chart-list-plugin [active] · vesnin — Плагин журнала «чарт лист»: отбор звуков поверх почвы` |
| `git log --oneline -- apps/cabinet/src/plugins/chart-list apps/cabinet/src/pages/JournalPage.tsx apps/cabinet/src/api/journal.ts` | `3c25eb06 ... (#2074)`, `a04e0526 ... (#2093)`, `9a8bc1e8 ... (#2103)`, `9d8e9a57 ... (#2213)` |
| `git log --oneline -- apps/client/src/plugins/sample-library-chart-list apps/client/src/modules/SampleLibraryModule.tsx packages/plugin-handlers/src/chart-list*` | Studio/sample-library line includes `01dd2b02 (#2184)`, `7c40e656 (#2190)`, `93b7e42c (#2255)`, `794930f6 (#2505)` |

## DoD Table

| Item | Status | Evidence in `origin/main` | Notes |
|---|---|---|---|
| Plugin registered in journal home; manifest validates; foreign home rejected | done | `packages/plugin-handlers/src/chart-list/manifest.ts:25` declares `membrana.showcase.chart-list`; `packages/background-cabinet/src/modules/journal/selection/chart-list.registrar.ts:17` registers it; `packages/background-cabinet/src/modules/journal/plugin-host/journal-plugin-host.service.test.ts` passed | PR line: #2074/#2093. |
| Two settings in the right sidebar: volume 200/100/60/20 and three criteria | done | `apps/cabinet/src/plugins/chart-list/chartList.ts:19` volumes, `:23` criteria; `ChartListSettings.tsx:34` volume buttons, `:51` criteria radios; `chartList.test.ts:56`, `:61` | Cabinet, not Studio. |
| Generate button in widget below main block; main journal collapses | done | `apps/cabinet/src/pages/JournalPage.tsx:72` settings, `:79` widget, `:83` `onGenerate`; `:179` main block collapse | Uses existing page-plugin shell. |
| List is rendered by the journal row component; playback and waveform work through the same row | done | `apps/cabinet/src/plugins/chart-list/ChartListWidget.tsx:29` imports `CabinetLiveJournalItemRow`; rows at `:92` and `:174`; comment at `:7` names same playback/waveform | This is the cabinet journal twin. |
| Row metadata: delta over floor, structure, peak; no node or duplicate journal metadata | done | `ChartListWidget.tsx:87` structure, `:89` peak, `:168` structure, `:170` peak; `packages/plugin-handlers/src/chart-list/selection.test.ts:228` requires structure/peak, `:234` rejects `nodeId`, `durationSec`, `sampleRate`, `captureMode` | Matches prompt exclusions. |
| Pagination for long lists | done | `apps/cabinet/src/plugins/chart-list/chartList.ts:129` page size, `:175` page count, `:181` set page; `ChartListWidget.tsx:197` `LiveJournalPager`; `chartList.test.ts:114` expects 60 rows -> 3 pages | Cabinet page uses same pager family as journal. |
| Selection survives leaving page and opens by address; account-scoped | done | `apps/cabinet/src/api/journal.ts:228` list, `:236` open; `packages/background-cabinet/src/modules/journal/selection/selection.controller.ts:78` list recent, `:89` open by id; `selection.service.ts:76` stores `runId`/`inputHash`, `:115` list by membrane; tests `selection.service.test.ts:118` and `chain-rehearsal.test.ts:118` | `measure.adapter.ts:54` scopes by membrane/user. |
| Run passport is written; run address/input hash answer is named in module interface | done | `packages/background-cabinet/src/modules/journal/plugin-host/MODULE_INTERFACE.md:98` closes run-address/inputHash gaps; `journal-run-address.ts:69` and `:89`; `packages/background-media/src/modules/collections/first-wave.registrar.ts:174` builds `RunRecord` for bridge, `:259` registers `chart-list-measure`, `:264` input hash; `first-wave.registrar.test.ts` passed | Cabinet selection intentionally has no `passport`: `selection.service.test.ts:128`. Passport lives in plugin-results/office, per task layer split. |
| Teeth: three criteria, invalid task refusal, persistence | done | `packages/plugin-handlers/src/chart-list/selection.test.ts`, `executor.test.ts`; `packages/background-cabinet/src/modules/journal/plugin-host/journal-plugin-host.service.test.ts` refusal cases; `selection.service.test.ts` and `chain-rehearsal.test.ts` persistence/open-by-address | Current focused suites are green after cold-worktree build prep. |

## Cabinet vs Studio

| Surface | What exists | Evidence |
|---|---|---|
| Cabinet journal | Full journal-page plugin: right sidebar settings, widget, same journal row, storage/open-by-address, backend orchestration through media measure plugin | `apps/cabinet/src/pages/JournalPage.tsx:16`, `:57`, `:72`, `:79`; `apps/cabinet/src/plugins/chart-list/*`; `packages/background-cabinet/src/modules/journal/selection/*` |
| Studio sample library | Separate sample-library collection showcase, not the cabinet journal plugin | `apps/client/src/plugins/sample-library-chart-list/SampleLibraryChartListPanel.tsx:4`, `:98`, `:263`; `apps/client/src/modules/SampleLibraryModule.tsx:927`; `apps/client/src/modules/registerClientModules.ts:199` |
| Cabinet sample-library twin | Same media-library chart-list panel family exists in cabinet sample-library, also not the journal plugin | `apps/cabinet/src/components/sample-library/CabinetSampleChartListPanel.tsx:8`, `:101`, `:280`; `apps/cabinet/src/components/sample-library/chart-list-panel.test.ts:34` |

## Checks

| Command | Result |
|---|---|
| `npm exec --yes corepack@0.36.0 -- yarn install` | pass; known optional native warning for `cpu-features` |
| `npm exec --yes corepack@0.36.0 -- yarn workspace @membrana/cabinet test` | pass: 28 files, 252 tests |
| `npm exec --yes corepack@0.36.0 -- yarn workspace @membrana/plugin-handlers test` | pass after building local deps: 15 files, 159 tests |
| `npm exec --yes corepack@0.36.0 -- yarn workspace @membrana/background-cabinet test` | pass after `prisma:generate` and local deps build: 55 files, 543 tests, 1 skipped dist smoke |
| `npm exec --yes corepack@0.36.0 -- yarn workspace @membrana/media-library-service test` | pass: 14 files, 181 tests |
| `npm exec --yes corepack@0.36.0 -- yarn workspace @membrana/background-media test -- src/modules/collections/first-wave.registrar.test.ts` | pass after `prisma:generate` and local deps build; command ran the package suite: 50 files, 443 tests, 1 skipped dist smoke |

## Remaining Work

| Residual | Status | Evidence | Recommendation |
|---|---|---|---|
| Live owner acceptance in cabinet | missing | `docs/field/chart-list-acceptance-2026-08-22.md:8` says `НЕ ПРОВЕДЕНА` | Run a short acceptance block in cabinet, record screenshots/observations and final owner verdict. |
| Closure/archive decision | missing | no `docs/local-sprint/chart-list-plugin/CLOSURE.md`; `yarn task:inspect chart-list-plugin` says active | If owner accepts, archive with evidence. If acceptance finds metric defects, keep this card open only for acceptance outcome and split metric work separately. |

## Owner Forks

1. If the live cabinet acceptance passes: archive `chart-list-plugin` with notes pointing to this audit, acceptance protocol, and green test suites.
2. If the live cabinet acceptance finds ranking/metric defects: do not rewrite the already-built plugin silently; record the finding and cut a separate metric-tuning task.
3. If owner wants to avoid live production mutation: run the acceptance on an owner-approved cabinet environment and record that limitation in `CLOSURE.md`.
