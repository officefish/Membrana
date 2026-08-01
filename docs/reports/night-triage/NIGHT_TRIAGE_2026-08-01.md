# Night Triage 2026-08-01

**Сводка:** ghost 5 · orphan 153 · stale 135.

> Производный артефакт (sink not source): рекомендации, не действия — исполняет человек. Порог stale 14 дн. Сгенерирован 2026-08-01T23:30:00.014Z.

## Обзор (LLM-нарратив)

> _Сгенерировано LLM поверх детерминированного среза (канал: claude); таблицы ниже — источник истины._

В срезе доминируют два масштабных кластера: 153 orphan-задачи и 135 stale (при пороге 14 дней) — именно они формируют основной объём технического долга, тогда как ghost-задач всего 5. Все 5 ghost сосредоточены вокруг одного issue #47 (neural-tier-1b-contract, real-dataset-live-calibration, vdr-hard-gate, vdr-hg3-trends-benchmark и др.), поэтому этот кластер логично разобрать первым как компактный и связный. Среди залежавшихся выделяется медиа-блок: media-library-a3-mic-recorder и media-library-a4-sample-player висят по 52 дня, за ними trends-fft-template-editor (51д), real-dataset-live-calibration (48д) и live-parallel-detection-sprint (46д). Стоит обратить внимание, что real-dataset-live-calibration попадает одновременно и в ghost-кластер #47, и в топ stale — это пересечение хороший кандидат для приоритетного разбора. Массив orphan (agent-tooling-*, angelina-*, cg2/cg3/cg4-* и другие) выглядит разнородным и потребует отдельной группировки, но рекомендации по нему уже назначены и остаются за исполнителем.

## Ghost (5)

| id | issue | действие |
| --- | --- | --- |
| `neural-tier-1b-contract` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg3-trends-benchmark` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg4-hard-gate-report` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |

## Orphan (153)

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
| `detection-alarm-loop-refactor` | relink |
| `detector-scoreboard` | relink |
| `device-board-hackathon-1` | relink |
| `device-board-phase-3` | relink |
| `device-board-server-first` | relink |
| `device-board-three-hosts-2026-06-26` | relink |
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
| `opencode-proxy-sprint-2026-06-25` | relink |
| `partner-tutorials` | relink |
| `pcb-d2-multinode` | relink |
| `precedent-container` | relink |
| `procedural-workshop` | relink |
| `product-landing` | relink |
| `pt-0-tutorial-template` | relink |
| `pt-1-read-facts-sheet` | relink |
| `pt-2-first-output-v01-endtoend` | relink |
| `pt-3-honest-tech-storytelling` | relink |
| `rag-dual-circuit-v1` | relink |
| `research-query-hygiene` | relink |
| `ritual-a-angelina-coordinator` | relink |
| `ritual-k-karkas` | relink |
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
| `studio-capture-adaptation` | relink |
| `swallow-delivery-idempotency` | relink |
| `team-accountability-metrics` | relink |
| `tech-debt-2026-07` | relink |
| `tests-container` | relink |
| `tooling-atlas` | relink |
| `tw-declared-verbs-honest-no` | relink |
| `ucv2-0-spec-lgtm` | relink |
| `ucv2-1-graph-collapse` | relink |
| `ucv2-2-freeze-async-tracks` | relink |
| `ucv2-3-pack-verify` | relink |
| `ucv2-4-operator-signoff` | relink |
| `usercase-mvp-v2-groups-async` | relink |
| `vdr-label-roundtrip-night-build` | relink |

## Stale (135)

**Требует проверки (низкая уверенность)**

