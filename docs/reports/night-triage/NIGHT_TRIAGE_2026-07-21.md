# Night Triage 2026-07-21

**Сводка:** ghost 5 · orphan 156 · stale 104.

> Производный артефакт (sink not source): рекомендации, не действия — исполняет человек. Порог stale 14 дн. Сгенерирован 2026-07-21T23:30:00.019Z.

## Обзор (LLM-нарратив)

> _Сгенерировано LLM поверх детерминированного среза (канал: claude); таблицы ниже — источник истины._

В срезе доминируют orphan-задачи (156) — это основной кластер технического долга, значительно превышающий stale (104) и ghost (5). Все 5 ghost-задач сконцентрированы вокруг одного issue #47 (neural-tier-1b-contract, real-dataset-live-calibration, vdr-hard-gate, vdr-hg3-trends-benchmark и др.), что делает его логичной точкой первого разбора. Среди stale выделяется явный узел вокруг media-library: media-library-a3-mic-recorder и media-library-a4-sample-player залежались дольше всех — по 41 дню. Стоит также обратить внимание на задачу real-dataset-live-calibration, которая одновременно фигурирует и в ghost-кластере #47, и в списке самых залежавшихся stale (37 дней) — это пересечение может указывать на общий корень проблемы. Рекомендации по каждой задаче (close/relink/re-scope) уже назначены и приводятся без изменений — исполняет человек.

## Ghost (5)

| id | issue | действие |
| --- | --- | --- |
| `neural-tier-1b-contract` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg3-trends-benchmark` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg4-hard-gate-report` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |

## Orphan (156)

| id | действие |
| --- | --- |
| `agent-tooling-night-build` | relink |
| `angelina-orchestrator-prompt` | relink |
| `cabinet-scenario-picker-system` | relink |
| `cg2-two-tier-test-gate` | relink |
| `cg3-flaky-metrics-week` | relink |
| `cg4-ci-testing-docs` | relink |
| `ci-gate-stabilization` | relink |
| `comp-packaging-catalog-2026-06-25` | relink |
| `dads-benchmark-bridge` | relink |
| `db-ap-r1-core-contracts` | relink |
| `db-ap-r10-agenda-async-hub` | relink |
| `db-ap-r11-observability-tests` | relink |
| `db-ap-r12-docs-signoff` | relink |
| `db-ap-r2-core-sequence-latent` | relink |
| `db-ap-r3-async-job-store` | relink |
| `db-ap-r4-sequence-latent-runtime` | relink |
| `db-ap-r5-promise-nodes-editor` | relink |
| `db-ap-r6-promise-nodes-executor` | relink |
| `db-ap-r7-host-bridge-jobs` | relink |
| `db-ap-r8-detached-event-dispatch` | relink |
| `db-ap-r9-mvp-graph-v2` | relink |
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
| `detection-alarm-loop-refactor` | relink |
| `detector-scoreboard` | relink |
| `device-board-hackathon-1` | relink |
| `device-board-phase-3` | relink |
| `device-board-server-first` | relink |
| `device-board-three-hosts-2026-06-26` | relink |
| `fv1-s2-closeout` | relink |
| `generated-docs-quality-criteria` | relink |
| `graphify-research-tree-panel-sections` | relink |
| `grp1-route-bridge-sections` | relink |
| `grp2-grants-owner-matrix` | relink |
| `grp3-research-tree-gated` | relink |
| `grp4-graphify-gated` | relink |
| `linear-agent-identity-facts` | relink |
| `live-parallel-detection-sprint` | relink |
| `lp1-mic-drone-stream-modes` | relink |
| `lp1b-drone-detailed-report-server` | relink |
| `lp2-fft-plugins-journal-sink` | relink |
| `lp3-track-import-backpressure` | relink |
| `lp4-parallel-detection-smoke` | relink |
| `lp5-journal-report-renderers` | relink |
| `media-library-a3-mic-recorder` | relink |
| `media-library-a4-sample-player` | relink |
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
| `nb-at-5-hooks` | relink |
| `nb-at-6-helpers` | relink |
| `nb-at-7-bookkeeping-gitctx` | relink |
| `nb-at-8-docs-skills` | relink |
| `nb-vlr-0-gate` | relink |
| `nb-vlr-1-labels-export-ui` | relink |
| `nb-vlr-2-labels-merge-script` | relink |
| `nb-vlr-3-library-label-filter` | relink |
| `nb-vlr-4-docs` | relink |
| `neural-free-tier-dataset-report` | relink |
| `night-build-format-v2` | relink |
| `oc-proxy-s0-research-isolation` | relink |
| `oc-proxy-s1-opencode-install` | relink |
| `oc-proxy-s2-freemodel-keys` | relink |
| `oc-proxy-s3-llm-proxy-script` | relink |
| `oc-proxy-s4-opencode-config` | relink |
| `opencode-proxy-sprint-2026-06-25` | relink |
| `partner-tutorials` | relink |
| `pcb-d2-multinode` | relink |
| `product-landing` | relink |
| `pt-0-tutorial-template` | relink |
| `pt-1-read-facts-sheet` | relink |
| `pt-2-first-output-v01-endtoend` | relink |
| `pt-3-honest-tech-storytelling` | relink |
| `rag-dual-circuit-v1` | relink |
| `rag-r6-closure` | relink |
| `rag-r7-optional` | relink |
| `research-query-hygiene` | relink |
| `ritual-a-angelina-coordinator` | relink |
| `ritual-k-karkas` | relink |
| `ritual-r-report` | relink |
| `ritual-s-standup` | relink |
| `root-domain-scenarios-docs` | relink |
| `rt-1-manifest-generator` | relink |
| `rt-10-review-precision-degradation` | relink |
| `rt-3-closure-integrity` | relink |
| `rt-4-closure-chain` | relink |
| `rt-5-pr-land` | relink |
| `rt-7-priorities-from-registry` | relink |
| `rt-9-code-review-freshness` | relink |
| `sca-manual-smoke` | relink |
| `scoreboard-dataset-ladder` | relink |
| `scoreboard-neural-ladder` | relink |
| `scoreboard-panel-publish` | relink |
| `scoreboard-spectral-ladder` | relink |
| `studio-capture-adaptation` | relink |
| `swallow-delivery-idempotency` | relink |
| `team-accountability-metrics` | relink |
| `tech-debt-2026-07` | relink |
| `ucv2-0-spec-lgtm` | relink |
| `ucv2-1-graph-collapse` | relink |
| `ucv2-2-freeze-async-tracks` | relink |
| `ucv2-3-pack-verify` | relink |
| `ucv2-4-operator-signoff` | relink |
| `usercase-mvp-v2-groups-async` | relink |
| `vdr-label-roundtrip-night-build` | relink |

