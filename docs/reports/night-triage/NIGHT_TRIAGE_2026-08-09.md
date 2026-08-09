# Night Triage 2026-08-09

**Сводка:** ghost 4 · orphan 106 · stale 101.

> Производный артефакт (sink not source): рекомендации, не действия — исполняет человек. Порог stale 14 дн. Сгенерирован 2026-08-09T23:30:00.003Z.

## Обзор (LLM-нарратив)

> _Сгенерировано LLM поверх детерминированного среза (канал: claude); таблицы ниже — источник истины._

Ночной триаж выявил доминирующую проблему — 106 orphan-задач против всего 4 ghost и 101 stale, что указывает на массовую потерю связей с родительскими issue как на главный источник технического долга. Все 4 ghost-задачи сконцентрированы вокруг одного issue #47 (real-dataset-live-calibration, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report), поэтому именно этот кластер стоит разобрать первым — точечная работа с одним issue закроет всю ghost-категорию. Отдельного внимания заслуживает real-dataset-live-calibration: она числится и в ghost-кластере #47, и в списке самых залежавшихся stale с возрастом 56 дней, то есть находится на пересечении двух проблемных зон. Среди stale заметен кластер инфраструктурного застоя: membrane-node-runtime-remote (52д), mp7b-rt7-prod-hardening (52д) и пара oc-proxy-s1/s2 (по 45д) — темы рантайма, продакшн-хардненинга и прокси зависли синхронно. Учитывая объём orphan, первый практический шаг — разобраться с их re-scope/relink по назначенным рекомендациям, но начинать разбор логично с ghost-кластера #47 как самого компактного и связного.

## Ghost (4)