| id | issue | dwell (дн) | действие |
| --- | --- | --- | --- |
| `agent-tooling-friction-3` | [#554](https://github.com/officefish/Membrana/issues/554) | 16 | re-scope |
| `agent-tooling-night-build` | — | 24 | re-scope |
| `ally-swallow-editorial-gate` | [#569](https://github.com/officefish/Membrana/issues/569) | 16 | re-scope |
| `batch-collection-run-contour` | [#494](https://github.com/officefish/Membrana/issues/494) | 17 | re-scope |
| `cabinet-scenario-picker-system` | — | 24 | re-scope |
| `cg2-two-tier-test-gate` | — | 30 | re-scope |
| `cg3-flaky-metrics-week` | — | 30 | re-scope |
| `cg4-ci-testing-docs` | — | 30 | re-scope |
| `ci-gate-stabilization` | — | 30 | re-scope |
| `comp-packaging-catalog-2026-06-25` | — | 37 | re-scope |
| `db-doc-v04-mvp` | — | 43 | re-scope |
| `db-h1b-board-shell` | — | 45 | re-scope |
| `db-h1c-graph-serialize` | — | 45 | re-scope |
| `db-h2a-json-import` | — | 45 | re-scope |
| `db-h2b-scenario-runtime` | — | 45 | re-scope |
| `db-h2c-mic-journal` | — | 45 | re-scope |
| `db-h2d-cabinet-sync` | — | 45 | re-scope |
| `db-h3a-trigger-stop` | — | 45 | re-scope |
| `db-h3b-trigger-disconnect` | — | 45 | re-scope |
| `db-h3c-subgraph` | — | 45 | re-scope |
| `db-h4-alarm-close` | — | 45 | re-scope |
| `db-p3-a1-usercase-catalog-service` | — | 38 | re-scope |
| `db-p3-a2-runtime-validators` | — | 38 | re-scope |
| `db-p3-a3-competition-restrictions` | — | 38 | re-scope |
| `db-post-usercase-roadmap` | — | 41 | re-scope |
| `db-sf-0-canon` | — | 36 | re-scope |
| `db-sf-1-core-contracts` | — | 36 | re-scope |
| `db-sf-2-gateway-board` | — | 36 | re-scope |
| `db-sf-3-cabinet-lease-api` | — | 36 | re-scope |
| `db-sf-4-client-follower` | — | 36 | re-scope |
| `db-sf-5-board-flags-ui` | — | 36 | re-scope |
| `db-sf-6-nodes-runtime` | — | 36 | re-scope |
| `db-sf-7-last-track-preview` | — | 36 | re-scope |
| `db-sf-8-tests-smoke` | — | 36 | re-scope |
| `db-sf-9-docs-sync` | — | 36 | re-scope |
| `db3h-s2-cabinet-host` | — | 36 | re-scope |
| `db3h-s4-microphone-detectors` | — | 36 | re-scope |
| `db3h-s5-desktop-logging` | — | 36 | re-scope |
| `detection-alarm-loop-refactor` | — | 21 | re-scope |
| `detector-metrics-characterization` | [#565](https://github.com/officefish/Membrana/issues/565) | 17 | re-scope |
| `device-board-hackathon-1` | — | 45 | re-scope |
| `device-board-phase-3` | — | 38 | re-scope |
| `device-board-server-first` | — | 36 | re-scope |
| `device-board-three-hosts-2026-06-26` | — | 36 | re-scope |
| `drift-anchor-contour` | [#396](https://github.com/officefish/Membrana/issues/396) | 20 | re-scope |
| `fv1-s2-closeout` | — | 31 | re-scope |
| `graphify-research-tree-panel-sections` | — | 16 | re-scope |
| `grp1-route-bridge-sections` | — | 16 | re-scope |
| `grp2-grants-owner-matrix` | — | 16 | re-scope |
| `grp3-research-tree-gated` | — | 16 | re-scope |
| `grp4-graphify-gated` | — | 16 | re-scope |
| `live-parallel-detection-sprint` | — | 46 | re-scope |
| `lp1-mic-drone-stream-modes` | — | 46 | re-scope |
| `lp1b-drone-detailed-report-server` | — | 46 | re-scope |
| `lp2-fft-plugins-journal-sink` | — | 46 | re-scope |
| `lp3-track-import-backpressure` | — | 46 | re-scope |
| `lp4-parallel-detection-smoke` | — | 46 | re-scope |
| `lp5-journal-report-renderers` | — | 46 | re-scope |
| `main-day-probe-gate` | [#533](https://github.com/officefish/Membrana/issues/533) | 16 | re-scope |
| `media-library-a3-mic-recorder` | — | 52 | re-scope |
| `media-library-a4-sample-player` | — | 52 | re-scope |
| `meeting-format` | — | 15 | re-scope |
| `membrana-device-build-profile` | — | 16 | re-scope |
| `membrane-node-runtime-remote` | — | 44 | re-scope |
| `mf1-format-carrier` | — | 15 | re-scope |
| `mf10-teeth-sm5` | — | 15 | re-scope |
| `mf2-branch-count` | — | 15 | re-scope |
| `mf3-commands-vs-flag` | — | 15 | re-scope |
| `mf4-teeth-sm2` | — | 15 | re-scope |
| `mf5-echo-rule` | — | 15 | re-scope |
| `mf6-auditor-worktree` | — | 15 | re-scope |
| `mf7-active-guard` | — | 15 | re-scope |
| `mf8-sprint-kind` | — | 15 | re-scope |
| `mf9-auditor-readonly` | — | 15 | re-scope |
| `mp7b-rt0-contract` | — | 44 | re-scope |
| `mp7b-rt1-gateway` | — | 44 | re-scope |
| `mp7b-rt2-client-runtime` | — | 44 | re-scope |
| `mp7b-rt3-mode` | — | 44 | re-scope |
| `mp7b-rt4-multinode-schema` | — | 44 | re-scope |
| `mp7b-rt5-cabinet-nodes` | — | 44 | re-scope |
| `mp7b-rt6-board-ux` | — | 44 | re-scope |
| `mp7b-rt7-prod-hardening` | — | 44 | re-scope |
| `nb-at-0-gate` | — | 24 | re-scope |
| `nb-at-1-gitignore-review` | — | 24 | re-scope |
| `nb-at-2-pr-ship` | — | 24 | re-scope |
| `nb-at-3-build-affected` | — | 24 | re-scope |
| `nb-at-4-verify-wire-sync` | — | 24 | re-scope |
| `nb-at-6-helpers` | — | 24 | re-scope |
| `nb-at-8-docs-skills` | — | 24 | re-scope |
| `nb-vlr-0-gate` | — | 29 | re-scope |
| `nb-vlr-1-labels-export-ui` | — | 29 | re-scope |
| `nb-vlr-2-labels-merge-script` | — | 29 | re-scope |
| `nb-vlr-3-library-label-filter` | — | 29 | re-scope |
| `nb-vlr-4-docs` | — | 29 | re-scope |
| `neural-free-tier-dataset-report` | — | 36 | re-scope |
| `neural-tier-1b-contract` | [#47](https://github.com/officefish/Membrana/issues/47) | 36 | re-scope |
| `oc-proxy-s0-research-isolation` | — | 37 | re-scope |
| `oc-proxy-s1-opencode-install` | — | 37 | re-scope |
| `oc-proxy-s2-freemodel-keys` | — | 37 | re-scope |
| `oc-proxy-s3-llm-proxy-script` | — | 37 | re-scope |
| `oc-proxy-s4-opencode-config` | — | 37 | re-scope |
| `opencode-proxy-sprint-2026-06-25` | — | 37 | re-scope |
| `partner-tutorials` | — | 26 | re-scope |
| `pcb-d2-multinode` | — | 28 | re-scope |
| `product-landing` | — | 17 | re-scope |
| `pt-0-tutorial-template` | — | 26 | re-scope |
| `pt-1-read-facts-sheet` | — | 26 | re-scope |
| `pt-2-first-output-v01-endtoend` | — | 26 | re-scope |
| `pt-3-honest-tech-storytelling` | — | 26 | re-scope |
| `rag-dual-circuit-v1` | — | 41 | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | 48 | re-scope |
| `ritual-trust-contour` | [#539](https://github.com/officefish/Membrana/issues/539) | 16 | re-scope |
| `root-domain-scenarios-docs` | — | 17 | re-scope |
| `rt-1-manifest-generator` | — | 16 | re-scope |
| `rt-2-session-extracts` | [#537](https://github.com/officefish/Membrana/issues/537) | 16 | re-scope |
| `rt-3-closure-integrity` | — | 16 | re-scope |
| `rt-4-closure-chain` | — | 16 | re-scope |
| `rt-5-pr-land` | — | 16 | re-scope |
| `rt-7-priorities-from-registry` | — | 16 | re-scope |
| `sca-manual-smoke` | — | 29 | re-scope |
| `strategy-day-generator` | [#592](https://github.com/officefish/Membrana/issues/592) | 15 | re-scope |
| `studio-capture-adaptation` | — | 29 | re-scope |
| `tech-debt-2026-07` | — | 24 | re-scope |
| `trends-fft-template-editor` | [#57](https://github.com/officefish/Membrana/issues/57) | 51 | re-scope |
| `truth-graph-contour` | [#576](https://github.com/officefish/Membrana/issues/576) | 15 | re-scope |
| `ucv2-0-spec-lgtm` | — | 39 | re-scope |
| `ucv2-1-graph-collapse` | — | 39 | re-scope |
| `ucv2-2-freeze-async-tracks` | — | 39 | re-scope |
| `ucv2-3-pack-verify` | — | 39 | re-scope |
| `ucv2-4-operator-signoff` | — | 39 | re-scope |
| `usercase-mvp-v2-groups-async` | — | 39 | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | 29 | re-scope |
| `vdr-hg3-trends-benchmark` | [#47](https://github.com/officefish/Membrana/issues/47) | 29 | re-scope |
| `vdr-hg4-hard-gate-report` | [#47](https://github.com/officefish/Membrana/issues/47) | 29 | re-scope |
| `vdr-label-roundtrip-night-build` | — | 29 | re-scope |
