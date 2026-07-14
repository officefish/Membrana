# Night Triage 2026-07-13

**Сводка:** ghost 9 · orphan 111 · stale 115.

> Производный артефакт (sink not source): рекомендации, не действия — исполняет человек. Порог stale 14 дн. Сгенерирован 2026-07-13T23:30:00.013Z.

## Обзор (LLM-нарратив)

> _Сгенерировано LLM поверх детерминированного среза (канал: claude); таблицы ниже — источник истины._

Ночной триаж выявил серьёзный перекос в сторону orphan (111) и stale (115) задач, тогда как ghost составляют лишь 9. Всё ghost-множество сконцентрировано в одном кластере вокруг issue #47 (9 задач, включая neural-tier-1b-contract, real-dataset-live-calibration, sample-library-drone-detection и single-node-detection-first) — это очевидная точка для первого разбора. Отдельного внимания заслуживает single-node-detection-first: она одновременно возглавляет список самых залежавшихся stale-задач (58 дней) и фигурирует в ghost-кластере #47, что делает её приоритетной. Среди stale заметен ещё один кластер вокруг медиа-библиотеки и фоновых медиа (media-library-a3-mic-recorder и a4-sample-player по 33 дня, background-media-a5a-server и a5b-docker по 32 дня), который стоит разбирать группой. Массив orphan из 111 задач выглядит наиболее разнородным (от agent-tooling-night-build до db-ap-r1-core-contracts) и потребует отдельного прохода по связям.

## Ghost (9)

