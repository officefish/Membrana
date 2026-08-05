# Night Triage 2026-08-05

**Сводка:** ghost 5 · orphan 170 · stale 159.

> Производный артефакт (sink not source): рекомендации, не действия — исполняет человек. Порог stale 14 дн. Сгенерирован 2026-08-05T23:30:00.002Z.

## Обзор (LLM-нарратив)

> _Сгенерировано LLM поверх детерминированного среза (канал: claude); таблицы ниже — источник истины._

В глаза бросается доминирование двух проблем: 170 orphan-задач и 159 stale (при пороге 14 дней) — это основная масса технического долга, тогда как ghost-задач всего 5. Все пять ghost сконцентрированы в одном кластере вокруг issue #47 (neural-tier-1b-contract, real-dataset-live-calibration, vdr-hard-gate, vdr-hg3-trends-benchmark и др.), поэтому именно #47 логично разобрать первым — компактный узел с назначенными рекомендациями. Среди stale выделяется кластер media-library (a3-mic-recorder и a4-sample-player, по 56 дней), а также trends-fft-template-editor (55д) — самые залежавшиеся, к ним стоит присмотреться следом. Показательно, что real-dataset-live-calibration фигурирует и в ghost-кластере #47, и среди самых старых stale (52д), что делает её пересечением сразу двух проблемных зон. Orphan-массив (agent-tooling-*, angelina-*, cg2/cg3/cg4-* и др.) выглядит наиболее разнородным и объёмным, поэтому его разумнее разбирать по тематическим группам после локальных ghost- и stale-очагов.

## Ghost (5)

| id | issue | действие |
| --- | --- | --- |
| `neural-tier-1b-contract` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg3-trends-benchmark` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg4-hard-gate-report` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |

## Orphan (170)

| id | действие |
| --- | --- |
| `agent-tooling-friction-6` | relink |
| `agent-tooling-night-build` | relink |
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
| `nb-at-0-gate` | relink |
| `nb-at-1-gitignore-review` | relink |
| `nb-at-2-pr-ship` | relink |
| `nb-at-3-build-affected` | relink |
| `nb-at-4-verify-wire-sync` | relink |
| `nb-at-6-helpers` | relink |
| `nb-at-8-docs-skills` | relink |
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
| `scoreboard-spectral-ladder` | relink |
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

## Stale (159)

**Требует проверки (низкая уверенность)**

