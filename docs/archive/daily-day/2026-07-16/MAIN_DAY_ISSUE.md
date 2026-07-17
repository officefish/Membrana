<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-16
  archived-at: 2026-07-16T15:53:58.165Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-16T05:01:18.464Z (yarn main-day-issue) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: detector-metrics-characterization, product-landing, root-domain-scenarios-docs, live-neural-combined-fusion, drift-anchor-contour, single-node-detection-first, real-dataset-live-calibration, media-library-a3-mic-recorder, media-library-a4-sample-player, trends-fft-template-editor, background-media-v1, background-media-a5a-server, background-media-a5b-docker, background-media-a5c-deploy, sample-library-drone-detection, sld3-dsp-detectors-free-v1, sld4-stage-gate-calibration, live-parallel-detection-sprint, lp1-mic-drone-stream-modes, lp1b-drone-detailed-report-server, lp2-fft-plugins-journal-sink, lp3-track-import-backpressure, lp4-parallel-detection-smoke, lp5-journal-report-renderers, device-board-hackathon-1, db-h1b-board-shell, db-h1c-graph-serialize, db-h2a-json-import, db-h2b-scenario-runtime, db-h2c-mic-journal, db-h2d-cabinet-sync, db-h3a-trigger-stop, db-h3b-trigger-disconnect, db-h3c-subgraph, db-h4-alarm-close, membrane-node-realtime-gateway, membrane-node-realtime-nr0-contract, membrane-node-realtime-nr1-gateway, membrane-node-realtime-nr2-journal-ws, membrane-node-realtime-nr3-client-journal, membrane-node-realtime-nr4-mic-live, membrane-node-realtime-nr5-cabinet-live, membrane-node-realtime-nr6-prod-hardening, membrane-node-runtime-remote, mp7b-rt0-contract, mp7b-rt1-gateway, mp7b-rt2-client-runtime, mp7b-rt3-mode, mp7b-rt4-multinode-schema, mp7b-rt5-cabinet-nodes, mp7b-rt6-board-ux, mp7b-rt7-prod-hardening, deploy-pipeline-refactor, dpr-dr0-git-hygiene-gate, dpr-dr1-ci-gate, dpr-dr2-image-registry, dpr-dr3-rollback-runbook, dpr-dr4-smoke-suite, dpr-dr5-branch-migration-policy, dpr-dr6-client-delivery, dpr-dr7-zero-downtime, device-board-refactor-v04, dbr-0-concept-core, dbr-1-fullscreen, dbr-2-variables, dbr-3-event-node, dbr-4-dataflow-resolve, dbr-5-palette-nodes, dbr-6-run-gating, db-doc-v04-mvp, db-post-usercase-roadmap, usercase-mvp-v2-groups-async, ucv2-0-spec-lgtm, ucv2-1-graph-collapse, ucv2-2-freeze-async-tracks, ucv2-3-pack-verify, ucv2-4-operator-signoff, device-board-phase-3, db-p3-a1-usercase-catalog-service, db-p3-a2-runtime-validators, db-p3-a3-competition-restrictions, db-ap-r1-core-contracts, db-ap-r2-core-sequence-latent, db-ap-r3-async-job-store, db-ap-r4-sequence-latent-runtime, db-ap-r5-promise-nodes-editor, db-ap-r6-promise-nodes-executor, db-ap-r7-host-bridge-jobs, db-ap-r8-detached-event-dispatch, db-ap-r9-mvp-graph-v2, db-ap-r10-agenda-async-hub, db-ap-r11-observability-tests, db-ap-r12-docs-signoff, opencode-proxy-sprint-2026-06-25, oc-proxy-s0-research-isolation, oc-proxy-s1-opencode-install, oc-proxy-s2-freemodel-keys, oc-proxy-s3-llm-proxy-script, oc-proxy-s4-opencode-config, comp-packaging-catalog-2026-06-25, device-board-three-hosts-2026-06-26, ci-gate-stabilization, cg2-two-tier-test-gate, cg3-flaky-metrics-week, cg4-ci-testing-docs, db3h-s2-cabinet-host, db3h-s5-desktop-logging, db3h-s4-microphone-detectors, device-board-server-first, db-sf-0-canon, db-sf-1-core-contracts, db-sf-2-gateway-board, db-sf-3-cabinet-lease-api, db-sf-4-client-follower, db-sf-5-board-flags-ui, db-sf-6-nodes-runtime, db-sf-7-last-track-preview, db-sf-8-tests-smoke, db-sf-9-docs-sync, neural-tier-1b-contract, neural-free-tier-dataset-report, rag-dual-circuit-v1, rag-r6-closure, rag-r7-optional, fv1-s2-closeout, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, vdr-label-roundtrip-night-build, nb-vlr-0-gate, nb-vlr-1-labels-export-ui, nb-vlr-2-labels-merge-script, nb-vlr-3-library-label-filter, nb-vlr-4-docs, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, tech-debt-2026-07, cg5-detector-base-build-order, cg6-stale-dist-gate, cg7-catalog-verify-prepush, td-scenario-registry-persistence, td-node-lastseen-reconnect, td-singleton-eslint-guard, cabinet-scenario-picker-system, csp-1-contract, csp-2-tariff-to-node, csp-3-node-declares-system, csp-4-shared-card, csp-5-cabinet-ui, csp-6-smoke-docs, agent-tooling-night-build, nb-at-0-gate, nb-at-1-gitignore-review, nb-at-2-pr-ship, nb-at-3-build-affected, nb-at-4-verify-wire-sync, nb-at-5-hooks, nb-at-6-helpers, nb-at-7-bookkeeping-gitctx, nb-at-8-docs-skills, night-triage-routine-pilot, detection-alarm-loop-refactor, batch-collection-run-contour, palette-clarity-nodes -->

