# Night Build log

## Open — 2026-06-14T18:06:19.233Z
- Epic: `cabinet-mp4-hardening-night-build`
- Branch: `night/cabinet-mp4-hardening-night-build-2026-06-14`


## Checkpoint NB0 — 2026-06-14T18:11:14.770Z
- Status: **pass**
- Note: client lint green; audio-engine+fft-analyzer tests pass; estree-walker resolution; dependency graph doc

## Checkpoint NB1 — 2026-06-14T18:16:38.314Z
- Status: **pass**
- Note: sample-playback-service created; client+cabinet migrated; 21/21 scoped CI

## Checkpoint NB2 — 2026-06-14T18:19:23.757Z
- Status: **pass**
- Note: useCabinetSampleLibrary hook; page 120 lines; resetCabinetMediaSession on logout

## Checkpoint NB3 — 2026-06-14T18:22:12.660Z
- Status: **pass**
- Note: LRU cache N=20, Escape dispose, OpenAPI sketch, a11y region on player

## Close — final
- Status: **done**
- Commit: `51447c6`, PR https://github.com/officefish/Membrana/pull/76
- Разработка epic завершена; merge/review отложены на утро

## Re-open — 2026-06-21T16:39:47.147Z
- Epic: `device-board-post-comp-debt-night-build`
- Continue: no


## Checkpoint NB0 — 2026-06-21T16:44:10.044Z
- Status: **pass**
- Note: lint 0w, test 399/399, verify-competition OK, commit 8c6138a

## Checkpoint NB1 — 2026-06-21T16:45:16.351Z
- Status: **pass**
- Note: DRY audit: no overlap; docs + JSDoc; test 400/400

## Checkpoint NB2 — 2026-06-21T16:46:57.257Z
- Status: **pass**
- Note: CONCEPT 4.7 mermaid + L9-L12 table; lessons cross-ref

## Checkpoint NB3 — 2026-06-21T16:50:47.925Z
- Status: **pass**
- Note: picker a11y; verify-paths 34 ok; test 401/401

## Re-open — 2026-07-01T19:00:22.523Z
- Epic: `fv1-s2-closeout`
- Continue: no


## Checkpoint NB0 — 2026-07-01T19:00:45.533Z
- Status: **pass**
- Note: baseline: test:scripts 102/102, registry валиден, дерево чистое (только NIGHT_BUILD_* артефакты)

