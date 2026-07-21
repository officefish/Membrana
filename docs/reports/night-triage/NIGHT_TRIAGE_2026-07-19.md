# Night Triage 2026-07-19

**Сводка:** ghost 10 · orphan 147 · stale 132.

> Производный артефакт (sink not source): рекомендации, не действия — исполняет человек. Порог stale 14 дн. Сгенерирован 2026-07-19T23:30:00.025Z.

## Обзор (LLM-нарратив)

> _Сгенерировано LLM поверх детерминированного среза (канал: claude); таблицы ниже — источник истины._

Ночной триаж выявил серьёзный дисбаланс: при 10 ghost-задачах основную массу составляют 147 orphan и 132 stale (порог 14 дней). Особенно бросается в глаза концентрация ghost-задач вокруг issue #47 — там сразу 9 задач (neural-tier-1b-contract, real-dataset-live-calibration, sample-library-drone-detection, single-node-detection-first и др.), тогда как на #493 приходится всего одна (palette-clarity-nodes), так что смотреть первым делом стоит именно на #47. Отдельного внимания заслуживает single-node-detection-first: она одновременно и в ghost-кластере #47, и лидирует по залежалости с 64 днями. Следом по stale идёт плотный кластер медиа-задач: media-library-a3-mic-recorder и media-library-a4-sample-player (по 39д), background-media-a5a-server и background-media-a5b-docker (по 38д) — похоже на общую заброшенную ветку. Среди orphan заметны тематические группы (cg2/cg3/cg4, ci-gate-stabilization, media-library), что подсказывает искать утерянные связи по этим префиксам.

## Ghost (10)