# MAIN_DAY_ISSUE — 2026-07-16

**Дата:** 2026-07-16 | **Координатор:** Vesnin (Teamlead)
**Статус:** Active | **Режим:** штатный (plan:day + standup + main-day-issue)

---

## 🔴 **ЕДИНСТВЕННЫЙ ОБЯЗАТЕЛЬНЫЙ ФОКУС ДНЯ**

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                    │
│ ⚡ РАЗВЕДКА §5 → ВЕРДИКТ МАГИСТРАЛИ → СТАРТ В КОДЕ                 │
│    (последний рабочий день перед дедлайном FREE ~17.07)            │
│                                                                    │
│ ─────────────────────────────────────────────────────────────    │
│ ШАГ 0 (блокирующий, НЕ код) · РАЗВЕДКА §5:                         │
│   1. Прочитать docs/seanses/foresight-2026-07-06.md (декомпозиция │
│      S2–S5, точные критерии).                                      │
│   2. Найти карточку S2 в docs/tasks/registry.json                 │
│      (combined / fusion / s2 / alarm) + статус #415/#416.          │
│   3. Проверить точку выдачи СЫРОГО yamnet-confidence в графе       │
│      device-board (neural-drone-analyzer → API стыковки fusion).   │
│                                                                    │
│   ➤ ВЕРДИКТ (снять противоречие план ↔ вчерашний MAIN_DAY_ISSUE):  │
│     • Ветка A — если fusion в коде ЕЩЁ НЕ ЖИВЁТ (#415 open):       │
│       магистраль = FUSION-УЗЕЛ (сырой yamnet-confidence + спектр   │
│       → combinedScore) + ALARM-LOOP «ближе/дальше» по RMS.         │
│     • Ветка B — если fusion УЖЕ СЛИТ (#416 closed, combined жив):  │
│       магистраль = НАЛИТЬ ТРИ ПУСТЫХ UC-КАРКАСА (спектр / нейро /  │
│       библиотека) пересборкой существующих basn-узлов.            │
│                                                                    │
│ ─────────────────────────────────────────────────────────────    │
│ ШАГ 1 · СТАРТ МАГИСТРАЛИ В КОДЕ (по вердикту):                     │
│   Ветка A: fusion — ЧИСТАЯ функция объединения confidence         │
│     { spectralConfidence, yamnetConfidence, rms } → combinedScore  │
│     + метка источника; НЕ бинарный OR (взвешенное/калиброванное,   │
│     профили ошибок DSP/нейро слабо коррелированы, ND3);            │
│     graceful DSP-only с ВИДИМОЙ меткой; + тест.                    │
│   Ветка B: первый НЕПУСТОЙ UC-документ из проверенного графа       │
│     usercase-free-combined-alarm; combined остаётся 4-м, НЕ        │
│     меняется. 🚫 НОВЫХ УЗЛОВ ПАЛИТРЫ НЕ ДЕЛАТЬ (слово владельца).  │
│                                                                    │
│ 🎯 Критерий вечера: разведка закрыта, магистраль ОДНОЗНАЧНО        │
│    определена и СТАРТОВАЛА в коде (fusion-узел ИЛИ первый          │
│    непустой UC-документ), рабочее дерево чистое.                   │
│                                                                    │
│ ─────────────────────────────────────────────────────────────    │
│ 🟢 ФАЗА 0 · блокирующая гигиена ПЕРЕД кодом (Ozhegov+Rodchenko):   │
│   1. yarn neighbors (коллизии worktree/main)                       │
│   2. yarn catalog:verify-client (каталог UC — предмет дня)         │
│   3. yarn turbo run lint typecheck test --filter=@membrana/        │
│      device-board                                                  │
│   4. Разобрать untracked: docs/archive/night-hunt/2026-07-15/,     │
│      docs/comms/drafts/alex-response-swallow.md,                   │
│      docs/prompts/DETECTOR_METRICS_CHARACTERIZATION_PROMPT.md      │
│      → закоммитить осознанно ИЛИ очистить (чистое дерево перед     │
│      deploy-preflight).                                            │
│                                                                    │
│ ─────────────────────────────────────────────────────────────    │
│ 🚫 АНТИ-ПРИОРИТЕТЫ (НЕ делать сегодня):                            │
│   ❌ «Этап 1.A / unified benchmark 3 DSP» (FFT_METRICS §6 —        │
│      потолок эшелона 0 зафиксирован: trends DRONE_TIGHT 95%/30%).  │
│   ❌ Повторный тюнинг порогов DSP без новых данных.                │
│   ❌ Переизобретение yamnet (#266/#268 готовы).                    │
│   ❌ Новые узлы палитры (слово владельца) — только пересборка.     │
│   ⚠️ Тулинг-гигиена как магистраль — вчера её было достаточно;     │
│      при дедлайне приоритет продукту.                             │
│                                                                    │
│ ❄️ КЛЮЧЕВОЙ ИНВАРИАНТ (слово владельца, дважды):                  │
│    ЖИВОЙ ДРОН — НЕ ГЕЙТ ПЕРЕД ОТГРУЗКОЙ FREE, А ЕЁ СМЫСЛ.          │
│    Полевые испытания = следующий жизненный цикл. Drone-smoke /     │
│    детекционный гейт перед отгрузкой НЕ ИСКАТЬ.                    │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Одна фраза дня:** последний день перед дедлайном FREE — сначала **разведка §5**
(foresight + registry + точка yamnet-confidence), затем однозначный **вердикт
«fusion vs наполнение UC-каркасов»**, и в тот же день **старт магистрали в коде**
(чистая функция fusion ИЛИ первый непустой UC-документ); анти-приоритеты не трогаем,
живой дрон не гейт.

---

## ⚠️ Почему это магистраль

| Источник | Вывод | Вердикт Teamlead |
|----------|-------|------------------|
| **STRATEGIC_PLAN_DAY (16.07)** | Магистраль = S2 combined UC (fusion + alarm-loop); разведка §5 обязательна нулевым шагом | ✅ **Магистраль дня** |
| **MAIN_DAY_ISSUE (15.07)** | Альт-трактовка: S2 слит (#416) → остаток = упаковка 3 UC-каркасов | ⚖️ Противоречие → снять в разведке |
| **Форсайт 2026-07-06** | S2 первый в цепочке S2→S3→S4→S5 до ~17.07; fusion берёт сырой confidence yamnet | ✅ Прямой мандат владельца |
| **FFT_METRICS §6 (#84)** | Потолок эшелона 0 зафиксирован; рост качества — validated data/нейро, не DSP-тюнинг | 🧭 Формирует анти-приоритеты |
| **DAILY_CODE_REVIEW (15.07)** | T0, CI зелёный (57/57, 36/36); untracked night-hunt/drafts — разобрать | ✅ Вход в Фазу 0 |
| **Риск §7 плана** | ~1 день до дедлайна, продуктовый шаг в коде под вопросом; вчера сутки в тулинг | 🔴 Критерий = старт в коде сегодня |

---

## 📋 Порядок работы

**Vesnin (разведка §5 + вердикт «fusion vs упаковка»)** → **Kuryokhin** (fusion-узел / детекторная ветка графа) ∥ **Rodchenko** (UC-карточка/каталог) → **Ozhegov** (границы пакетов, device-board интеграция) → **Vesnin (LGTM)**.

Консилиум по #415 **не нужен** — контракт зафиксирован мандатом владельца (сырой yamnet-confidence, не бинарный вердикт). Kuryokhin и Rodchenko перед существенным кодом согласуют форму с Vesnin (1–2 абзаца + список модулей).

---

## 🎯 Definition of Done (день)

- [ ] **Разведка §5 закрыта:** вердикт «S2 fusion vs наполнение UC-каркасов» вынесен и зафиксирован в STRATEGIC_PLAN_DAY.
- [ ] Точка стыковки сырого yamnet-confidence в графе device-board найдена и задокументирована.
- [ ] **Фаза 0 пройдена:** `neighbors` + `catalog:verify-client` + `turbo lint/typecheck/test --filter=device-board` зелёные.
- [ ] Рабочее дерево чистое: 3 untracked + night-hunt закоммичены осознанно либо очищены.
- [ ] **Магистраль стартовала в коде:** fusion-узел (сырой yamnet-confidence, не бинарный OR) ИЛИ первый непустой UC-документ.
- [ ] Fusion — чистая функция объединения confidence + тест; graceful DSP-only с видимой меткой.
- [ ] Без горизонтальных зависимостей между сервисами/плагинами (ARCHITECTURE §1a/1e); **Teamlead LGTM**.
- [ ] Не запускались анти-приоритеты: benchmark 3 DSP, тюнинг порогов, новые узлы палитры, живой-дрон-гейт.

---

## 🔗 Issues в скоупе

| Приоритет | Issues |
|-----------|--------|
| **Магистраль / критпуть FREE** | #415 (live-neural fusion) |
| **Долг (side-слот при простое магистрали)** | #476 п.1 (merge-driver реестра), #407 (pr:ship устойчивость) |
| **Отложено (пост-FREE)** | #494 (batch-collection), #420 (полевой data-anchor, privacy-гейт) |
| **Отложено (долг)** | #236, #197, #196, #195, #187, #57, #34, #33, #27, #10, #8, #7, #396, #408–#411 |

---

## 🧭 Дрейф-якоря (read-only, DRIFT_2026-07-13.json)

Сводка: ok 8 · drift 0 · broken 0 — снимок 2026-07-13T05:16:22.454Z. Все якоря в норме, вердикты вынесены чистой `computeDrift`.

---

*Собран штатно (`yarn plan:day` → `yarn standup` → `yarn main-day-issue`) из STRATEGIC_PLAN_DAY (16.07), DAILY_STANDUP (16.07), DAILY_CODE_REVIEW (15.07 вечер, T0), FFT_METRICS §6 (#84), форсайта 2026-07-06, реестра задач и открытых GitHub Issues (22). При конфликте план ↔ вчерашний MAIN_DAY_ISSUE приоритет отд