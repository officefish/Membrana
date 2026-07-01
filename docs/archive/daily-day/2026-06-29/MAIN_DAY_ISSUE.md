<!--
  archive-role: archive-snapshot
  archive-day: 2026-06-29
  archived-at: 2026-06-30T18:01:50.863Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-06-29T06:31:55.899Z (yarn main-day-issue) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: single-node-detection-first, real-dataset-live-calibration, media-library-a3-mic-recorder, media-library-a4-sample-player, trends-fft-template-editor, background-media-v1, background-media-a5a-server, background-media-a5b-docker, background-media-a5c-deploy, background-media-a5d-swagger, membrane-platform-v1, cabinet-sample-library-v1, cabinet-sample-library-csl1-api, cabinet-sample-library-csl2-ui, cabinet-sample-library-csl3-remote-ops, cabinet-mp4-hardening-night-build, cabinet-mp4-nb0-merge-gate, cabinet-mp4-nb1-sample-playback-dry, cabinet-mp4-nb2-cabinet-facade, cabinet-mp4-nb3-quality-contracts, sample-library-drone-detection, sld3-dsp-detectors-free-v1, sld4-stage-gate-calibration, validated-drone-recognition, vdr1-sample-label-patch-api, vdr2-label-notes-ui, vdr3-ground-truth-export, vdr4-dsp-calibration-validated, vdr5-template-match-detector, vdr6-recognition-report-gate, drone-detector-detail-report, telemetry-journal-live-refactor, live-parallel-detection-sprint, lp1-mic-drone-stream-modes, lp1b-drone-detailed-report-server, lp2-fft-plugins-journal-sink, lp3-track-import-backpressure, lp4-parallel-detection-smoke, lp5-journal-report-renderers, cabinet-journal-hotfix, cj-0-trends-enabled-keys, cj-1-media-api-safe-json, cj-2-journal-media-decouple, cj-3-brief-render-parity, cj-4-trends-counts-as-detection, cj-5-sync-push-observability, module-catalog-v1, mc-0-catalog-regulation, mc-1-prompt-templates, mc-2-registry-microphone-pilot, mc-3-pilot-plugins, mc-4-telemetry-journal-stable, mc-5-remaining-modules-draft, mc-6-remaining-plugins-draft, mc-7-verify-script-ci, mc-8-agent-rules-integration, mc-9-stable-review, device-board-hackathon-1, db-h1b-board-shell, db-h1c-graph-serialize, db-h2a-json-import, db-h2b-scenario-runtime, db-h2c-mic-journal, db-h2d-cabinet-sync, db-h3a-trigger-stop, db-h3b-trigger-disconnect, db-h3c-subgraph, db-h4-alarm-close, membrane-node-realtime-gateway, membrane-node-realtime-nr0-contract, membrane-node-realtime-nr1-gateway, membrane-node-realtime-nr2-journal-ws, membrane-node-realtime-nr3-client-journal, membrane-node-realtime-nr4-mic-live, membrane-node-realtime-nr5-cabinet-live, membrane-node-realtime-nr6-prod-hardening, membrane-node-runtime-remote, mp7b-rt0-contract, mp7b-rt1-gateway, mp7b-rt2-client-runtime, mp7b-rt3-mode, mp7b-rt4-multinode-schema, mp7b-rt5-cabinet-nodes, mp7b-rt6-board-ux, mp7b-rt7-prod-hardening, deploy-pipeline-refactor, dpr-dr0-git-hygiene-gate, dpr-dr1-ci-gate, dpr-dr2-image-registry, dpr-dr3-rollback-runbook, dpr-dr4-smoke-suite, dpr-dr5-branch-migration-policy, dpr-dr6-client-delivery, dpr-dr7-zero-downtime, membrana-studio-desktop, device-board-refactor-v04, dbr-0-concept-core, dbr-1-fullscreen, dbr-2-variables, dbr-3-event-node, dbr-4-dataflow-resolve, dbr-5-palette-nodes, dbr-6-run-gating, device-board-cabinet-hotfix, dbh-0-canvas-overlay, dbh-1-sidebar-clamp, dbh-2-nav-split, dbh-3-delete-node, dbh-4-purge-expired-keys, device-board-w0-hotfix, db-w0-h3-selection-modal-keep, db-w0-h1-function-palette, db-w0-h2-copy-paste-hotkeys, db-doc-v04-mvp, db-recording-gate-v07, db-recording-gate-r4-scenario-smoke, db-post-usercase-roadmap, smoke-testing-s1-night-build, smoke-s1-nb0-gate-docs, smoke-s1-nb1-playwright-scaffold, smoke-s1-nb2-smoke-tests-testids, smoke-s1-nb3-optional-ci-workflow, smoke-s1-nb4-docs-handoff, usercase-mvp-v2-groups-async, ucv2-0-spec-lgtm, ucv2-1-graph-collapse, ucv2-2-freeze-async-tracks, ucv2-3-pack-verify, ucv2-4-operator-signoff, device-board-phase-3, db-p3-a1-usercase-catalog-service, db-p3-a2-runtime-validators, db-p3-a3-competition-restrictions, ghost-task-closure-sprint-2026-06-29 -->