| id | issue | действие |
| --- | --- | --- |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg3-trends-benchmark` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |
| `vdr-hg4-hard-gate-report` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |

## Orphan (106)

| id | действие |
| --- | --- |
| `agent-tooling-friction-6` | relink |
| `angelina-hostess-impl` | relink |
| `angelina-orchestrator-prompt` | relink |
| `cg2-two-tier-test-gate` | relink |
| `cg4-ci-testing-docs` | relink |
| `ci-gate-stabilization` | relink |
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

## Stale (101)

**Требует проверки (низкая уверенность)**

| id | issue | dwell (дн) | действие |
| --- | --- | --- | --- |
| `agent-tooling-friction-3` | [#554](https://github.com/officefish/Membrana/issues/554) | 24 | re-scope |
| `ally-swallow-editorial-gate` | [#569](https://github.com/officefish/Membrana/issues/569) | 24 | re-scope |
| `angelina-codex-no-repo-writes` | [#922](https://github.com/officefish/Membrana/issues/922) | 18 | re-scope |
| `angelina-hostess-impl` | — | 19 | re-scope |
| `angelina-orchestrator-prompt` | — | 21 | re-scope |
| `assets-container` | [#959](https://github.com/officefish/Membrana/issues/959) | 18 | re-scope |
| `batch-collection-run-contour` | [#494](https://github.com/officefish/Membrana/issues/494) | 25 | re-scope |
| `bridge-room` | [#936](https://github.com/officefish/Membrana/issues/936) | 18 | re-scope |
| `cascade-honest-manual` | [#999](https://github.com/officefish/Membrana/issues/999) | 17 | re-scope |
| `cg2-two-tier-test-gate` | — | 38 | re-scope |
| `cg4-ci-testing-docs` | — | 38 | re-scope |
| `ci-gate-stabilization` | — | 38 | re-scope |
| `code-review-lead-refactor` | — | 19 | re-scope |
| `dads-benchmark-bridge` | — | 22 | re-scope |
| `db3h-s4-microphone-detectors` | — | 44 | re-scope |
| `detection-alarm-loop-refactor` | — | 29 | re-scope |
| `detector-metrics-characterization` | [#565](https://github.com/officefish/Membrana/issues/565) | 25 | re-scope |
| `detector-scoreboard` | — | 22 | re-scope |
| `device-board-three-hosts-2026-06-26` | — | 44 | re-scope |
| `dreams-deploy-office` | [#997](https://github.com/officefish/Membrana/issues/997) | 17 | re-scope |
| `drift-anchor-contour` | [#396](https://github.com/officefish/Membrana/issues/396) | 28 | re-scope |
| `frame-rails-2307` | — | 17 | re-scope |
| `frames-alive-dynin` | [#980](https://github.com/officefish/Membrana/issues/980) | 18 | re-scope |
| `frames-alive-ozhegov` | [#979](https://github.com/officefish/Membrana/issues/979) | 18 | re-scope |
| `frames-alive-rodchenko` | [#981](https://github.com/officefish/Membrana/issues/981) | 18 | re-scope |
| `generated-docs-quality-criteria` | — | 21 | re-scope |
| `graphify-research-tree-panel-sections` | — | 24 | re-scope |
| `grp1-route-bridge-sections` | — | 24 | re-scope |
| `grp2-grants-owner-matrix` | — | 24 | re-scope |
| `grp3-research-tree-gated` | — | 24 | re-scope |
| `grp4-graphify-gated` | — | 24 | re-scope |
| `linear-hygiene-dreams-providers-night` | — | 20 | re-scope |
| `llm-procedure-channels` | [#1007](https://github.com/officefish/Membrana/issues/1007) | 17 | re-scope |
| `lpc-a-lib` | [#1008](https://github.com/officefish/Membrana/issues/1008) | 17 | re-scope |
| `lpc-b-wire` | [#1009](https://github.com/officefish/Membrana/issues/1009) | 17 | re-scope |
| `lpc-c-office` | [#1010](https://github.com/officefish/Membrana/issues/1010) | 17 | re-scope |
| `lpc-d-panel` | [#1011](https://github.com/officefish/Membrana/issues/1011) | 17 | re-scope |
| `main-day-probe-gate` | [#533](https://github.com/officefish/Membrana/issues/533) | 24 | re-scope |
| `meeting-format` | — | 23 | re-scope |
| `meeting-registry-relocation` | — | 21 | re-scope |
| `meeting-team-execution-contour` | — | 21 | re-scope |
| `membrana-device-build-profile` | — | 24 | re-scope |
| `membrane-node-runtime-remote` | — | 52 | re-scope |
| `mf1-format-carrier` | — | 23 | re-scope |
| `mf10-teeth-sm5` | — | 23 | re-scope |
| `mf2-branch-count` | — | 23 | re-scope |
| `mf3-commands-vs-flag` | — | 23 | re-scope |
| `mf4-teeth-sm2` | — | 23 | re-scope |
| `mf5-echo-rule` | — | 23 | re-scope |
| `mf6-auditor-worktree` | — | 23 | re-scope |
| `mf7-active-guard` | — | 23 | re-scope |
| `mf8-sprint-kind` | — | 23 | re-scope |
| `mf9-auditor-readonly` | — | 23 | re-scope |
| `morning-report-completion` | [#788](https://github.com/officefish/Membrana/issues/788) | 19 | re-scope |
| `morning-ritual-regulation` | [#605](https://github.com/officefish/Membrana/issues/605) | 22 | re-scope |
| `mp7b-rt7-prod-hardening` | — | 52 | re-scope |
| `neural-free-tier-dataset-report` | — | 44 | re-scope |
| `night-build-format-v2` | — | 22 | re-scope |
| `oc-proxy-s1-opencode-install` | — | 45 | re-scope |
| `oc-proxy-s2-freemodel-keys` | — | 45 | re-scope |
| `oc-proxy-s3-llm-proxy-script` | — | 45 | re-scope |
| `office-stability-emergency` | [#933](https://github.com/officefish/Membrana/issues/933) | 18 | re-scope |
| `opencode-proxy-sprint-2026-06-25` | — | 45 | re-scope |
| `partner-tutorials` | — | 34 | re-scope |
| `pcb-d2-multinode` | — | 36 | re-scope |
| `precedent-container` | — | 18 | re-scope |
| `procedural-layer-impl` | [#781](https://github.com/officefish/Membrana/issues/781) | 19 | re-scope |
| `procedural-workshop` | — | 18 | re-scope |
| `product-landing` | — | 25 | re-scope |
| `pt-0-tutorial-template` | — | 34 | re-scope |
| `pt-1-read-facts-sheet` | — | 34 | re-scope |
| `pt-2-first-output-v01-endtoend` | — | 34 | re-scope |
| `pt-3-honest-tech-storytelling` | — | 34 | re-scope |
| `real-dataset-live-calibration` | [#47](https://github.com/officefish/Membrana/issues/47) | 56 | re-scope |
| `research-query-hygiene` | — | 22 | re-scope |
| `ritual-a-angelina-coordinator` | — | 20 | re-scope |
| `ritual-k-karkas` | — | 20 | re-scope |
| `ritual-r-report` | — | 20 | re-scope |
| `ritual-s-standup` | — | 20 | re-scope |
| `ritual-trust-contour` | [#539](https://github.com/officefish/Membrana/issues/539) | 24 | re-scope |
| `root-domain-scenarios-docs` | — | 25 | re-scope |
| `rt-1-manifest-generator` | — | 24 | re-scope |
| `rt-2-session-extracts` | [#537](https://github.com/officefish/Membrana/issues/537) | 24 | re-scope |
| `rt-3-closure-integrity` | — | 24 | re-scope |
| `rt-4-closure-chain` | — | 24 | re-scope |
| `rt-5-pr-land` | — | 24 | re-scope |
| `rt-7-priorities-from-registry` | — | 24 | re-scope |
| `sca-manual-smoke` | — | 37 | re-scope |
| `scoreboard-dataset-ladder` | — | 22 | re-scope |
| `scoreboard-neural-ladder` | — | 22 | re-scope |
| `scoreboard-panel-publish` | — | 22 | re-scope |
| `strategy-day-generator` | [#592](https://github.com/officefish/Membrana/issues/592) | 23 | re-scope |
| `studio-capture-adaptation` | — | 37 | re-scope |
| `swallow-delivery-idempotency` | — | 22 | re-scope |
| `swallow-format-frame-fix` | [#918](https://github.com/officefish/Membrana/issues/918) | 18 | re-scope |
| `team-accountability-metrics` | — | 21 | re-scope |
| `tooling-atlas` | — | 18 | re-scope |
| `truth-graph-contour` | [#576](https://github.com/officefish/Membrana/issues/576) | 23 | re-scope |
| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | 37 | re-scope |
| `vdr-hg3-trends-benchmark` | [#47](https://github.com/officefish/Membrana/issues/47) | 37 | re-scope |
| `vdr-hg4-hard-gate-report` | [#47](https://github.com/officefish/Membrana/issues/47) | 37 | re-scope |
