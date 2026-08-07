# Night Triage 2026-08-07

**Сводка:** ghost 5 · orphan 161 · stale 169.

> Производный артефакт (sink not source): рекомендации, не действия — исполняет человек. Порог stale 14 дн. Сгенерирован 2026-08-07T23:30:00.003Z.

## Обзор (LLM-нарратив)

> _Сгенерировано LLM поверх детерминированного среза (канал: claude); таблицы ниже — источник истины._

В глаза бросается доминирование orphan-задач (161) — это основной массив технического долга, кратно превышающий stale (169 близко, но включает пересечения) и ghost (всего 5). Единственный ghost-кластер целиком завязан на issue #47 (5 задач, включая neural-tier-1b-contract, real-dataset-live-calibration, vdr-hard-gate и vdr-hg3-trends-benchmark) — это компактная точка, с которой логично начать разбор. Отдельного внимания требует связка media-library-a3-mic-recorder и media-library-a4-sample-player, залежавшихся дольше всех (по 58 дней) и явно относящихся к одному модулю. Также стоит отметить пересечение: real-dataset-live-calibration фигурирует одновременно и в ghost-кластере #47, и среди самых залежавшихся stale (54 дня) — это кандидат на приоритетный просмотр. Рекомендую человеку сперва пройтись по кластеру #47 и медиа-паре, а затем уже погружаться в широкий поток orphan.

## Ghost (5)

| id | issue | действие |
| --- | --- | --- |
| `neural-tier-1b-contract` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg3-trends-benchmark` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg4-hard-gate-report` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |

## Orphan (161)