## Stale (104)

**Требует проверки (низкая уверенность)**

| id | issue | dwell (дн) | действие |
| --- | --- | --- | --- |
| `cg2-two-tier-test-gate` | — | 19 | re-scope |
| `cg3-flaky-metrics-week` | — | 19 | re-scope |
| `cg4-ci-testing-docs` | — | 19 | re-scope |
| `ci-gate-stabilization` | — | 19 | re-scope |
| `comp-packaging-catalog-2026-06-25` | — | 26 | re-scope |
| `db-ap-r1-core-contracts` | — | 26 | re-scope |
| `db-ap-r10-agenda-async-hub` | — | 26 | re-scope |
| `db-ap-r11-observability-tests` | — | 26 | re-scope |
| `db-ap-r12-docs-signoff` | — | 26 | re-scope |
| `db-ap-r2-core-sequence-latent` | — | 26 | re-scope |
| `db-ap-r3-async-job-store` | — | 26 | re-scope |
| `db-ap-r4-sequence-latent-runtime` | — | 26 | re-scope |
| `db-ap-r5-promise-nodes-editor` | — | 26 | re-scope |
| `db-ap-r6-promise-nodes-executor` | — | 26 | re-scope |
| `db-ap-r7-host-bridge-jobs` | — | 26 | re-scope |
| `db-ap-r8-detached-event-dispatch` | — | 26 | re-scope |
| `db-ap-r9-mvp-graph-v2` | — | 26 | re-scope |
| `db-doc-v04-mvp` | — | 32 | re-scope |
| `db-h1b-board-shell` | — | 34 | re-scope |
| `db-h1c-graph-serialize` | — | 34 | re-scope |
| `db-h2a-json-import` | — | 34 | re-scope |
| `db-h2b-scenario-runtime` | — | 34 | re-scope |
| `db-h2c-mic-journal` | — | 34 | re-scope |
| `db-h2d-cabinet-sync` | — | 34 | re-scope |
| `db-h3a-trigger-stop` | — | 34 | re-scope |
| `db-h3b-trigger-disconnect` | — | 34 | re-scope |
| `db-h3c-subgraph` | — | 34 | re-scope |
| `db-h4-alarm-close` | — | 34 | re-scope |
| `db-p3-a1-usercase-catalog-service` | — | 27 | re-scope |
| `db-p3-a2-runtime-validators` | — | 27 | re-scope |
| `db-p3-a3-competition-restrictions` | — | 27 | re-scope |
| `db-post-usercase-roadmap` | — | 30 | re-scope |
| `db-sf-0-canon` | — | 25 | re-scope |
| `db-sf-1-core-contracts` | — | 25 | re-scope |
| `db-sf-2-gateway-board` | — | 25 | re-scope |
| `db-sf-3-cabinet-lease-api` | — | 25 | re-scope |
| `db-sf-4-client-follower` | — | 25 | re-scope |
| `db-sf-5-board-flags-ui` | — | 25 | re-scope |
| `db-sf-6-nodes-runtime` | — | 25 | re-scope |
| `db-sf-7-last-track-preview` | — | 25 | re-scope |
| `db-sf-8-tests-smoke` | — | 25 | re-scope |
| `db-sf-9-docs-sync` | — | 25 | re-scope |
| `db3h-s2-cabinet-host` | — | 25 | re-scope |
| `db3h-s4-microphone-detectors` | — | 25 | re-scope |
| `db3h-s5-desktop-logging` | — | 25 | re-scope |
| `device-board-hackathon-1` | — | 34 | re-scope |
| `device-board-phase-3` | — | 27 | re-scope |
| `device-board-server-first` | — | 25 | re-scope |
| `device-board-three-hosts-2026-06-26` | — | 25 | re-scope |
| `fv1-s2-closeout` | — | 20 | re-scope |
| `live-parallel-detection-sprint` | — | 35 | re-scope |
| `lp1-mic-drone-stream-modes` | — | 35 | re-scope |
| `lp1b-drone-detailed-report-server` | — | 35 | re-scope |
| `lp2-fft-plugins-journal-sink` | — | 35 | re-scope |
| `lp3-track-import-backpressure` | — | 35 | re-scope |
| `lp4-parallel-detection-smoke` | — | 35 | re-scope |
| `lp5-journal-report-renderers` | — | 35 | re-scope |
| `media-library-a3-mic-recorder` | — | 41 | re-scope |
| `media-library-a4-sample-player` | — | 41 | re-scope |
| `membrane-node-runtime-remote` | — | 33 | re-scope |
| `mp7b-rt0-contract` | — | 33 | re-scope |
| `mp7b-rt1-gateway` | — | 33 | re-scope |
| `mp7b-rt2-client-runtime` | — | 33 | re-scope |
| `mp7b-rt3-mode` | — | 33 | re-scope |
| `mp7b-rt4-multinode-schema` | — | 33 | re-scope |
| `mp7b-rt5-cabinet-nodes` | — | 33 | re-scope |
| `mp7b-rt6-board-ux` | — | 33 | re-scope |
| `mp7b-rt7-prod-hardening` | — | 33 | re-scope |
| `nb-vlr-0-gate` | — | 18 | re-scope |
| `nb-vlr-1-labels-export-ui` | — | 18 | re-scope |
| `nb-vlr-2-labels-merge-script` | — | 18 | re-scope |
| `nb-vlr-3-library-label-filter` | — | 18 | re-scope |
| `nb-vlr-4-docs` | — | 18 | re-scope |
| `neural-free-tier-dataset-report` | — | 25 | re-scope |
| `neural-tier-1b-contract` | [#47](https://github.com/officefish/Membrana/issues/47) | 25 | re-scope |
| `oc-proxy-s0-research-isolation` | — | 26 | re-scope |
| `oc-proxy-s1-opencode-install` | — | 26 | re-scope |
| `oc-proxy-s2-freemodel-keys` | — | 26 | re-scope |
| `oc-proxy-s3-llm-proxy-script` | — | 26 | re-scope |
| `oc-proxy-s4-opencode-config` | — | 26 | re-scope |
| `opencode-proxy-sprint-2026-06-25` | — | 26 | re-scope |
| `partner-tutorials` | — | 15 | re-scope |
| `pcb-d2-multinode` | — | 17 | re-scope |
| `pt-0-tutorial-template` | — | 15 | re-scope |
| `pt-1-read-facts-sheet` | — | 15 | re-scope |
| `pt-2-first-output-v01-endtoend` | — | 15 | re-scope |
| `pt-3-honest-tech-storytelling` | — | 15 | re-scope |
| `rag-dual-circuit-v1` | — | 30 | re-scope |
| `rag-r6-closure` | — | 24 | re-scope |
| `rag-r7-optional` | — | 24 | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | 37 | re-scope |
| `sca-manual-smoke` | — | 18 | re-scope |
| `studio-capture-adaptation` | — | 18 | re-scope |
| `trends-fft-template-editor` | [#57](https://github.com/officefish/Membrana/issues/57) | 40 | re-scope |
| `ucv2-0-spec-lgtm` | — | 28 | re-scope |
| `ucv2-1-graph-collapse` | — | 28 | re-scope |
| `ucv2-2-freeze-async-tracks` | — | 28 | re-scope |
| `ucv2-3-pack-verify` | — | 28 | re-scope |
| `ucv2-4-operator-signoff` | — | 28 | re-scope |
| `usercase-mvp-v2-groups-async` | — | 28 | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | 18 | re-scope |
| `vdr-hg3-trends-benchmark` | [#47](https://github.com/officefish/Membrana/issues/47) | 18 | re-scope |
| `vdr-hg4-hard-gate-report` | [#47](https://github.com/officefish/Membrana/issues/47) | 18 | re-scope |
| `vdr-label-roundtrip-night-build` | — | 18 | re-scope |