| id | issue | действие |
| --- | --- | --- |
| `neural-tier-1b-contract` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `palette-clarity-nodes` | [#493](https://github.com/officefish/Membrana/issues/493) | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `sample-library-drone-detection` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `single-node-detection-first` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `sld3-dsp-detectors-free-v1` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `sld4-stage-gate-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg3-trends-benchmark` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg4-hard-gate-report` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |

## Orphan (147)

| id | действие |
| --- | --- |
| `agent-tooling-night-build` | relink |
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
| `graphify-research-tree-panel-sections` | relink |
| `grp1-route-bridge-sections` | relink |
| `grp2-grants-owner-matrix` | relink |
| `grp3-research-tree-gated` | relink |
| `grp4-graphify-gated` | relink |
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
| `scripts-boundary-container` | relink |
| `studio-capture-adaptation` | relink |
| `swallow-delivery-idempotency` | relink |
| `tech-debt-2026-07` | relink |
| `ucv2-0-spec-lgtm` | relink |
| `ucv2-1-graph-collapse` | relink |
| `ucv2-2-freeze-async-tracks` | relink |
| `ucv2-3-pack-verify` | relink |
| `ucv2-4-operator-signoff` | relink |
| `usercase-mvp-v2-groups-async` | relink |
| `vdr-label-roundtrip-night-build` | relink |

## Stale (132)

**Требует проверки (низкая уверенность)**

| id | issue | dwell (дн) | действие |
| --- | --- | --- | --- |
| `background-media-a5a-server` | [#58](https://github.com/officefish/Membrana/issues/58) | 38 | re-scope |
| `background-media-a5b-docker` | [#58](https://github.com/officefish/Membrana/issues/58) | 38 | re-scope |
| `background-media-a5c-deploy` | [#59](https://github.com/officefish/Membrana/issues/59) | 38 | re-scope |
| `background-media-v1` | [#58](https://github.com/officefish/Membrana/issues/58) | 38 | re-scope |
| `cg2-two-tier-test-gate` | — | 17 | re-scope |
| `cg3-flaky-metrics-week` | — | 17 | re-scope |
| `cg4-ci-testing-docs` | — | 17 | re-scope |
| `ci-gate-stabilization` | — | 17 | re-scope |
| `comp-packaging-catalog-2026-06-25` | — | 24 | re-scope |
| `db-ap-r1-core-contracts` | — | 24 | re-scope |
| `db-ap-r10-agenda-async-hub` | — | 24 | re-scope |
| `db-ap-r11-observability-tests` | — | 24 | re-scope |
| `db-ap-r12-docs-signoff` | — | 24 | re-scope |
| `db-ap-r2-core-sequence-latent` | — | 24 | re-scope |
| `db-ap-r3-async-job-store` | — | 24 | re-scope |
| `db-ap-r4-sequence-latent-runtime` | — | 24 | re-scope |
| `db-ap-r5-promise-nodes-editor` | — | 24 | re-scope |
| `db-ap-r6-promise-nodes-executor` | — | 24 | re-scope |
| `db-ap-r7-host-bridge-jobs` | — | 24 | re-scope |
| `db-ap-r8-detached-event-dispatch` | — | 24 | re-scope |
| `db-ap-r9-mvp-graph-v2` | — | 24 | re-scope |
| `db-doc-v04-mvp` | — | 30 | re-scope |
| `db-h1b-board-shell` | — | 32 | re-scope |
| `db-h1c-graph-serialize` | — | 32 | re-scope |
| `db-h2a-json-import` | — | 32 | re-scope |
| `db-h2b-scenario-runtime` | — | 32 | re-scope |
| `db-h2c-mic-journal` | — | 32 | re-scope |
| `db-h2d-cabinet-sync` | — | 32 | re-scope |
| `db-h3a-trigger-stop` | — | 32 | re-scope |
| `db-h3b-trigger-disconnect` | — | 32 | re-scope |
| `db-h3c-subgraph` | — | 32 | re-scope |
| `db-h4-alarm-close` | — | 32 | re-scope |
| `db-p3-a1-usercase-catalog-service` | — | 25 | re-scope |
| `db-p3-a2-runtime-validators` | — | 25 | re-scope |
| `db-p3-a3-competition-restrictions` | — | 25 | re-scope |
| `db-post-usercase-roadmap` | — | 28 | re-scope |
| `db-sf-0-canon` | — | 23 | re-scope |
| `db-sf-1-core-contracts` | — | 23 | re-scope |
| `db-sf-2-gateway-board` | — | 23 | re-scope |
| `db-sf-3-cabinet-lease-api` | — | 23 | re-scope |
| `db-sf-4-client-follower` | — | 23 | re-scope |
| `db-sf-5-board-flags-ui` | — | 23 | re-scope |
| `db-sf-6-nodes-runtime` | — | 23 | re-scope |
| `db-sf-7-last-track-preview` | — | 23 | re-scope |
| `db-sf-8-tests-smoke` | — | 23 | re-scope |
| `db-sf-9-docs-sync` | — | 23 | re-scope |
| `db3h-s2-cabinet-host` | — | 23 | re-scope |
| `db3h-s4-microphone-detectors` | — | 23 | re-scope |
| `db3h-s5-desktop-logging` | — | 23 | re-scope |
| `dbr-0-concept-core` | [#95](https://github.com/officefish/Membrana/issues/95) | 31 | re-scope |
| `dbr-1-fullscreen` | [#95](https://github.com/officefish/Membrana/issues/95) | 31 | re-scope |
| `dbr-2-variables` | [#95](https://github.com/officefish/Membrana/issues/95) | 31 | re-scope |
| `dbr-3-event-node` | [#95](https://github.com/officefish/Membrana/issues/95) | 31 | re-scope |
| `dbr-4-dataflow-resolve` | [#95](https://github.com/officefish/Membrana/issues/95) | 31 | re-scope |
| `dbr-5-palette-nodes` | [#95](https://github.com/officefish/Membrana/issues/95) | 31 | re-scope |
| `dbr-6-run-gating` | [#95](https://github.com/officefish/Membrana/issues/95) | 31 | re-scope |
| `deploy-pipeline-refactor` | [#94](https://github.com/officefish/Membrana/issues/94) | 31 | re-scope |
| `device-board-hackathon-1` | — | 32 | re-scope |
| `device-board-phase-3` | — | 25 | re-scope |
| `device-board-refactor-v04` | [#95](https://github.com/officefish/Membrana/issues/95) | 31 | re-scope |
| `device-board-server-first` | — | 23 | re-scope |
| `device-board-three-hosts-2026-06-26` | — | 23 | re-scope |
| `dpr-dr0-git-hygiene-gate` | [#94](https://github.com/officefish/Membrana/issues/94) | 31 | re-scope |
| `dpr-dr1-ci-gate` | [#94](https://github.com/officefish/Membrana/issues/94) | 31 | re-scope |
| `dpr-dr2-image-registry` | [#94](https://github.com/officefish/Membrana/issues/94) | 31 | re-scope |
| `dpr-dr3-rollback-runbook` | [#94](https://github.com/officefish/Membrana/issues/94) | 31 | re-scope |
| `dpr-dr4-smoke-suite` | [#94](https://github.com/officefish/Membrana/issues/94) | 31 | re-scope |
| `dpr-dr5-branch-migration-policy` | [#94](https://github.com/officefish/Membrana/issues/94) | 31 | re-scope |
| `dpr-dr6-client-delivery` | [#94](https://github.com/officefish/Membrana/issues/94) | 31 | re-scope |
| `dpr-dr7-zero-downtime` | [#94](https://github.com/officefish/Membrana/issues/94) | 31 | re-scope |
| `fv1-s2-closeout` | — | 18 | re-scope |
| `live-parallel-detection-sprint` | — | 33 | re-scope |
| `lp1-mic-drone-stream-modes` | — | 33 | re-scope |
| `lp1b-drone-detailed-report-server` | — | 33 | re-scope |
| `lp2-fft-plugins-journal-sink` | — | 33 | re-scope |
| `lp3-track-import-backpressure` | — | 33 | re-scope |
| `lp4-parallel-detection-smoke` | — | 33 | re-scope |
| `lp5-journal-report-renderers` | — | 33 | re-scope |
| `media-library-a3-mic-recorder` | — | 39 | re-scope |
| `media-library-a4-sample-player` | — | 39 | re-scope |
| `membrane-node-realtime-gateway` | [#92](https://github.com/officefish/Membrana/issues/92) | 32 | re-scope |
| `membrane-node-realtime-nr0-contract` | [#92](https://github.com/officefish/Membrana/issues/92) | 32 | re-scope |
| `membrane-node-realtime-nr1-gateway` | [#92](https://github.com/officefish/Membrana/issues/92) | 32 | re-scope |
| `membrane-node-realtime-nr2-journal-ws` | [#92](https://github.com/officefish/Membrana/issues/92) | 32 | re-scope |
| `membrane-node-realtime-nr3-client-journal` | [#92](https://github.com/officefish/Membrana/issues/92) | 32 | re-scope |
| `membrane-node-realtime-nr4-mic-live` | [#92](https://github.com/officefish/Membrana/issues/92) | 32 | re-scope |
| `membrane-node-realtime-nr5-cabinet-live` | [#92](https://github.com/officefish/Membrana/issues/92) | 32 | re-scope |
| `membrane-node-realtime-nr6-prod-hardening` | [#92](https://github.com/officefish/Membrana/issues/92) | 32 | re-scope |
| `membrane-node-runtime-remote` | — | 31 | re-scope |
| `mp7b-rt0-contract` | — | 31 | re-scope |
| `mp7b-rt1-gateway` | — | 31 | re-scope |
| `mp7b-rt2-client-runtime` | — | 31 | re-scope |
| `mp7b-rt3-mode` | — | 31 | re-scope |
| `mp7b-rt4-multinode-schema` | — | 31 | re-scope |
| `mp7b-rt5-cabinet-nodes` | — | 31 | re-scope |
| `mp7b-rt6-board-ux` | — | 31 | re-scope |
| `mp7b-rt7-prod-hardening` | — | 31 | re-scope |
| `nb-vlr-0-gate` | — | 16 | re-scope |
| `nb-vlr-1-labels-export-ui` | — | 16 | re-scope |
| `nb-vlr-2-labels-merge-script` | — | 16 | re-scope |
| `nb-vlr-3-library-label-filter` | — | 16 | re-scope |
| `nb-vlr-4-docs` | — | 16 | re-scope |
| `neural-free-tier-dataset-report` | — | 23 | re-scope |
| `neural-tier-1b-contract` | [#47](https://github.com/officefish/Membrana/issues/47) | 23 | re-scope |
| `oc-proxy-s0-research-isolation` | — | 24 | re-scope |
| `oc-proxy-s1-opencode-install` | — | 24 | re-scope |
| `oc-proxy-s2-freemodel-keys` | — | 24 | re-scope |
| `oc-proxy-s3-llm-proxy-script` | — | 24 | re-scope |
| `oc-proxy-s4-opencode-config` | — | 24 | re-scope |
| `opencode-proxy-sprint-2026-06-25` | — | 24 | re-scope |
| `pcb-d2-multinode` | — | 15 | re-scope |
| `rag-dual-circuit-v1` | — | 28 | re-scope |
| `rag-r6-closure` | — | 22 | re-scope |
| `rag-r7-optional` | — | 22 | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | 35 | re-scope |
| `sample-library-drone-detection` | [#47](https://github.com/officefish/Membrana/issues/47) | 34 | re-scope |
| `sca-manual-smoke` | — | 16 | re-scope |
| `single-node-detection-first` | [#47](https://github.com/officefish/Membrana/issues/47) | 64 | re-scope |
| `sld3-dsp-detectors-free-v1` | [#47](https://github.com/officefish/Membrana/issues/47) | 34 | re-scope |
| `sld4-stage-gate-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | 34 | re-scope |
| `studio-capture-adaptation` | — | 16 | re-scope |
| `trends-fft-template-editor` | [#57](https://github.com/officefish/Membrana/issues/57) | 38 | re-scope |
| `ucv2-0-spec-lgtm` | — | 26 | re-scope |
| `ucv2-1-graph-collapse` | — | 26 | re-scope |
| `ucv2-2-freeze-async-tracks` | — | 26 | re-scope |
| `ucv2-3-pack-verify` | — | 26 | re-scope |
| `ucv2-4-operator-signoff` | — | 26 | re-scope |
| `usercase-mvp-v2-groups-async` | — | 26 | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | 16 | re-scope |
| `vdr-hg3-trends-benchmark` | [#47](https://github.com/officefish/Membrana/issues/47) | 16 | re-scope |
| `vdr-hg4-hard-gate-report` | [#47](https://github.com/officefish/Membrana/issues/47) | 16 | re-scope |
| `vdr-label-roundtrip-night-build` | — | 16 | re-scope |
