# Night Triage 2026-08-10

**Сводка:** ghost 4 · orphan 104 · stale 117.

> Производный артефакт (sink not source): рекомендации, не действия — исполняет человек. Порог stale 14 дн. Сгенерирован 2026-08-10T23:30:00.002Z.

## Обзор (LLM-нарратив)

> _Сгенерировано LLM поверх детерминированного среза (канал: claude); таблицы ниже — источник истины._

Основной массив технического долга приходится на orphan-задачи — их 104, что на порядок больше остальных категорий и требует первоочередного внимания при разборе связей. Отдельно бросается в глаза плотный ghost-кластер вокруг issue #47: все 4 ghost-задачи (real-dataset-live-calibration, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report) завязаны на один issue, что удобно разобрать единым заходом. Показательно, что real-dataset-live-calibration одновременно и в ghost-кластере #47, и лидирует по залежалости среди stale (57 дней), — с неё логично начать. Заметен также застоявшийся кластер вокруг инфраструктуры и прокси: membrane-node-runtime-remote и mp7b-rt7-prod-hardening (по 53 дня), а также пара oc-proxy-s1-opencode-install и oc-proxy-s2-freemodel-keys (по 46 дней). При 117 stale-задачах на пороге в 14 дней очевидно, что накопление идёт давно, поэтому первый взгляд стоит направить на пересечение ghost и самых старых stale.

## Ghost (4)

| id | issue | действие |
| --- | --- | --- |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg3-trends-benchmark` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg4-hard-gate-report` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |

## Orphan (104)

| id | действие |
| --- | --- |
| `agent-tooling-friction-6` | relink |
| `angelina-hostess-impl` | relink |
| `angelina-orchestrator-prompt` | relink |
| `code-review-lead-refactor` | relink |
| `corpus-track-acceptance-predicate` | relink |
| `dads-benchmark-bridge` | relink |
| `db3h-s4-microphone-detectors` | relink |
| `deploy-procedure-survey` | relink |
| `deps-watch-disappearance-named` | relink |
| `detection-alarm-loop-refactor` | relink |
| `detector-scoreboard` | relink |
| `detectors-judge-whole-record` | relink |
| `detectors-window-single-carrier` | relink |
| `device-board-three-hosts-2026-06-26` | relink |
| `evening-chain-review-predicate` | relink |
| `frame-rails-2307` | relink |
| `generated-docs-quality-criteria` | relink |
| `graphify-research-tree-panel-sections` | relink |
| `grp1-route-bridge-sections` | relink |
| `grp2-grants-owner-matrix` | relink |
| `grp3-research-tree-gated` | relink |
| `grp4-graphify-gated` | relink |
| `insight-mandate-for-new` | relink |
| `insight-review-from-file` | relink |
| `leveling-snapshot-out-path` | relink |
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
| `morning-gates-two-moments` | relink |
| `mp7b-rt7-prod-hardening` | relink |
| `neural-free-tier-dataset-report` | relink |
| `night-build-format-v2` | relink |
| `notes-regex-cyrillic-translit` | relink |
| `oc-proxy-s1-opencode-install` | relink |
| `oc-proxy-s2-freemodel-keys` | relink |
| `oc-proxy-s3-llm-proxy-script` | relink |
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
| `static-mmbrn-container` | relink |
| `static-mmbrn-cutover` | relink |
| `static-mmbrn-disposition-ledger` | relink |
| `static-mmbrn-ingress-auth` | relink |
| `static-mmbrn-live-inventory` | relink |
| `static-mmbrn-live-services` | relink |
| `static-mmbrn-m6-alignment` | relink |
| `static-mmbrn-rehydrate-parity` | relink |
| `static-mmbrn-retirement` | relink |
| `static-mmbrn-target-provision` | relink |
| `studio-capture-adaptation` | relink |
| `swallow-delivery-idempotency` | relink |
| `swallow-own-moment` | relink |
| `team-accountability-metrics` | relink |
| `tests-container` | relink |
| `tooling-atlas` | relink |
| `tooling-truth-orphans-diagnosis` | relink |
| `tw-declared-verbs-honest-no` | relink |
| `workflow-examples-marathon` | relink |

## Stale (117)

**Требует проверки (низкая уверенность)**