| id | issue | dwell (дн) | действие |
| --- | --- | --- | --- |
| `agent-tooling-friction-3` | [#554](https://github.com/officefish/Membrana/issues/554) | 20 | re-scope |
| `agent-tooling-night-build` | — | 28 | re-scope |
| `ally-swallow-editorial-gate` | [#569](https://github.com/officefish/Membrana/issues/569) | 20 | re-scope |
| `angelina-hostess-impl` | — | 15 | re-scope |
| `angelina-orchestrator-prompt` | — | 17 | re-scope |
| `batch-collection-run-contour` | [#494](https://github.com/officefish/Membrana/issues/494) | 21 | re-scope |
| `cabinet-scenario-picker-system` | — | 28 | re-scope |
| `cg2-two-tier-test-gate` | — | 34 | re-scope |
| `cg3-flaky-metrics-week` | — | 34 | re-scope |
| `cg4-ci-testing-docs` | — | 34 | re-scope |
| `ci-gate-stabilization` | — | 34 | re-scope |
| `code-review-lead-refactor` | — | 15 | re-scope |
| `comp-packaging-catalog-2026-06-25` | — | 41 | re-scope |
| `dads-benchmark-bridge` | — | 18 | re-scope |
| `db-doc-v04-mvp` | — | 47 | re-scope |
| `db-h1b-board-shell` | — | 49 | re-scope |
| `db-h1c-graph-serialize` | — | 49 | re-scope |
| `db-h2a-json-import` | — | 49 | re-scope |
| `db-h2b-scenario-runtime` | — | 49 | re-scope |
| `db-h2c-mic-journal` | — | 49 | re-scope |
| `db-h2d-cabinet-sync` | — | 49 | re-scope |
| `db-h3a-trigger-stop` | — | 49 | re-scope |
| `db-h3b-trigger-disconnect` | — | 49 | re-scope |
| `db-h3c-subgraph` | — | 49 | re-scope |
| `db-h4-alarm-close` | — | 49 | re-scope |
| `db-p3-a1-usercase-catalog-service` | — | 42 | re-scope |
| `db-p3-a2-runtime-validators` | — | 42 | re-scope |
| `db-p3-a3-competition-restrictions` | — | 42 | re-scope |
| `db-post-usercase-roadmap` | — | 45 | re-scope |
| `db-sf-0-canon` | — | 40 | re-scope |
| `db-sf-1-core-contracts` | — | 40 | re-scope |
| `db-sf-2-gateway-board` | — | 40 | re-scope |
| `db-sf-3-cabinet-lease-api` | — | 40 | re-scope |
| `db-sf-4-client-follower` | — | 40 | re-scope |
| `db-sf-5-board-flags-ui` | — | 40 | re-scope |
| `db-sf-6-nodes-runtime` | — | 40 | re-scope |
| `db-sf-7-last-track-preview` | — | 40 | re-scope |
| `db-sf-8-tests-smoke` | — | 40 | re-scope |
| `db-sf-9-docs-sync` | — | 40 | re-scope |
| `db3h-s2-cabinet-host` | — | 40 | re-scope |
| `db3h-s4-microphone-detectors` | — | 40 | re-scope |
| `db3h-s5-desktop-logging` | — | 40 | re-scope |
| `detection-alarm-loop-refactor` | — | 25 | re-scope |
| `detector-metrics-characterization` | [#565](https://github.com/officefish/Membrana/issues/565) | 21 | re-scope |
| `detector-scoreboard` | — | 18 | re-scope |
| `device-board-hackathon-1` | — | 49 | re-scope |
| `device-board-phase-3` | — | 42 | re-scope |
| `device-board-server-first` | — | 40 | re-scope |
| `device-board-three-hosts-2026-06-26` | — | 40 | re-scope |
| `drift-anchor-contour` | [#396](https://github.com/officefish/Membrana/issues/396) | 24 | re-scope |
| `fv1-s2-closeout` | — | 35 | re-scope |
| `generated-docs-quality-criteria` | — | 17 | re-scope |
| `graphify-research-tree-panel-sections` | — | 20 | re-scope |
| `grp1-route-bridge-sections` | — | 20 | re-scope |
| `grp2-grants-owner-matrix` | — | 20 | re-scope |
| `grp3-research-tree-gated` | — | 20 | re-scope |
| `grp4-graphify-gated` | — | 20 | re-scope |
| `linear-hygiene-dreams-providers-night` | — | 16 | re-scope |
| `live-parallel-detection-sprint` | — | 50 | re-scope |
| `lp1-mic-drone-stream-modes` | — | 50 | re-scope |
| `lp1b-drone-detailed-report-server` | — | 50 | re-scope |
| `lp2-fft-plugins-journal-sink` | — | 50 | re-scope |
| `lp3-track-import-backpressure` | — | 50 | re-scope |
| `lp4-parallel-detection-smoke` | — | 50 | re-scope |
| `lp5-journal-report-renderers` | — | 50 | re-scope |
| `main-day-probe-gate` | [#533](https://github.com/officefish/Membrana/issues/533) | 20 | re-scope |
| `media-library-a3-mic-recorder` | — | 56 | re-scope |
| `media-library-a4-sample-player` | — | 56 | re-scope |
| `meeting-format` | — | 19 | re-scope |
| `meeting-registry-relocation` | — | 17 | re-scope |
| `meeting-team-execution-contour` | — | 17 | re-scope |
| `membrana-device-build-profile` | — | 20 | re-scope |
| `membrane-node-runtime-remote` | — | 48 | re-scope |
| `mf1-format-carrier` | — | 19 | re-scope |
| `mf10-teeth-sm5` | — | 19 | re-scope |
| `mf2-branch-count` | — | 19 | re-scope |
| `mf3-commands-vs-flag` | — | 19 | re-scope |
| `mf4-teeth-sm2` | — | 19 | re-scope |
| `mf5-echo-rule` | — | 19 | re-scope |
| `mf6-auditor-worktree` | — | 19 | re-scope |
| `mf7-active-guard` | — | 19 | re-scope |
| `mf8-sprint-kind` | — | 19 | re-scope |
| `mf9-auditor-readonly` | — | 19 | re-scope |
| `morning-report-completion` | [#788](https://github.com/officefish/Membrana/issues/788) | 15 | re-scope |
| `morning-ritual-regulation` | [#605](https://github.com/officefish/Membrana/issues/605) | 18 | re-scope |
| `mp7b-rt0-contract` | — | 48 | re-scope |
| `mp7b-rt1-gateway` | — | 48 | re-scope |
| `mp7b-rt2-client-runtime` | — | 48 | re-scope |
| `mp7b-rt3-mode` | — | 48 | re-scope |
| `mp7b-rt4-multinode-schema` | — | 48 | re-scope |
| `mp7b-rt5-cabinet-nodes` | — | 48 | re-scope |
| `mp7b-rt6-board-ux` | — | 48 | re-scope |
| `mp7b-rt7-prod-hardening` | — | 48 | re-scope |
| `nb-at-0-gate` | — | 28 | re-scope |
| `nb-at-1-gitignore-review` | — | 28 | re-scope |
| `nb-at-2-pr-ship` | — | 28 | re-scope |
| `nb-at-3-build-affected` | — | 28 | re-scope |
| `nb-at-4-verify-wire-sync` | — | 28 | re-scope |
| `nb-at-6-helpers` | — | 28 | re-scope |
| `nb-at-8-docs-skills` | — | 28 | re-scope |
| `nb-vlr-0-gate` | — | 33 | re-scope |
| `nb-vlr-1-labels-export-ui` | — | 33 | re-scope |
| `nb-vlr-2-labels-merge-script` | — | 33 | re-scope |
| `nb-vlr-3-library-label-filter` | — | 33 | re-scope |
| `nb-vlr-4-docs` | — | 33 | re-scope |
| `neural-free-tier-dataset-report` | — | 40 | re-scope |
| `neural-tier-1b-contract` | [#47](https://github.com/officefish/Membrana/issues/47) | 40 | re-scope |
| `night-build-format-v2` | — | 18 | re-scope |
| `oc-proxy-s0-research-isolation` | — | 41 | re-scope |
| `oc-proxy-s1-opencode-install` | — | 41 | re-scope |
| `oc-proxy-s2-freemodel-keys` | — | 41 | re-scope |
| `oc-proxy-s3-llm-proxy-script` | — | 41 | re-scope |
| `oc-proxy-s4-opencode-config` | — | 41 | re-scope |
| `opencode-proxy-sprint-2026-06-25` | — | 41 | re-scope |
| `partner-tutorials` | — | 30 | re-scope |
| `pcb-d2-multinode` | — | 32 | re-scope |
| `procedural-layer-impl` | [#781](https://github.com/officefish/Membrana/issues/781) | 15 | re-scope |
| `product-landing` | — | 21 | re-scope |
| `pt-0-tutorial-template` | — | 30 | re-scope |
| `pt-1-read-facts-sheet` | — | 30 | re-scope |
| `pt-2-first-output-v01-endtoend` | — | 30 | re-scope |
| `pt-3-honest-tech-storytelling` | — | 30 | re-scope |
| `rag-dual-circuit-v1` | — | 45 | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | 52 | re-scope |
| `research-query-hygiene` | — | 18 | re-scope |
| `ritual-a-angelina-coordinator` | — | 16 | re-scope |
| `ritual-k-karkas` | — | 16 | re-scope |
| `ritual-r-report` | — | 16 | re-scope |
| `ritual-s-standup` | — | 16 | re-scope |
| `ritual-trust-contour` | [#539](https://github.com/officefish/Membrana/issues/539) | 20 | re-scope |
| `root-domain-scenarios-docs` | — | 21 | re-scope |
| `rt-1-manifest-generator` | — | 20 | re-scope |
| `rt-2-session-extracts` | [#537](https://github.com/officefish/Membrana/issues/537) | 20 | re-scope |
| `rt-3-closure-integrity` | — | 20 | re-scope |
| `rt-4-closure-chain` | — | 20 | re-scope |
| `rt-5-pr-land` | — | 20 | re-scope |
| `rt-7-priorities-from-registry` | — | 20 | re-scope |
| `sca-manual-smoke` | — | 33 | re-scope |
| `scoreboard-dataset-ladder` | — | 18 | re-scope |
| `scoreboard-neural-ladder` | — | 18 | re-scope |
| `scoreboard-panel-publish` | — | 18 | re-scope |
| `scoreboard-spectral-ladder` | — | 18 | re-scope |
| `strategy-day-generator` | [#592](https://github.com/officefish/Membrana/issues/592) | 19 | re-scope |
| `studio-capture-adaptation` | — | 33 | re-scope |
| `swallow-delivery-idempotency` | — | 18 | re-scope |
| `team-accountability-metrics` | — | 17 | re-scope |
| `tech-debt-2026-07` | — | 28 | re-scope |
| `trends-fft-template-editor` | [#57](https://github.com/officefish/Membrana/issues/57) | 55 | re-scope |
| `truth-graph-contour` | [#576](https://github.com/officefish/Membrana/issues/576) | 19 | re-scope |
| `ucv2-0-spec-lgtm` | — | 43 | re-scope |
| `ucv2-1-graph-collapse` | — | 43 | re-scope |
| `ucv2-2-freeze-async-tracks` | — | 43 | re-scope |
| `ucv2-3-pack-verify` | — | 43 | re-scope |
| `ucv2-4-operator-signoff` | — | 43 | re-scope |
| `usercase-mvp-v2-groups-async` | — | 43 | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | 33 | re-scope |
| `vdr-hg3-trends-benchmark` | [#47](https://github.com/officefish/Membrana/issues/47) | 33 | re-scope |
| `vdr-hg4-hard-gate-report` | [#47](https://github.com/officefish/Membrana/issues/47) | 33 | re-scope |
| `vdr-label-roundtrip-night-build` | — | 33 | re-scope |