| id | действие |
| --- | --- |
| `agent-tooling-friction-6` | relink |
| `angelina-hostess-impl` | relink |
| `angelina-orchestrator-prompt` | relink |
| `cabinet-scenario-picker-system` | relink |
| `cg2-two-tier-test-gate` | relink |
| `cg3-flaky-metrics-week` | relink |
| `cg4-ci-testing-docs` | relink |
| `ci-gate-stabilization` | relink |
| `code-review-lead-refactor` | relink |
| `comp-packaging-catalog-2026-06-25` | relink |
| `corpus-track-acceptance-predicate` | relink |
| `dads-benchmark-bridge` | relink |
| `db-doc-v04-mvp` | relink |
| `db-h1b-board-shell` | relink |
| `db-h1c-graph-serialize` | relink |
| `db-h2a-json-import` | relink |
| `db-h2b-scenario-runtime` | relink |
| `db-h2c-mic-journal` | relink |
| `db-h2d-cabinet-sync` | relink |
| `db-h3a-trigger-stop` | relink |
| `db-h3b-trigger-disconnect` | relink |
| `db-h3c-subgraph` | relink |
| `db-h4-alarm-close` | relink |
| `db-p3-a1-usercase-catalog-service` | relink |
| `db-p3-a2-runtime-validators` | relink |
| `db-p3-a3-competition-restrictions` | relink |
| `db-post-usercase-roadmap` | relink |
| `db-sf-0-canon` | relink |
| `db-sf-1-core-contracts` | relink |
| `db-sf-2-gateway-board` | relink |
| `db-sf-3-cabinet-lease-api` | relink |
| `db-sf-4-client-follower` | relink |
| `db-sf-5-board-flags-ui` | relink |
| `db-sf-6-nodes-runtime` | relink |
| `db-sf-7-last-track-preview` | relink |
| `db-sf-8-tests-smoke` | relink |
| `db-sf-9-docs-sync` | relink |
| `db3h-s2-cabinet-host` | relink |
| `db3h-s4-microphone-detectors` | relink |
| `db3h-s5-desktop-logging` | relink |
| `deploy-procedure-survey` | relink |
| `deps-watch-disappearance-named` | relink |
| `detection-alarm-loop-refactor` | relink |
| `detector-scoreboard` | relink |
| `detectors-judge-whole-record` | relink |
| `detectors-window-single-carrier` | relink |
| `device-board-hackathon-1` | relink |
| `device-board-phase-3` | relink |
| `device-board-server-first` | relink |
| `device-board-three-hosts-2026-06-26` | relink |
| `evening-chain-review-predicate` | relink |
| `frame-rails-2307` | relink |
| `fv1-s2-closeout` | relink |
| `generated-docs-quality-criteria` | relink |
| `graphify-research-tree-panel-sections` | relink |
| `grp1-route-bridge-sections` | relink |
| `grp2-grants-owner-matrix` | relink |
| `grp3-research-tree-gated` | relink |
| `grp4-graphify-gated` | relink |
| `insight-mandate-for-new` | relink |
| `insight-review-from-file` | relink |
| `leveling-snapshot-out-path` | relink |
| `live-parallel-detection-sprint` | relink |
| `lp1-mic-drone-stream-modes` | relink |
| `lp1b-drone-detailed-report-server` | relink |
| `lp2-fft-plugins-journal-sink` | relink |
| `lp3-track-import-backpressure` | relink |
| `lp4-parallel-detection-smoke` | relink |
| `lp5-journal-report-renderers` | relink |
| `media-library-a3-mic-recorder` | relink |
| `media-library-a4-sample-player` | relink |
| `meeting-evening-review-predicate` | relink |
| `meeting-format` | relink |
| `meeting-registry-relocation` | relink |
| `meeting-team-execution-contour` | relink |
| `membrana-device-build-profile` | relink |
| `membrane-node-runtime-remote` | relink |
| `mf1-format-carrier` | relink |
| `mf10-teeth-sm5` | relink |
| `mf2-branch-count` | relink |
| `mf3-commands-vs-flag` | relink |
| `mf4-teeth-sm2` | relink |
| `mf5-echo-rule` | relink |
| `mf6-auditor-worktree` | relink |
| `mf7-active-guard` | relink |
| `mf8-sprint-kind` | relink |
| `mf9-auditor-readonly` | relink |
| `mfcc-compare-sprint` | relink |
| `mfcc-lib-choice` | relink |
| `mp7b-rt0-contract` | relink |
| `mp7b-rt1-gateway` | relink |
| `mp7b-rt2-client-runtime` | relink |
| `mp7b-rt3-mode` | relink |
| `mp7b-rt4-multinode-schema` | relink |
| `mp7b-rt5-cabinet-nodes` | relink |
| `mp7b-rt6-board-ux` | relink |
| `mp7b-rt7-prod-hardening` | relink |
| `nb-vlr-0-gate` | relink |
| `nb-vlr-1-labels-export-ui` | relink |
| `nb-vlr-2-labels-merge-script` | relink |
| `nb-vlr-3-library-label-filter` | relink |
| `nb-vlr-4-docs` | relink |
| `neural-free-tier-dataset-report` | relink |
| `night-build-format-v2` | relink |
| `notes-regex-cyrillic-translit` | relink |
| `oc-proxy-s0-research-isolation` | relink |
| `oc-proxy-s1-opencode-install` | relink |
| `oc-proxy-s2-freemodel-keys` | relink |
| `oc-proxy-s3-llm-proxy-script` | relink |
| `oc-proxy-s4-opencode-config` | relink |
| `one-shot-trail-forecast-fact` | relink |
| `opencode-proxy-sprint-2026-06-25` | relink |
| `partner-tutorials` | relink |
| `pcb-d2-multinode` | relink |
| `precedent-container` | relink |
| `procedural-workshop` | relink |
| `procedure-run-journal-2026-08-01` | relink |
| `procedure-run-journal-f1-local-trail` | relink |
| `procedure-run-journal-panel-reader` | relink |
| `product-landing` | relink |
| `pt-0-tutorial-template` | relink |
| `pt-1-read-facts-sheet` | relink |
| `pt-2-first-output-v01-endtoend` | relink |
| `pt-3-honest-tech-storytelling` | relink |
| `rag-dual-circuit-v1` | relink |
| `recreate-execution-procedure-interface` | relink |
| `research-query-hygiene` | relink |
| `review-oversized-queue` | relink |
| `ritual-a-angelina-coordinator` | relink |
| `ritual-k-karkas` | relink |
| `ritual-magistral-source-freshness` | relink |
| `ritual-r-report` | relink |
| `ritual-s-standup` | relink |
| `root-domain-scenarios-docs` | relink |
| `rt-1-manifest-generator` | relink |
| `rt-3-closure-integrity` | relink |
| `rt-4-closure-chain` | relink |
| `rt-5-pr-land` | relink |
| `rt-7-priorities-from-registry` | relink |
| `sca-manual-smoke` | relink |
| `scoreboard-dataset-ladder` | relink |
| `scoreboard-neural-ladder` | relink |
| `scoreboard-panel-publish` | relink |
| `ship-automerge-predicate` | relink |
| `sprint-cut-teeth-to-live-modules` | relink |
| `studio-capture-adaptation` | relink |
| `swallow-delivery-idempotency` | relink |
| `team-accountability-metrics` | relink |
| `tech-debt-2026-07` | relink |
| `tests-container` | relink |
| `tooling-atlas` | relink |
| `tooling-truth-orphans-diagnosis` | relink |
| `tw-declared-verbs-honest-no` | relink |
| `ucv2-0-spec-lgtm` | relink |
| `ucv2-1-graph-collapse` | relink |
| `ucv2-2-freeze-async-tracks` | relink |
| `ucv2-3-pack-verify` | relink |
| `ucv2-4-operator-signoff` | relink |
| `usercase-mvp-v2-groups-async` | relink |
| `vdr-label-roundtrip-night-build` | relink |
| `workflow-examples-marathon` | relink |