| id | issue | dwell (дн) | действие |
| --- | --- | --- | --- |
| `adr-procedure-legalize` | [#1296](https://github.com/officefish/Membrana/issues/1296) | 15 | re-scope |
| `agent-tooling-friction-3` | [#554](https://github.com/officefish/Membrana/issues/554) | 25 | re-scope |
| `agent-tooling-friction-6` | — | 15 | re-scope |
| `ally-swallow-editorial-gate` | [#569](https://github.com/officefish/Membrana/issues/569) | 25 | re-scope |
| `angelina-codex-no-repo-writes` | [#922](https://github.com/officefish/Membrana/issues/922) | 19 | re-scope |
| `angelina-hostess-impl` | — | 20 | re-scope |
| `angelina-orchestrator-prompt` | — | 22 | re-scope |
| `assets-container` | [#959](https://github.com/officefish/Membrana/issues/959) | 19 | re-scope |
| `batch-collection-run-contour` | [#494](https://github.com/officefish/Membrana/issues/494) | 26 | re-scope |
| `bridge-room` | [#936](https://github.com/officefish/Membrana/issues/936) | 19 | re-scope |
| `cascade-honest-manual` | [#999](https://github.com/officefish/Membrana/issues/999) | 18 | re-scope |
| `code-review-lead-refactor` | — | 20 | re-scope |
| `dads-benchmark-bridge` | — | 23 | re-scope |
| `db3h-s4-microphone-detectors` | — | 45 | re-scope |
| `detection-alarm-loop-refactor` | — | 30 | re-scope |
| `detector-metrics-characterization` | [#565](https://github.com/officefish/Membrana/issues/565) | 26 | re-scope |
| `detector-scoreboard` | — | 23 | re-scope |
| `device-board-three-hosts-2026-06-26` | — | 45 | re-scope |
| `dreams-deploy-office` | [#997](https://github.com/officefish/Membrana/issues/997) | 18 | re-scope |
| `drift-anchor-contour` | [#396](https://github.com/officefish/Membrana/issues/396) | 29 | re-scope |
| `frame-rails-2307` | — | 18 | re-scope |
| `frames-alive-dynin` | [#980](https://github.com/officefish/Membrana/issues/980) | 19 | re-scope |
| `frames-alive-ozhegov` | [#979](https://github.com/officefish/Membrana/issues/979) | 19 | re-scope |
| `frames-alive-rodchenko` | [#981](https://github.com/officefish/Membrana/issues/981) | 19 | re-scope |
| `friction6-hygiene-notes` | [#1265](https://github.com/officefish/Membrana/issues/1265) | 15 | re-scope |
| `friction6-scripts-lint` | [#1264](https://github.com/officefish/Membrana/issues/1264) | 15 | re-scope |
| `friction6-secret-inventory` | [#1266](https://github.com/officefish/Membrana/issues/1266) | 15 | re-scope |
| `friction6-test-scripts-groups` | [#1263](https://github.com/officefish/Membrana/issues/1263) | 15 | re-scope |
| `generated-docs-quality-criteria` | — | 22 | re-scope |
| `graphify-research-tree-panel-sections` | — | 25 | re-scope |
| `grp1-route-bridge-sections` | — | 25 | re-scope |
| `grp2-grants-owner-matrix` | — | 25 | re-scope |
| `grp3-research-tree-gated` | — | 25 | re-scope |
| `grp4-graphify-gated` | — | 25 | re-scope |
| `insight-mandate-for-new` | — | 15 | re-scope |
| `insight-review-from-file` | — | 15 | re-scope |
| `leveling-snapshot-out-path` | — | 15 | re-scope |
| `linear-hygiene-dreams-providers-night` | — | 21 | re-scope |
| `llm-procedure-channels` | [#1007](https://github.com/officefish/Membrana/issues/1007) | 18 | re-scope |
| `lpc-a-lib` | [#1008](https://github.com/officefish/Membrana/issues/1008) | 18 | re-scope |
| `lpc-b-wire` | [#1009](https://github.com/officefish/Membrana/issues/1009) | 18 | re-scope |
| `lpc-c-office` | [#1010](https://github.com/officefish/Membrana/issues/1010) | 18 | re-scope |
| `lpc-d-panel` | [#1011](https://github.com/officefish/Membrana/issues/1011) | 18 | re-scope |
| `main-day-probe-gate` | [#533](https://github.com/officefish/Membrana/issues/533) | 25 | re-scope |
| `meeting-format` | — | 24 | re-scope |
| `meeting-registry-relocation` | — | 22 | re-scope |
| `meeting-team-execution-contour` | — | 22 | re-scope |
| `membrana-device-build-profile` | — | 25 | re-scope |
| `membrane-node-runtime-remote` | — | 53 | re-scope |
| `mf1-format-carrier` | — | 24 | re-scope |
| `mf10-teeth-sm5` | — | 24 | re-scope |
| `mf2-branch-count` | — | 24 | re-scope |
| `mf3-commands-vs-flag` | — | 24 | re-scope |
| `mf4-teeth-sm2` | — | 24 | re-scope |
| `mf5-echo-rule` | — | 24 | re-scope |
| `mf6-auditor-worktree` | — | 24 | re-scope |
| `mf7-active-guard` | — | 24 | re-scope |
| `mf8-sprint-kind` | — | 24 | re-scope |
| `mf9-auditor-readonly` | — | 24 | re-scope |
| `morning-report-completion` | [#788](https://github.com/officefish/Membrana/issues/788) | 20 | re-scope |
| `morning-ritual-regulation` | [#605](https://github.com/officefish/Membrana/issues/605) | 23 | re-scope |
| `mp7b-rt7-prod-hardening` | — | 53 | re-scope |
| `neural-free-tier-dataset-report` | — | 45 | re-scope |
| `night-build-format-v2` | — | 23 | re-scope |
| `notes-regex-cyrillic-translit` | — | 15 | re-scope |
| `oc-proxy-s1-opencode-install` | — | 46 | re-scope |
| `oc-proxy-s2-freemodel-keys` | — | 46 | re-scope |
| `oc-proxy-s3-llm-proxy-script` | — | 46 | re-scope |
| `office-stability-emergency` | [#933](https://github.com/officefish/Membrana/issues/933) | 19 | re-scope |
| `opencode-proxy-sprint-2026-06-25` | — | 46 | re-scope |
| `partner-tutorials` | — | 35 | re-scope |
| `pcb-d2-multinode` | — | 37 | re-scope |
| `precedent-container` | — | 19 | re-scope |
| `procedural-layer-impl` | [#781](https://github.com/officefish/Membrana/issues/781) | 20 | re-scope |
| `procedural-workshop` | — | 19 | re-scope |
| `product-landing` | — | 26 | re-scope |
| `pt-0-tutorial-template` | — | 35 | re-scope |
| `pt-1-read-facts-sheet` | — | 35 | re-scope |
| `pt-2-first-output-v01-endtoend` | — | 35 | re-scope |
| `pt-3-honest-tech-storytelling` | — | 35 | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | 57 | re-scope |
| `research-query-hygiene` | — | 23 | re-scope |
| `ritual-a-angelina-coordinator` | — | 21 | re-scope |
| `ritual-k-karkas` | — | 21 | re-scope |
| `ritual-r-report` | — | 21 | re-scope |
| `ritual-s-standup` | — | 21 | re-scope |
| `ritual-trust-contour` | [#539](https://github.com/officefish/Membrana/issues/539) | 25 | re-scope |
| `root-domain-scenarios-docs` | — | 26 | re-scope |
| `rt-1-manifest-generator` | — | 25 | re-scope |
| `rt-2-session-extracts` | [#537](https://github.com/officefish/Membrana/issues/537) | 25 | re-scope |
| `rt-3-closure-integrity` | — | 25 | re-scope |
| `rt-4-closure-chain` | — | 25 | re-scope |
| `rt-5-pr-land` | — | 25 | re-scope |
| `rt-7-priorities-from-registry` | — | 25 | re-scope |
| `sca-manual-smoke` | — | 38 | re-scope |
| `scoreboard-dataset-ladder` | — | 23 | re-scope |
| `scoreboard-neural-ladder` | — | 23 | re-scope |
| `scoreboard-panel-publish` | — | 23 | re-scope |
| `send-gate-on-path` | [#1233](https://github.com/officefish/Membrana/issues/1233) | 15 | re-scope |
| `ship-automerge-predicate` | — | 15 | re-scope |
| `strategy-day-generator` | [#592](https://github.com/officefish/Membrana/issues/592) | 24 | re-scope |
| `studio-capture-adaptation` | — | 38 | re-scope |
| `swallow-delivery-idempotency` | — | 23 | re-scope |
| `swallow-format-frame-fix` | [#918](https://github.com/officefish/Membrana/issues/918) | 19 | re-scope |
| `tc-home-workshop` | [#1291](https://github.com/officefish/Membrana/issues/1291) | 15 | re-scope |
| `tc-nightly-frame` | [#1293](https://github.com/officefish/Membrana/issues/1293) | 15 | re-scope |
| `tc-setups-selector` | [#1292](https://github.com/officefish/Membrana/issues/1292) | 15 | re-scope |
| `team-accountability-metrics` | — | 22 | re-scope |
| `tests-container` | — | 15 | re-scope |
| `tooling-atlas` | — | 19 | re-scope |
| `tooling-friction-2607` | [#1272](https://github.com/officefish/Membrana/issues/1272) | 15 | re-scope |
| `truth-graph-contour` | [#576](https://github.com/officefish/Membrana/issues/576) | 24 | re-scope |
| `tw-declared-verbs-honest-no` | — | 15 | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | 38 | re-scope |
| `vdr-hg3-trends-benchmark` | [#47](https://github.com/officefish/Membrana/issues/47) | 38 | re-scope |
| `vdr-hg4-hard-gate-report` | [#47](https://github.com/officefish/Membrana/issues/47) | 38 | re-scope |
| `worktree-hygiene-epic` | [#1232](https://github.com/officefish/Membrana/issues/1232) | 15 | re-scope |