| id | issue | действие |
| --- | --- | --- |
| `neural-tier-1b-contract` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `sample-library-drone-detection` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `single-node-detection-first` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `sld3-dsp-detectors-free-v1` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `sld4-stage-gate-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg3-trends-benchmark` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg4-hard-gate-report` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |

## Orphan (111)

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
| `detection-alarm-loop-refactor` | relink |
| `device-board-hackathon-1` | relink |
| `device-board-phase-3` | relink |
| `device-board-server-first` | relink |
| `device-board-three-hosts-2026-06-26` | relink |
| `fv1-s2-closeout` | relink |
| `live-parallel-detection-sprint` | relink |
| `lp1-mic-drone-stream-modes` | relink |
| `lp1b-drone-detailed-report-server` | relink |
| `lp2-fft-plugins-journal-sink` | relink |
| `lp3-track-import-backpressure` | relink |
| `lp4-parallel-detection-smoke` | relink |
| `lp5-journal-report-renderers` | relink |
| `media-library-a3-mic-recorder` | relink |
| `media-library-a4-sample-player` | relink |
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
| `pt-0-tutorial-template` | relink |
| `pt-1-read-facts-sheet` | relink |
| `pt-2-first-output-v01-endtoend` | relink |
| `pt-3-honest-tech-storytelling` | relink |
| `rag-dual-circuit-v1` | relink |
| `rag-r6-closure` | relink |
| `rag-r7-optional` | relink |
| `sca-manual-smoke` | relink |
| `studio-capture-adaptation` | relink |
| `tech-debt-2026-07` | relink |
| `ucv2-0-spec-lgtm` | relink |
| `ucv2-1-graph-collapse` | relink |
| `ucv2-2-freeze-async-tracks` | relink |
| `ucv2-3-pack-verify` | relink |
| `ucv2-4-operator-signoff` | relink |
| `usercase-mvp-v2-groups-async` | relink |
| `vdr-label-roundtrip-night-build` | relink |

## Stale (115)

**Требует проверки (низкая уверенность)**

| id | issue | dwell (дн) | действие |
| --- | --- | --- | --- |
| `background-media-a5a-server` | [#58](https://github.com/officefish/Membrana/issues/58) | 32 | re-scope |
| `background-media-a5b-docker` | [#58](https://github.com/officefish/Membrana/issues/58) | 32 | re-scope |
| `background-media-a5c-deploy` | [#59](https://github.com/officefish/Membrana/issues/59) | 32 | re-scope |
| `background-media-v1` | [#58](https://github.com/officefish/Membrana/issues/58) | 32 | re-scope |
| `comp-packaging-catalog-2026-06-25` | — | 18 | re-scope |
| `db-ap-r1-core-contracts` | — | 18 | re-scope |
| `db-ap-r10-agenda-async-hub` | — | 18 | re-scope |
| `db-ap-r11-observability-tests` | — | 18 | re-scope |
| `db-ap-r12-docs-signoff` | — | 18 | re-scope |
| `db-ap-r2-core-sequence-latent` | — | 18 | re-scope |
| `db-ap-r3-async-job-store` | — | 18 | re-scope |
| `db-ap-r4-sequence-latent-runtime` | — | 18 | re-scope |
| `db-ap-r5-promise-nodes-editor` | — | 18 | re-scope |
| `db-ap-r6-promise-nodes-executor` | — | 18 | re-scope |
| `db-ap-r7-host-bridge-jobs` | — | 18 | re-scope |
| `db-ap-r8-detached-event-dispatch` | — | 18 | re-scope |
| `db-ap-r9-mvp-graph-v2` | — | 18 | re-scope |
| `db-doc-v04-mvp` | — | 24 | re-scope |
| `db-h1b-board-shell` | — | 26 | re-scope |
| `db-h1c-graph-serialize` | — | 26 | re-scope |
| `db-h2a-json-import` | — | 26 | re-scope |
| `db-h2b-scenario-runtime` | — | 26 | re-scope |
| `db-h2c-mic-journal` | — | 26 | re-scope |
| `db-h2d-cabinet-sync` | — | 26 | re-scope |
| `db-h3a-trigger-stop` | — | 26 | re-scope |
| `db-h3b-trigger-disconnect` | — | 26 | re-scope |
| `db-h3c-subgraph` | — | 26 | re-scope |
| `db-h4-alarm-close` | — | 26 | re-scope |
| `db-p3-a1-usercase-catalog-service` | — | 19 | re-scope |
| `db-p3-a2-runtime-validators` | — | 19 | re-scope |
| `db-p3-a3-competition-restrictions` | — | 19 | re-scope |
| `db-post-usercase-roadmap` | — | 22 | re-scope |
| `db-sf-0-canon` | — | 17 | re-scope |
| `db-sf-1-core-contracts` | — | 17 | re-scope |
| `db-sf-2-gateway-board` | — | 17 | re-scope |
| `db-sf-3-cabinet-lease-api` | — | 17 | re-scope |
| `db-sf-4-client-follower` | — | 17 | re-scope |
| `db-sf-5-board-flags-ui` | — | 17 | re-scope |
| `db-sf-6-nodes-runtime` | — | 17 | re-scope |
| `db-sf-7-last-track-preview` | — | 17 | re-scope |
| `db-sf-8-tests-smoke` | — | 17 | re-scope |
| `db-sf-9-docs-sync` | — | 17 | re-scope |
| `db3h-s2-cabinet-host` | — | 17 | re-scope |
| `db3h-s4-microphone-detectors` | — | 17 | re-scope |
| `db3h-s5-desktop-logging` | — | 17 | re-scope |
| `dbr-0-concept-core` | [#95](https://github.com/officefish/Membrana/issues/95) | 25 | re-scope |
| `dbr-1-fullscreen` | [#95](https://github.com/officefish/Membrana/issues/95) | 25 | re-scope |
| `dbr-2-variables` | [#95](https://github.com/officefish/Membrana/issues/95) | 25 | re-scope |
| `dbr-3-event-node` | [#95](https://github.com/officefish/Membrana/issues/95) | 25 | re-scope |
| `dbr-4-dataflow-resolve` | [#95](https://github.com/officefish/Membrana/issues/95) | 25 | re-scope |
| `dbr-5-palette-nodes` | [#95](https://github.com/officefish/Membrana/issues/95) | 25 | re-scope |
| `dbr-6-run-gating` | [#95](https://github.com/officefish/Membrana/issues/95) | 25 | re-scope |
| `deploy-pipeline-refactor` | [#94](https://github.com/officefish/Membrana/issues/94) | 25 | re-scope |
| `device-board-hackathon-1` | — | 26 | re-scope |
| `device-board-phase-3` | — | 19 | re-scope |
| `device-board-refactor-v04` | [#95](https://github.com/officefish/Membrana/issues/95) | 25 | re-scope |
| `device-board-server-first` | — | 17 | re-scope |
| `device-board-three-hosts-2026-06-26` | — | 17 | re-scope |
| `dpr-dr0-git-hygiene-gate` | [#94](https://github.com/officefish/Membrana/issues/94) | 25 | re-scope |
| `dpr-dr1-ci-gate` | [#94](https://github.com/officefish/Membrana/issues/94) | 25 | re-scope |
| `dpr-dr2-image-registry` | [#94](https://github.com/officefish/Membrana/issues/94) | 25 | re-scope |
| `dpr-dr3-rollback-runbook` | [#94](https://github.com/officefish/Membrana/issues/94) | 25 | re-scope |
| `dpr-dr4-smoke-suite` | [#94](https://github.com/officefish/Membrana/issues/94) | 25 | re-scope |
| `dpr-dr5-branch-migration-policy` | [#94](https://github.com/officefish/Membrana/issues/94) | 25 | re-scope |
| `dpr-dr6-client-delivery` | [#94](https://github.com/officefish/Membrana/issues/94) | 25 | re-scope |
| `dpr-dr7-zero-downtime` | [#94](https://github.com/officefish/Membrana/issues/94) | 25 | re-scope |
| `live-parallel-detection-sprint` | — | 27 | re-scope |
| `lp1-mic-drone-stream-modes` | — | 27 | re-scope |
| `lp1b-drone-detailed-report-server` | — | 27 | re-scope |
| `lp2-fft-plugins-journal-sink` | — | 27 | re-scope |
| `lp3-track-import-backpressure` | — | 27 | re-scope |
| `lp4-parallel-detection-smoke` | — | 27 | re-scope |
| `lp5-journal-report-renderers` | — | 27 | re-scope |
| `media-library-a3-mic-recorder` | — | 33 | re-scope |
| `media-library-a4-sample-player` | — | 33 | re-scope |
| `membrane-node-realtime-gateway` | [#92](https://github.com/officefish/Membrana/issues/92) | 26 | re-scope |
| `membrane-node-realtime-nr0-contract` | [#92](https://github.com/officefish/Membrana/issues/92) | 26 | re-scope |
| `membrane-node-realtime-nr1-gateway` | [#92](https://github.com/officefish/Membrana/issues/92) | 26 | re-scope |
| `membrane-node-realtime-nr2-journal-ws` | [#92](https://github.com/officefish/Membrana/issues/92) | 26 | re-scope |
| `membrane-node-realtime-nr3-client-journal` | [#92](https://github.com/officefish/Membrana/issues/92) | 26 | re-scope |
| `membrane-node-realtime-nr4-mic-live` | [#92](https://github.com/officefish/Membrana/issues/92) | 26 | re-scope |
| `membrane-node-realtime-nr5-cabinet-live` | [#92](https://github.com/officefish/Membrana/issues/92) | 26 | re-scope |
| `membrane-node-realtime-nr6-prod-hardening` | [#92](https://github.com/officefish/Membrana/issues/92) | 26 | re-scope |
| `membrane-node-runtime-remote` | — | 25 | re-scope |
| `mp7b-rt0-contract` | — | 25 | re-scope |
| `mp7b-rt1-gateway` | — | 25 | re-scope |
| `mp7b-rt2-client-runtime` | — | 25 | re-scope |
| `mp7b-rt3-mode` | — | 25 | re-scope |
| `mp7b-rt4-multinode-schema` | — | 25 | re-scope |
| `mp7b-rt5-cabinet-nodes` | — | 25 | re-scope |
| `mp7b-rt6-board-ux` | — | 25 | re-scope |
| `mp7b-rt7-prod-hardening` | — | 25 | re-scope |
| `neural-free-tier-dataset-report` | — | 17 | re-scope |
| `neural-tier-1b-contract` | [#47](https://github.com/officefish/Membrana/issues/47) | 17 | re-scope |
| `oc-proxy-s0-research-isolation` | — | 18 | re-scope |
| `oc-proxy-s1-opencode-install` | — | 18 | re-scope |
| `oc-proxy-s2-freemodel-keys` | — | 18 | re-scope |
| `oc-proxy-s3-llm-proxy-script` | — | 18 | re-scope |
| `oc-proxy-s4-opencode-config` | — | 18 | re-scope |
| `opencode-proxy-sprint-2026-06-25` | — | 18 | re-scope |
| `rag-dual-circuit-v1` | — | 22 | re-scope |
| `rag-r6-closure` | — | 16 | re-scope |
| `rag-r7-optional` | — | 16 | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | 29 | re-scope |
| `sample-library-drone-detection` | [#47](https://github.com/officefish/Membrana/issues/47) | 28 | re-scope |
| `single-node-detection-first` | [#47](https://github.com/officefish/Membrana/issues/47) | 58 | re-scope |
| `sld3-dsp-detectors-free-v1` | [#47](https://github.com/officefish/Membrana/issues/47) | 28 | re-scope |
| `sld4-stage-gate-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | 28 | re-scope |
| `trends-fft-template-editor` | [#57](https://github.com/officefish/Membrana/issues/57) | 32 | re-scope |
| `ucv2-0-spec-lgtm` | — | 20 | re-scope |
| `ucv2-1-graph-collapse` | — | 20 | re-scope |
| `ucv2-2-freeze-async-tracks` | — | 20 | re-scope |
| `ucv2-3-pack-verify` | — | 20 | re-scope |
| `ucv2-4-operator-signoff` | — | 20 | re-scope |
| `usercase-mvp-v2-groups-async` | — | 20 | re-scope |