## Stale (169)

**Требует проверки (низкая уверенность)**

| id | issue | dwell (дн) | действие |
| --- | --- | --- | --- |
| `agent-tooling-friction-3` | [#554](https://github.com/officefish/Membrana/issues/554) | 22 | re-scope |
| `ally-swallow-editorial-gate` | [#569](https://github.com/officefish/Membrana/issues/569) | 22 | re-scope |
| `angelina-codex-no-repo-writes` | [#922](https://github.com/officefish/Membrana/issues/922) | 16 | re-scope |
| `angelina-hostess-impl` | — | 17 | re-scope |
| `angelina-orchestrator-prompt` | — | 19 | re-scope |
| `assets-container` | [#959](https://github.com/officefish/Membrana/issues/959) | 16 | re-scope |
| `batch-collection-run-contour` | [#494](https://github.com/officefish/Membrana/issues/494) | 23 | re-scope |
| `bridge-room` | [#936](https://github.com/officefish/Membrana/issues/936) | 16 | re-scope |
| `cabinet-scenario-picker-system` | — | 30 | re-scope |
| `cascade-honest-manual` | [#999](https://github.com/officefish/Membrana/issues/999) | 15 | re-scope |
| `cg2-two-tier-test-gate` | — | 36 | re-scope |
| `cg3-flaky-metrics-week` | — | 36 | re-scope |
| `cg4-ci-testing-docs` | — | 36 | re-scope |
| `ci-gate-stabilization` | — | 36 | re-scope |
| `code-review-lead-refactor` | — | 17 | re-scope |
| `comp-packaging-catalog-2026-06-25` | — | 43 | re-scope |
| `dads-benchmark-bridge` | — | 20 | re-scope |
| `db-doc-v04-mvp` | — | 49 | re-scope |
| `db-h1b-board-shell` | — | 51 | re-scope |
| `db-h1c-graph-serialize` | — | 51 | re-scope |
| `db-h2a-json-import` | — | 51 | re-scope |
| `db-h2b-scenario-runtime` | — | 51 | re-scope |
| `db-h2c-mic-journal` | — | 51 | re-scope |
| `db-h2d-cabinet-sync` | — | 51 | re-scope |
| `db-h3a-trigger-stop` | — | 51 | re-scope |
| `db-h3b-trigger-disconnect` | — | 51 | re-scope |
| `db-h3c-subgraph` | — | 51 | re-scope |
| `db-h4-alarm-close` | — | 51 | re-scope |
| `db-p3-a1-usercase-catalog-service` | — | 44 | re-scope |
| `db-p3-a2-runtime-validators` | — | 44 | re-scope |
| `db-p3-a3-competition-restrictions` | — | 44 | re-scope |
| `db-post-usercase-roadmap` | — | 47 | re-scope |
| `db-sf-0-canon` | — | 42 | re-scope |
| `db-sf-1-core-contracts` | — | 42 | re-scope |
| `db-sf-2-gateway-board` | — | 42 | re-scope |
| `db-sf-3-cabinet-lease-api` | — | 42 | re-scope |
| `db-sf-4-client-follower` | — | 42 | re-scope |
| `db-sf-5-board-flags-ui` | — | 42 | re-scope |
| `db-sf-6-nodes-runtime` | — | 42 | re-scope |
| `db-sf-7-last-track-preview` | — | 42 | re-scope |
| `db-sf-8-tests-smoke` | — | 42 | re-scope |
| `db-sf-9-docs-sync` | — | 42 | re-scope |
| `db3h-s2-cabinet-host` | — | 42 | re-scope |
| `db3h-s4-microphone-detectors` | — | 42 | re-scope |
| `db3h-s5-desktop-logging` | — | 42 | re-scope |
| `detection-alarm-loop-refactor` | — | 27 | re-scope |
| `detector-metrics-characterization` | [#565](https://github.com/officefish/Membrana/issues/565) | 23 | re-scope |
| `detector-scoreboard` | — | 20 | re-scope |
| `device-board-hackathon-1` | — | 51 | re-scope |
| `device-board-phase-3` | — | 44 | re-scope |
| `device-board-server-first` | — | 42 | re-scope |
| `device-board-three-hosts-2026-06-26` | — | 42 | re-scope |
| `dreams-deploy-office` | [#997](https://github.com/officefish/Membrana/issues/997) | 15 | re-scope |
| `drift-anchor-contour` | [#396](https://github.com/officefish/Membrana/issues/396) | 26 | re-scope |
| `frame-rails-2307` | — | 15 | re-scope |
| `frames-alive-dynin` | [#980](https://github.com/officefish/Membrana/issues/980) | 16 | re-scope |
| `frames-alive-ozhegov` | [#979](https://github.com/officefish/Membrana/issues/979) | 16 | re-scope |
| `frames-alive-rodchenko` | [#981](https://github.com/officefish/Membrana/issues/981) | 16 | re-scope |
| `fv1-s2-closeout` | — | 37 | re-scope |
| `generated-docs-quality-criteria` | — | 19 | re-scope |
| `graphify-research-tree-panel-sections` | — | 22 | re-scope |
| `grp1-route-bridge-sections` | — | 22 | re-scope |
| `grp2-grants-owner-matrix` | — | 22 | re-scope |
| `grp3-research-tree-gated` | — | 22 | re-scope |
| `grp4-graphify-gated` | — | 22 | re-scope |
| `linear-hygiene-dreams-providers-night` | — | 18 | re-scope |
| `live-parallel-detection-sprint` | — | 52 | re-scope |
| `llm-procedure-channels` | [#1007](https://github.com/officefish/Membrana/issues/1007) | 15 | re-scope |
| `lp1-mic-drone-stream-modes` | — | 52 | re-scope |
| `lp1b-drone-detailed-report-server` | — | 52 | re-scope |
| `lp2-fft-plugins-journal-sink` | — | 52 | re-scope |
| `lp3-track-import-backpressure` | — | 52 | re-scope |
| `lp4-parallel-detection-smoke` | — | 52 | re-scope |
| `lp5-journal-report-renderers` | — | 52 | re-scope |
| `lpc-a-lib` | [#1008](https://github.com/officefish/Membrana/issues/1008) | 15 | re-scope |
| `lpc-b-wire` | [#1009](https://github.com/officefish/Membrana/issues/1009) | 15 | re-scope |
| `lpc-c-office` | [#1010](https://github.com/officefish/Membrana/issues/1010) | 15 | re-scope |
| `lpc-d-panel` | [#1011](https://github.com/officefish/Membrana/issues/1011) | 15 | re-scope |
| `main-day-probe-gate` | [#533](https://github.com/officefish/Membrana/issues/533) | 22 | re-scope |
| `media-library-a3-mic-recorder` | — | 58 | re-scope |
| `media-library-a4-sample-player` | — | 58 | re-scope |
| `meeting-format` | — | 21 | re-scope |
| `meeting-registry-relocation` | — | 19 | re-scope |
| `meeting-team-execution-contour` | — | 19 | re-scope |
| `membrana-device-build-profile` | — | 22 | re-scope |
| `membrane-node-runtime-remote` | — | 50 | re-scope |
| `mf1-format-carrier` | — | 21 | re-scope |
| `mf10-teeth-sm5` | — | 21 | re-scope |
| `mf2-branch-count` | — | 21 | re-scope |
| `mf3-commands-vs-flag` | — | 21 | re-scope |
| `mf4-teeth-sm2` | — | 21 | re-scope |
| `mf5-echo-rule` | — | 21 | re-scope |
| `mf6-auditor-worktree` | — | 21 | re-scope |
| `mf7-active-guard` | — | 21 | re-scope |
| `mf8-sprint-kind` | — | 21 | re-scope |
| `mf9-auditor-readonly` | — | 21 | re-scope |
| `morning-report-completion` | [#788](https://github.com/officefish/Membrana/issues/788) | 17 | re-scope |
| `morning-ritual-regulation` | [#605](https://github.com/officefish/Membrana/issues/605) | 20 | re-scope |
| `mp7b-rt0-contract` | — | 50 | re-scope |
| `mp7b-rt1-gateway` | — | 50 | re-scope |
| `mp7b-rt2-client-runtime` | — | 50 | re-scope |
| `mp7b-rt3-mode` | — | 50 | re-scope |
| `mp7b-rt4-multinode-schema` | — | 50 | re-scope |
| `mp7b-rt5-cabinet-nodes` | — | 50 | re-scope |
| `mp7b-rt6-board-ux` | — | 50 | re-scope |
| `mp7b-rt7-prod-hardening` | — | 50 | re-scope |
| `nb-vlr-0-gate` | — | 35 | re-scope |
| `nb-vlr-1-labels-export-ui` | — | 35 | re-scope |
| `nb-vlr-2-labels-merge-script` | — | 35 | re-scope |
| `nb-vlr-3-library-label-filter` | — | 35 | re-scope |
| `nb-vlr-4-docs` | — | 35 | re-scope |
| `neural-free-tier-dataset-report` | — | 42 | re-scope |
| `neural-tier-1b-contract` | [#47](https://github.com/officefish/Membrana/issues/47) | 42 | re-scope |
| `night-build-format-v2` | — | 20 | re-scope |
| `oc-proxy-s0-research-isolation` | — | 43 | re-scope |
| `oc-proxy-s1-opencode-install` | — | 43 | re-scope |
| `oc-proxy-s2-freemodel-keys` | — | 43 | re-scope |
| `oc-proxy-s3-llm-proxy-script` | — | 43 | re-scope |
| `oc-proxy-s4-opencode-config` | — | 43 | re-scope |
| `office-stability-emergency` | [#933](https://github.com/officefish/Membrana/issues/933) | 16 | re-scope |
| `opencode-proxy-sprint-2026-06-25` | — | 43 | re-scope |
| `partner-tutorials` | — | 32 | re-scope |
| `pcb-d2-multinode` | — | 34 | re-scope |
| `precedent-container` | — | 16 | re-scope |
| `procedural-layer-impl` | [#781](https://github.com/officefish/Membrana/issues/781) | 17 | re-scope |
| `procedural-workshop` | — | 16 | re-scope |
| `product-landing` | — | 23 | re-scope |
| `pt-0-tutorial-template` | — | 32 | re-scope |
| `pt-1-read-facts-sheet` | — | 32 | re-scope |
| `pt-2-first-output-v01-endtoend` | — | 32 | re-scope |
| `pt-3-honest-tech-storytelling` | — | 32 | re-scope |
| `rag-dual-circuit-v1` | — | 47 | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | 54 | re-scope |
| `research-query-hygiene` | — | 20 | re-scope |
| `ritual-a-angelina-coordinator` | — | 18 | re-scope |
| `ritual-k-karkas` | — | 18 | re-scope |
| `ritual-r-report` | — | 18 | re-scope |
| `ritual-s-standup` | — | 18 | re-scope |
| `ritual-trust-contour` | [#539](https://github.com/officefish/Membrana/issues/539) | 22 | re-scope |
| `root-domain-scenarios-docs` | — | 23 | re-scope |
| `rt-1-manifest-generator` | — | 22 | re-scope |
| `rt-2-session-extracts` | [#537](https://github.com/officefish/Membrana/issues/537) | 22 | re-scope |
| `rt-3-closure-integrity` | — | 22 | re-scope |
| `rt-4-closure-chain` | — | 22 | re-scope |
| `rt-5-pr-land` | — | 22 | re-scope |
| `rt-7-priorities-from-registry` | — | 22 | re-scope |
| `sca-manual-smoke` | — | 35 | re-scope |
| `scoreboard-dataset-ladder` | — | 20 | re-scope |
| `scoreboard-neural-ladder` | — | 20 | re-scope |
| `scoreboard-panel-publish` | — | 20 | re-scope |
| `strategy-day-generator` | [#592](https://github.com/officefish/Membrana/issues/592) | 21 | re-scope |
| `studio-capture-adaptation` | — | 35 | re-scope |
| `swallow-delivery-idempotency` | — | 20 | re-scope |
| `swallow-format-frame-fix` | [#918](https://github.com/officefish/Membrana/issues/918) | 16 | re-scope |
| `team-accountability-metrics` | — | 19 | re-scope |
| `tech-debt-2026-07` | — | 30 | re-scope |
| `tooling-atlas` | — | 16 | re-scope |
| `trends-fft-template-editor` | [#57](https://github.com/officefish/Membrana/issues/57) | 57 | re-scope |
| `truth-graph-contour` | [#576](https://github.com/officefish/Membrana/issues/576) | 21 | re-scope |
| `ucv2-0-spec-lgtm` | — | 45 | re-scope |
| `ucv2-1-graph-collapse` | — | 45 | re-scope |
| `ucv2-2-freeze-async-tracks` | — | 45 | re-scope |
| `ucv2-3-pack-verify` | — | 45 | re-scope |
| `ucv2-4-operator-signoff` | — | 45 | re-scope |
| `usercase-mvp-v2-groups-async` | — | 45 | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | 35 | re-scope |
| `vdr-hg3-trends-benchmark` | [#47](https://github.com/officefish/Membrana/issues/47) | 35 | re-scope |
| `vdr-hg4-hard-gate-report` | [#47](https://github.com/officefish/Membrana/issues/47) | 35 | re-scope |
| `vdr-label-roundtrip-night-build` | — | 35 | re-scope |
