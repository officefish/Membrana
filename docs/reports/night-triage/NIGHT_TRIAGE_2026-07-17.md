# Night Triage 2026-07-17

**Сводка:** ghost 6 · orphan 152 · stale 120.

> Производный артефакт (sink not source): рекомендации, не действия — исполняет человек. Порог stale 14 дн. Сгенерирован 2026-07-17T23:30:00.018Z.

## Обзор (LLM-нарратив)

> _Сгенерировано LLM поверх детерминированного среза (канал: claude); таблицы ниже — источник истины._

В глаза сразу бросается доминирование orphan-задач: их 152 против 6 ghost и 120 stale — это основной пласт технического долга реестра. Наиболее плотный ghost-кластер сосредоточен вокруг issue #47 (5 задач, включая neural-tier-1b-contract и real-dataset-live-calibration), тогда как #493 держит всего одну задачу (palette-clarity-nodes). Среди залежавшихся выделяется явный лидер — single-node-detection-first с 62 днями, заметно опережающий следующую группу в районе 36–37 дней, куда попадают преимущественно media-library и background-media задачи. Обращает внимание, что single-node-detection-first фигурирует и в ghost-кластере #47, и в топе stale, поэтому с неё логично начать разбор. Далее стоит посмотреть на связанный кластер media-library / background-media (a3–a5b), где несколько задач залежались синхронно и, вероятно, имеют общую причину.

## Ghost (6)