## Checkpoint NB1 — 2026-07-01T19:01:42.960Z
- Status: **pass**
- Note: fv1-s2-content → archived (карточка от #218); registry тест 4/4

## Checkpoint NB2 — 2026-07-01T19:01:43.704Z
- Status: **pass**
- Note: epic free-v1-sound-catalog → archived, все 3 спринта done, #205 CLOSED

## Checkpoint NB3 — 2026-07-01T19:04:51.500Z
- Status: **pass**
- Note: worktree fv1-s2-publish (+ ранее fv1-s2-close) удалены; ветки codex/fv1-s2-* сохранены в git; prune чист

## Re-open — 2026-07-03T15:22:13.665Z
- Epic: `vdr-label-roundtrip-night-build`
- Continue: no


## Checkpoint NB0 — 2026-07-03T15:23:46.248Z
- Status: **pass**
- Note: 

## Checkpoint NB1 — 2026-07-03T15:27:13.506Z
- Status: **pass**
- Note: 

## Checkpoint NB3 — 2026-07-03T15:27:14.867Z
- Status: **pass**
- Note: 

## Re-open — 2026-07-06T17:32:07.724Z
- Epic: `sandbox-link-diagnostics-night`
- Continue: no


## Checkpoint NB0 — 2026-07-06T17:34:42.078Z
- Status: **pass**
- Note: probe готов: тесты 6/6, test:scripts зелёный, smoke --help ok

## Checkpoint NB1 — 2026-07-06T17:37:45.830Z
- Status: **pass**
- Note: deviceId виден: LinkedPanel полный+copy, футер shortId; client 257/257

## Checkpoint NB2 — 2026-07-06T17:50:25.707Z
- Status: **pass**
- Note: причина флапа названа по коду: кабинетная WS без keepalive + idle-таймаут; фикс 45с keepalive, cabinet 21/21

## Re-open — 2026-07-08T16:57:00.483Z
- Epic: `agent-tooling-night-build`
- Continue: no


## Checkpoint NB0 — 2026-07-08T16:59:01.825Z
- Status: **pass**
- Note: setup + test:scripts baseline green

## Checkpoint NB1 — 2026-07-08T16:59:32.682Z
- Status: **pass**
- Note: gitignore review artifact + git rm --cached

## Checkpoint NB2 — 2026-07-08T17:02:11.135Z
- Status: **pass**
- Note: pr:ship dry-run + 5 tests green

## Checkpoint NB3 — 2026-07-08T17:04:54.980Z
- Status: **pass**
- Note: build:affected 5 tests green

## Checkpoint NB4 — 2026-07-08T17:07:21.653Z
- Status: **pass**
- Note: verify:wire-sync 5 tests + real OK + pre-push

## Checkpoint NB5 — 2026-07-08T17:09:49.783Z
- Status: **pass**
- Note: scoped pre-push + commit-msg hook (dogfooded)

## Checkpoint NB6 — 2026-07-08T17:12:31.148Z
- Status: **pass**
- Note: deploy:when-green + prisma:migration, 6 tests

## Checkpoint NB7 — 2026-07-08T17:39:55.621Z
- Status: **pass**
- Note: git-day-context + tasks:archive-closed, test:scripts 157/157

## Checkpoint NB8 — 2026-07-08T17:43:08.861Z
- Status: **pass**
- Note: AGENTS tooling doc + ship/doctor skills

## Re-open — 2026-07-11T19:10:01.851Z
- Epic: `tooling-retro-2026-07-11`
- Continue: no


## Checkpoint NB1 — 2026-07-11T19:31:04.079Z
- Status: **pass**
- Note: logs:parse detection-alarm секция, 8/8 тестов

## Checkpoint NB2 — 2026-07-11T19:38:53.343Z
- Status: **pass**
- Note: net:diag: классификатор 7/7 + live-верификация tcp-data-filter на office

## Checkpoint NB3 — 2026-07-11T19:48:41.646Z
- Status: **pass**
- Note: code-review --staged + тесты, задогфужен на самом NB3

## Checkpoint NB4 — 2026-07-11T19:58:07.112Z
- Status: **pass**
- Note: close-github skip-missing, dry-run показывает пропуски, LGTM

## Checkpoint NB5 — 2026-07-11T20:07:45.664Z
- Status: **pass**
- Note: ADR скилл+шаблон+реестр, эхо-агенда в консилиум, docs:lint зелёный

## Checkpoint NB6 — 2026-07-11T20:18:11.498Z
- Status: **pass**
- Note: entry-id гард 12/12, ловит L36 до живого прогона

---

# Night Build: graphify-public-graph (2026-07-15)
> `yarn night:checkpoint` unavailable in this worktree (no node_modules / no active night build) — logged manually.

## Checkpoint NB0 — 2026-07-15 (installation)
- Status: **pass**
- Note: graphifyy 0.9.16 via `uv tool install graphifyy` (CLI graphify+graphify-mcp). Research versions v0.5.0/v8 both wrong. Real code-only path: `graphify extract <path> --code-only`. Flags --exclude-private/--scope do NOT exist; real exclude = .graphifyignore + .gitignore.

## Checkpoint NB1 — 2026-07-15 (code-only run)
- Status: **pass**
- Note: `graphify extract . --code-only` on repo root. 2067 code files, 216 docs skipped, 0 LLM (no API key). graph.json 13415 nodes/29010 edges/695 communities. graph.html REFUSED (>5000 node viz limit) → scoped packages/core run (477 nodes) produced graph.html.

## Checkpoint NB2 — 2026-07-15 (metrics)
- Status: **pass**
- Note: function-level YES (~5129 fn nodes, calls/method/indirect_call/extends/inherits). 12574 code + 841 concept(deps). Token cost 0/0. Full graph busts tool 5000 limit + consilium ~2000 readability threshold; only per-family scope renders/reads.

## Checkpoint NB3 — 2026-07-15 (leak audit)
- Status: **pass**
- Note: CLEAN of secrets/private. 0 nodes from docs/seanses/discussions/virtual-team/data/prd; 0 .env; 5 "secret" hits = symbol names not values; 0 persona/owner names. Hygiene: absolute path incl. Windows user `user190825` embedded in node ids (1672x in scoped html) — normalize before public deploy. graph.html loads vis-network from unpkg CDN (not self-contained).

## Checkpoint NB4 — 2026-07-15 (handoff)
- Status: **pass**
- Note: Recommendation = do NOT deploy now; rework if pursued (scope per family + id/username sanitize + DESIGN.md theme + vendor vis-network). HANDOFF at docs/archive/night-build/2026-07-15/HANDOFF.md. No push/PR/deploy. Blocker: none.