# MAIN_DAY_ISSUE — 29 июня 2026

**Дата:** 2026-06-29 · **Координатор:** Vesnin (Teamlead)  
**Время генерации:** 06:35 UTC · **Статус ветки:** techies68

---

## 🔴 **ЕДИНСТВЕННЫЙ ОБЯЗАТЕЛЬНЫЙ ФОКУС ДНЯ**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ⚡ MAIN_DAY_ISSUE_2026_06_29                                 │
│                                                              │
│  Закрыть три критических блокера + подготовить Этап 2       │
│                                                              │
│  1️⃣  #178 async-v2 upload FIX (блокирует detached-report)   │
│      Lead: Ozhegov (Структурщик)                            │
│      Таймбокс: 09:00–11:30 (2.5ч)                           │
│      DoD: #178 tagged `fixed` или с обоснованием            │
│                                                              │
│  2️⃣  W0-H3 (#153) selection clearance + MERGE              │
│      Lead: Rodchenko (Верстальщик)                          │
│      Таймбокс: 09:00–10:30 (1.5ч)                           │
│      DoD: #153 merged, selection state работает             │
│                                                              │
│  3️⃣  Headroom proxy-perf замер (#187) + RAG-balance (#186)  │
│      Lead: Dynin (Математик)                                │
│      Таймбокс: 10:30–12:30 (2ч)                             │
│      DoD: proxy-perf-report.json + RAG_TOP_K поднят         │
│                                                              │
│  ⏱️  МАГИСТРАЛЬ: 09:00–12:30 (3.5 часа фокуса)              │
│  🎯 ПАРАЛЛЕЛЬ: VDR-сбор T1 (Kuryokhin, 11:00–17:00)         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📊 Распределение по ролям

| Роль | Фокус | Таймбокс | Блокирует | DoD |
|------|-------|----------|-----------|-----|
| **Vesnin** | Координация + smoke ritual:day | 09:00–12:30 | завтрашний standup | lint/typecheck/test ✅ |
| **Ozhegov** | #178 диагностика + fix | 09:00–11:30 | detached-report | root-cause + fix-план |
| **Rodchenko** | #153 selection + merge | 09:00–10:30 | W0 hotfix | PR merged |
| **Dynin** | headroom + RAG-balance | 10:30–12:30 | Этап 2 контракты | proxy-perf + C2 done |
| **Kuryokhin** | T1 VDR-сбор (параллель) | 11:00–17:00 | Этап 1.B ensemble | 10+ сэмплов в git |

---

## 🔧 Три критических действия (09:00–12:30)

### **1. #178: async-v2 track upload — ROOT-CAUSE + FIX**

**Состояние:**  
`scenarioMicJournalBridge.importBlob()` зависает при upload. Detached drone report не генерируется.

**Действия Ozhegov (Структурщик):**

1. **09:00–10:00 | Диагностика**
   - Запустить `yarn workspace apps/client run dev` (debug mode).
   - Device Board → Load UserCase → Create track → Trigger async-v2 upload.
   - Браузер DevTools:
     - Network tab: trace HTTP/WebSocket calls.
     - Console: errors/warnings.
     - Storage: проверить localStorage/IndexedDB состояние.
   - Логирование: `docs/audit-uploads-2026-06-29.md` (где обрывается цепь).

2. **10:00–11:00 | Fix или workaround**
   - **Гипотеза A (вероятнее):** timeout в `importBlob()` из-за отсутствия abort-механизма.
     - Fix: добавить `AbortController` + `AbortSignal` в сигнатуру.
   - **Гипотеза B:** race condition в async-job состоянии.
     - Fix: ensure atomicity через mutex или более строгую sequencing.
   - **Гипотеза C:** missing dependency в device-board → media-library.
     - Fix: импорт или рефакторинг контракта.
   - Реализовать выбранное fix (код + коммит).

3. **11:00–11:30 | Тестирование**
   - Запустить `yarn test @membrana/device-board`.
   - Smoke upload: Device Board UI → трек загружается → отчёт генерируется.
   - Коммит fix'а или открытие issue с пометкой `awaiting-data` (если нужны реальные данные для диагностики).

**DoD:**
- [ ] `docs/audit-uploads-2026-06-29.md` заполнен с логами.
- [ ] #178 tagged `fixed` (PR) или `awaiting-data` (комментарий).
- [ ] Smoke-тест device-board pass.

---

### **2. W0-H3 (#153): Selection clearance — FIX + MERGE**

**Состояние:**  
`dismissSelectionAction` неправильно очищает selection state. Backdrop click должен закрыть modal, но оставить nodes selected.

**Действия Rodchenko (Верстальщик):**

1. **09:00–09:30 | Fix**
   - Open `apps/client/src/modules/device-board/components/SelectionActionModal.tsx`.
   - Fix: заменить `clearCanvasNodeSelection()` на `closeSelectionActionModal()`.
   - Логика: modal ≠ selection; modal закрывается, selection остаётся.

2. **09:30–10:00 | Тестирование**
   - UI test: select nodes → open modal → click backdrop → modal closed, nodes still selected ✓
   - Unit-тест: `dismissSelectionAction` → modal closed, selection intact ✓

3. **10:00–10:30 | Merge**
   - Lint + typecheck ✅
   - PR merge в `techies68`.

**DoD:**
- [ ] #153 merged.
- [ ] W0-H3 closed as resolved.
- [ ] Smoke: device-board branch switch works without errors.

---

### **3. #187 + #186-C2: Headroom + RAG-balance**

**Состояние:**  
- #187: headroom proxy performance не измерена.
- #186-C2: RAG context balance — RAG_TOP_K требует пересчёта.

**Действия Dynin (Математик):**

1. **10:30–11:00 | Headroom proxy setup**
   - Поднять headroom server: `tools/headroom-venv && source venv/bin/activate && headroom proxy --port 8787`.
   - Verify: `curl http://localhost:8787/health` → 200 ✓

2. **11:00–11:30 | Headroom perf measurement**
   - Claude Code сеанс с proxy:
     ```bash
     ANTHROPIC_BASE_URL=http://localhost:8787 \
     yarn claude:code --no-max-turns 20  # 20–30 tool calls
     ```
   - Логирование: headroom proxy собирает метрики (latency, cache hit, transforms).
   - Export: `headroom perf --format json > docs/insights/insight-headroom-server-deploy/proxy-perf-report.json`.
   - Комментарий в #187: `savings_pct`, `cache_hit_pct`, топ-3 transforms.

3. **11:30–12:30 | RAG-balance (#186-C2)**
   - Update `@membrana/background-office` config:
     ```typescript
     RAG_TOP_K = {
       archive: 15–20,  // было 5–7
       operative: 5–7   // без изменений
     }
     ```
   - Обновить `CONTRIBUTING.md`: рекомендация использовать `trace_path` при увеличении archive-circuit.
   - Smoke: `yarn ritual:day` → `codebase-memory-mcp index_status` не падает ✅
   - Коммит + PR.

**DoD:**
- [ ] `proxy-perf-report.json` заполнен.
- [ ] Комментарий в #187 с метриками.
- [ ] #186-C2 merged.
- [ ] ritual:day smoke pass.

---

## 🎯 Параллельная работа (T1)

### **VDR-сбор (Kuryokhin, 11:00–17:00)**

**Цель:** Собрать 10–15 валидационных сэмплов для улучшения precision trends-детектора.

**Действия:**
1. **Сбор аудио:** 10–15 различных drone-сэмплов (разные частоты, расстояния, фоны).
2. **Лейбелирование:** По VDR_SCHEMA (source, datetime, drone-type, confidence).
3. **Коммит:** `docs/datasets/free-v1-validated/` (пилот).
4. **Регистрация:** `yarn vdr:list` показывает новые сэмплы.

**DoD:**
- [ ] 10+ сэмплов в git (WAV + JSON metadata).
- [ ] `yarn vdr:list` shows them.
- [ ] Документ: `docs/datasets/free-v1-validated/README.md` с инструкциями.

---

## ✅ Проверочный лист (конец магистрального дня)

**К 12:30 (конец магистрали):**
- [ ] #178 диагностика завершена + fix merged или documented.
- [ ] #153 merged, W0-H3 closed.
- [ ] #187 proxy-perf-report.json заполнен.
- [ ] #186-C2 RAG_TOP_K поднят; ritual:day smoke pass.
- [ ] `yarn turbo run lint typecheck` ✅

**К 17:00 (конец рабочего дня):**
- [ ] VDR-сбор: ≥10 сэмплов в репо.
- [ ] `yarn turbo run test --filter='@membrana/core @membrana/device-board'` ✅
- [ ] `yarn ritual:evening` → архив + code-review на завтра.

---

## 🚀 Команды на старт (09:00)

```bash
# 1. Тесты качества
yarn turbo run lint typecheck test --no-cache --filter='@membrana/core @membrana/device-board'

# 2. Диагностика #178
yarn workspace apps/client run dev &
# Device Board → Load UserCase → Trigger upload (check console + network)

# 3. Headroom proxy (фон)
cd tools/headroom-venv && source venv/bin/activate
headroom proxy --port 8787 &

# 4. Smoke ritual:day
yarn ritual:day

# 5. Вечер: архивизация
yarn ritual:evening
```

---

## 📌 Результаты дня (для завтрашнего MAIN_DAY_ISSUE)

Если все три критических блокера закрыты сегодня → завтра (30 июня):
- **Магистраль:** Trends-куратор DRONE_TIGHT финализация + VDR bootstrap.
- **Параллель:** Phase 2b smoke (alpha/beta/gamma scenarios).
- **Подготовка:** Этап 2 контракты (TDOA/localization) design-review.

---

**Статус:** 🟢 **READY TO START**  
**Фокус дня:** Закрыть #178, #153, #187 | VDR-сбор T1  
**Ответственность:** Ozhegov (#178), Rodchenko (#153), Dynin (#187/#186), Kuryokhin (VDR)  
**Опубликовано:** 2026-06-29T06:35 UTC