| id | issue | действие |
| --- | --- | --- |
| `neural-tier-1b-contract` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `palette-clarity-nodes` | [#493](https://github.com/officefish/Membrana/issues/493) | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `sample-library-drone-detection` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `single-node-detection-first` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |

## Orphan (152)

| id | действие |
| --- | --- |
| `agent-tooling-night-build` | relink |
| `cabinet-scenario-picker-system` | relink |
| `cg2-two-tier-test-gate` | relink |
| `cg3-flaky-metrics-week` | relink |
| `cg4-ci-testing-docs` | relink |
| `ci-gate-stabilization` | relink |
| `comp-packaging-catalog-2026-06-25` | relink |
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
| `dbr-0-concept-core` | relink |
| `dbr-1-fullscreen` | relink |
| `dbr-2-variables` | relink |
| `dbr-3-event-node` | relink |
| `dbr-4-dataflow-resolve` | relink |
| `dbr-5-palette-nodes` | relink |
| `dbr-6-run-gating` | relink |
| `detection-alarm-loop-refactor` | relink |
| `device-board-hackathon-1` | relink |
| `device-board-phase-3` | relink |
| `device-board-server-first` | relink |
| `device-board-three-hosts-2026-06-26` | relink |
| `dpr-dr0-git-hygiene-gate` | relink |
| `dpr-dr1-ci-gate` | relink |
| `dpr-dr2-image-registry` | relink |
| `dpr-dr3-rollback-runbook` | relink |
| `dpr-dr4-smoke-suite` | relink |
| `dpr-dr5-branch-migration-policy` | relink |
| `dpr-dr6-client-delivery` | relink |
| `dpr-dr7-zero-downtime` | relink |
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
| `membrana-device-build-profile` | relink |
| `membrane-node-realtime-nr0-contract` | relink |
| `membrane-node-realtime-nr1-gateway` | relink |
| `membrane-node-realtime-nr2-journal-ws` | relink |
| `membrane-node-realtime-nr3-client-journal` | relink |
| `membrane-node-realtime-nr4-mic-live` | relink |
| `membrane-node-realtime-nr5-cabinet-live` | relink |
| `membrane-node-realtime-nr6-prod-hardening` | relink |
| `membrane-node-runtime-remote` | relink |
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
| `root-domain-scenarios-docs` | relink |
| `rt-1-manifest-generator` | relink |
| `rt-10-review-precision-degradation` | relink |
| `rt-3-closure-integrity` | relink |
| `rt-4-closure-chain` | relink |
| `rt-5-pr-land` | relink |
| `rt-7-priorities-from-registry` | relink |
| `rt-9-code-review-freshness` | relink |
| `sca-manual-smoke` | relink |
| `sld3-dsp-detectors-free-v1` | relink |
| `sld4-stage-gate-calibration` | relink |
| `studio-capture-adaptation` | relink |
| `tech-debt-2026-07` | relink |
| `ucv2-0-spec-lgtm` | relink |
| `ucv2-1-graph-collapse` | relink |
| `ucv2-2-freeze-async-tracks` | relink |
| `ucv2-3-pack-verify` | relink |
| `ucv2-4-operator-signoff` | relink |
| `usercase-mvp-v2-groups-async` | relink |
| `vdr-hg3-trends-benchmark` | relink |
| `vdr-hg4-hard-gate-report` | relink |
| `vdr-label-roundtrip-night-build` | relink |

## Stale (120)

**Требует проверки (низкая уверенность)**

| id | issue | dwell (дн) | действие |
| --- | --- | --- | --- |
| `background-media-a5a-server` | [#58](https://github.com/officefish/Membrana/issues/58) | 36 | re-scope |
| `background-media-a5b-docker` | [#58](https://github.com/officefish/Membrana/issues/58) | 36 | re-scope |
| `background-media-a5c-deploy` | [#59](https://github.com/officefish/Membrana/issues/59) | 36 | re-scope |
| `background-media-v1` | [#58](https://github.com/officefish/Membrana/issues/58) | 36 | re-scope |
| `cg2-two-tier-test-gate` | — | 15 | re-scope |
| `cg3-flaky-metrics-week` | — | 15 | re-scope |
| `cg4-ci-testing-docs` | — | 15 | re-scope |
| `ci-gate-stabilization` | — | 15 | re-scope |
| `comp-packaging-catalog-2026-06-25` | — | 22 | re-scope |
| `db-ap-r1-core-contracts` | — | 22 | re-scope |
| `db-ap-r10-agenda-async-hub` | — | 22 | re-scope |
| `db-ap-r11-observability-tests` | — | 22 | re-scope |
| `db-ap-r12-docs-signoff` | — | 22 | re-scope |
| `db-ap-r2-core-sequence-latent` | — | 22 | re-scope |
| `db-ap-r3-async-job-store` | — | 22 | re-scope |
| `db-ap-r4-sequence-latent-runtime` | — | 22 | re-scope |
| `db-ap-r5-promise-nodes-editor` | — | 22 | re-scope |
| `db-ap-r6-promise-nodes-executor` | — | 22 | re-scope |
| `db-ap-r7-host-bridge-jobs` | — | 22 | re-scope |
| `db-ap-r8-detached-event-dispatch` | — | 22 | re-scope |
| `db-ap-r9-mvp-graph-v2` | — | 22 | re-scope |
| `db-doc-v04-mvp` | — | 28 | re-scope |
| `db-h1b-board-shell` | — | 30 | re-scope |
| `db-h1c-graph-serialize` | — | 30 | re-scope |
| `db-h2a-json-import` | — | 30 | re-scope |
| `db-h2b-scenario-runtime` | — | 30 | re-scope |
| `db-h2c-mic-journal` | — | 30 | re-scope |
| `db-h2d-cabinet-sync` | — | 30 | re-scope |
| `db-h3a-trigger-stop` | — | 30 | re-scope |
| `db-h3b-trigger-disconnect` | — | 30 | re-scope |
| `db-h3c-subgraph` | — | 30 | re-scope |
| `db-h4-alarm-close` | — | 30 | re-scope |
| `db-p3-a1-usercase-catalog-service` | — | 23 | re-scope |
| `db-p3-a2-runtime-validators` | — | 23 | re-scope |
| `db-p3-a3-competition-restrictions` | — | 23 | re-scope |
| `db-post-usercase-roadmap` | — | 26 | re-scope |
| `db-sf-0-canon` | — | 21 | re-scope |
| `db-sf-1-core-contracts` | — | 21 | re-scope |
| `db-sf-2-gateway-board` | — | 21 | re-scope |
| `db-sf-3-cabinet-lease-api` | — | 21 | re-scope |
| `db-sf-4-client-follower` | — | 21 | re-scope |
| `db-sf-5-board-flags-ui` | — | 21 | re-scope |
| `db-sf-6-nodes-runtime` | — | 21 | re-scope |
| `db-sf-7-last-track-preview` | — | 21 | re-scope |
| `db-sf-8-tests-smoke` | — | 21 | re-scope |
| `db-sf-9-docs-sync` | — | 21 | re-scope |
| `db3h-s2-cabinet-host` | — | 21 | re-scope |
| `db3h-s4-microphone-detectors` | — | 21 | re-scope |
| `db3h-s5-desktop-logging` | — | 21 | re-scope |
| `dbr-0-concept-core` | — | 29 | re-scope |
| `dbr-1-fullscreen` | — | 29 | re-scope |
| `dbr-2-variables` | — | 29 | re-scope |
| `dbr-3-event-node` | — | 29 | re-scope |
| `dbr-4-dataflow-resolve` | — | 29 | re-scope |
| `dbr-5-palette-nodes` | — | 29 | re-scope |
| `dbr-6-run-gating` | — | 29 | re-scope |
| `deploy-pipeline-refactor` | [#94](https://github.com/officefish/Membrana/issues/94) | 29 | re-scope |
| `device-board-hackathon-1` | — | 30 | re-scope |
| `device-board-phase-3` | — | 23 | re-scope |
| `device-board-refactor-v04` | [#95](https://github.com/officefish/Membrana/issues/95) | 29 | re-scope |
| `device-board-server-first` | — | 21 | re-scope |
| `device-board-three-hosts-2026-06-26` | — | 21 | re-scope |
| `dpr-dr0-git-hygiene-gate` | — | 29 | re-scope |
| `dpr-dr1-ci-gate` | — | 29 | re-scope |
| `dpr-dr2-image-registry` | — | 29 | re-scope |
| `dpr-dr3-rollback-runbook` | — | 29 | re-scope |
| `dpr-dr4-smoke-suite` | — | 29 | re-scope |
| `dpr-dr5-branch-migration-policy` | — | 29 | re-scope |
| `dpr-dr6-client-delivery` | — | 29 | re-scope |
| `dpr-dr7-zero-downtime` | — | 29 | re-scope |
| `fv1-s2-closeout` | — | 16 | re-scope |
| `live-parallel-detection-sprint` | — | 31 | re-scope |
| `lp1-mic-drone-stream-modes` | — | 31 | re-scope |
| `lp1b-drone-detailed-report-server` | — | 31 | re-scope |
| `lp2-fft-plugins-journal-sink` | — | 31 | re-scope |
| `lp3-track-import-backpressure` | — | 31 | re-scope |
| `lp4-parallel-detection-smoke` | — | 31 | re-scope |
| `lp5-journal-report-renderers` | — | 31 | re-scope |
| `media-library-a3-mic-recorder` | — | 37 | re-scope |
| `media-library-a4-sample-player` | — | 37 | re-scope |
| `membrane-node-realtime-gateway` | [#92](https://github.com/officefish/Membrana/issues/92) | 30 | re-scope |
| `membrane-node-realtime-nr0-contract` | — | 30 | re-scope |
| `membrane-node-realtime-nr1-gateway` | — | 30 | re-scope |
| `membrane-node-realtime-nr2-journal-ws` | — | 30 | re-scope |
| `membrane-node-realtime-nr3-client-journal` | — | 30 | re-scope |
| `membrane-node-realtime-nr4-mic-live` | — | 30 | re-scope |
| `membrane-node-realtime-nr5-cabinet-live` | — | 30 | re-scope |
| `membrane-node-realtime-nr6-prod-hardening` | — | 30 | re-scope |
| `membrane-node-runtime-remote` | — | 29 | re-scope |
| `mp7b-rt0-contract` | — | 29 | re-scope |
| `mp7b-rt1-gateway` | — | 29 | re-scope |
| `mp7b-rt2-client-runtime` | — | 29 | re-scope |
| `mp7b-rt3-mode` | — | 29 | re-scope |
| `mp7b-rt4-multinode-schema` | — | 29 | re-scope |
| `mp7b-rt5-cabinet-nodes` | — | 29 | re-scope |
| `mp7b-rt6-board-ux` | — | 29 | re-scope |
| `mp7b-rt7-prod-hardening` | — | 29 | re-scope |
| `neural-free-tier-dataset-report` | — | 21 | re-scope |
| `neural-tier-1b-contract` | [#47](https://github.com/officefish/Membrana/issues/47) | 21 | re-scope |
| `oc-proxy-s0-research-isolation` | — | 22 | re-scope |
| `oc-proxy-s1-opencode-install` | — | 22 | re-scope |
| `oc-proxy-s2-freemodel-keys` | — | 22 | re-scope |
| `oc-proxy-s3-llm-proxy-script` | — | 22 | re-scope |
| `oc-proxy-s4-opencode-config` | — | 22 | re-scope |
| `opencode-proxy-sprint-2026-06-25` | — | 22 | re-scope |
| `rag-dual-circuit-v1` | — | 26 | re-scope |
| `rag-r6-closure` | — | 20 | re-scope |
| `rag-r7-optional` | — | 20 | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | 33 | re-scope |
| `sample-library-drone-detection` | [#47](https://github.com/officefish/Membrana/issues/47) | 32 | re-scope |
| `single-node-detection-first` | [#47](https://github.com/officefish/Membrana/issues/47) | 62 | re-scope |
| `sld3-dsp-detectors-free-v1` | — | 32 | re-scope |
| `sld4-stage-gate-calibration` | — | 32 | re-scope |
| `trends-fft-template-editor` | [#57](https://github.com/officefish/Membrana/issues/57) | 36 | re-scope |
| `ucv2-0-spec-lgtm` | — | 24 | re-scope |
| `ucv2-1-graph-collapse` | — | 24 | re-scope |
| `ucv2-2-freeze-async-tracks` | — | 24 | re-scope |
| `ucv2-3-pack-verify` | — | 24 | re-scope |
| `ucv2-4-operator-signoff` | — | 24 | re-scope |
| `usercase-mvp-v2-groups-async` | — | 24 | re-scope |
