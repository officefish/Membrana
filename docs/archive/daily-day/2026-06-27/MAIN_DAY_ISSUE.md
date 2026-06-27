<!--
  archive-role: archive-snapshot
  archive-day: 2026-06-27
  archived-at: 2026-06-27T16:12:36.672Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-06-27T06:10:20.245Z (yarn main-day-issue) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: single-node-detection-first, real-dataset-live-calibration, media-library-a3-mic-recorder, media-library-a4-sample-player, trends-fft-template-editor, background-media-v1, background-media-a5a-server, background-media-a5b-docker, background-media-a5c-deploy, background-media-a5d-swagger, membrane-platform-v1, cabinet-sample-library-v1, cabinet-sample-library-csl1-api, cabinet-sample-library-csl2-ui, cabinet-sample-library-csl3-remote-ops, cabinet-mp4-hardening-night-build, cabinet-mp4-nb0-merge-gate, cabinet-mp4-nb1-sample-playback-dry, cabinet-mp4-nb2-cabinet-facade, cabinet-mp4-nb3-quality-contracts, sample-library-drone-detection, sld3-dsp-detectors-free-v1, sld4-stage-gate-calibration, validated-drone-recognition, vdr1-sample-label-patch-api, vdr2-label-notes-ui, vdr3-ground-truth-export, vdr4-dsp-calibration-validated, vdr5-template-match-detector, vdr6-recognition-report-gate, drone-detector-detail-report, telemetry-journal-live-refactor, live-parallel-detection-sprint, lp1-mic-drone-stream-modes, lp1b-drone-detailed-report-server, lp2-fft-plugins-journal-sink, lp3-track-import-backpressure, lp4-parallel-detection-smoke, lp5-journal-report-renderers, cabinet-journal-hotfix, cj-0-trends-enabled-keys, cj-1-media-api-safe-json, cj-2-journal-media-decouple, cj-3-brief-render-parity, cj-4-trends-counts-as-detection, cj-5-sync-push-observability, module-catalog-v1, mc-0-catalog-regulation, mc-1-prompt-templates, mc-2-registry-microphone-pilot, mc-3-pilot-plugins, mc-4-telemetry-journal-stable, mc-5-remaining-modules-draft, mc-6-remaining-plugins-draft, mc-7-verify-script-ci, mc-8-agent-rules-integration, mc-9-stable-review, device-board-hackathon-1, db-h1b-board-shell, db-h1c-graph-serialize, db-h2a-json-import, db-h2b-scenario-runtime, db-h2c-mic-journal, db-h2d-cabinet-sync, db-h3a-trigger-stop, db-h3b-trigger-disconnect, db-h3c-subgraph, db-h4-alarm-close, membrane-node-realtime-gateway, membrane-node-realtime-nr0-contract, membrane-node-realtime-nr1-gateway, membrane-node-realtime-nr2-journal-ws, membrane-node-realtime-nr3-client-journal, membrane-node-realtime-nr4-mic-live, membrane-node-realtime-nr5-cabinet-live, membrane-node-realtime-nr6-prod-hardening, membrane-node-runtime-remote, mp7b-rt0-contract, mp7b-rt1-gateway, mp7b-rt2-client-runtime, mp7b-rt3-mode, mp7b-rt4-multinode-schema, mp7b-rt5-cabinet-nodes, mp7b-rt6-board-ux, mp7b-rt7-prod-hardening, deploy-pipeline-refactor, dpr-dr0-git-hygiene-gate, dpr-dr1-ci-gate, dpr-dr2-image-registry, dpr-dr3-rollback-runbook, dpr-dr4-smoke-suite, dpr-dr5-branch-migration-policy, dpr-dr6-client-delivery, dpr-dr7-zero-downtime, membrana-studio-desktop, device-board-refactor-v04, dbr-0-concept-core, dbr-1-fullscreen, dbr-2-variables, dbr-3-event-node, dbr-4-dataflow-resolve, dbr-5-palette-nodes, dbr-6-run-gating, device-board-cabinet-hotfix, dbh-0-canvas-overlay, dbh-1-sidebar-clamp, dbh-2-nav-split, dbh-3-delete-node, dbh-4-purge-expired-keys, device-board-w0-hotfix, db-w0-h3-selection-modal-keep, db-w0-h1-function-palette, db-w0-h2-copy-paste-hotkeys, db-doc-v04-mvp, db-recording-gate-v07, db-recording-gate-r4-scenario-smoke, db-post-usercase-roadmap, smoke-testing-s1-night-build, smoke-s1-nb0-gate-docs, smoke-s1-nb1-playwright-scaffold, smoke-s1-nb2-smoke-tests-testids, smoke-s1-nb3-optional-ci-workflow, smoke-s1-nb4-docs-handoff, usercase-mvp-v2-groups-async, ucv2-0-spec-lgtm, ucv2-1-graph-collapse, db-ap-r1-core-contracts, db-ap-r2-core-sequence-latent, db-ap-r3-async-job-store, db-ap-r4-sequence-latent-runtime, db-ap-r5-promise-nodes-editor, db-ap-r6-promise-nodes-executor, db-ap-r7-host-bridge-jobs, db-ap-r8-detached-event-dispatch, db-ap-r9-mvp-graph-v2, db-ap-r10-agenda-async-hub, db-ap-r11-observability-tests, db-ap-r12-docs-signoff, opencode-proxy-sprint-2026-06-25, oc-proxy-s0-research-isolation, oc-proxy-s1-opencode-install, oc-proxy-s2-freemodel-keys, oc-proxy-s3-llm-proxy-script, oc-proxy-s4-opencode-config, night-hunt-sprint-2026-06-25, nh-s1-office-module, nh-s2-fly-deploy, nh-s3-rituals, comp-packaging-catalog-2026-06-25, device-board-three-hosts-2026-06-26, db3h-s2-cabinet-host, db3h-s5-desktop-logging, db3h-s4-microphone-detectors, device-board-server-first, db-sf-0-canon, db-sf-1-core-contracts, db-sf-2-gateway-board, db-sf-3-cabinet-lease-api, db-sf-4-client-follower, db-sf-5-board-flags-ui, db-sf-6-nodes-runtime, db-sf-7-last-track-preview, db-sf-8-tests-smoke, db-sf-9-docs-sync, neural-tier-1b-contract, neural-free-tier-dataset-report -->

# MAIN_DAY_ISSUE — 2026-06-27

**Дата:** 2026-06-27 (четверг)  
**Координатор:** Vesnin (Teamlead)  
**Статус:** Urgent · On critical path  
**Горизонт:** 1 день

---

## ❶ **Единственный обязательный фокус дня**

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  TRENDS-FFT DRONE_TIGHT PROMOTION                              ║
║  + Stage-Gate 1→2 CONSILIUM (MID-DAY DECISION)                 ║
║                                                               ║
║  Recall 95% / FPR 30% / F1 0.844 на val                       ║
║  → curated-каталог background-media                            ║
║  → GO или NO-GO на Этап 2 (TDOA, локализация)                 ║
║                                                               ║
║  Параллельно (не блокирует):                                  ║
║  • W0-H3: Selection recovery при закрытии модалки             ║
║  • Desktop logging audit baseline                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**Почему именно это?**

Из `STRATEGIC_PLAN_DAY.md` (задачи 1–2–5):
- Trends `DRONE_TIGHT` — **продакшн-готов**: метрики выше целевых (80%/40%), только требует промоции в curated.
- FFT_METRICS §4–6 — потолок DSP достигнут; дальше только trends или нейро (Этап 2).
- Stage-gate 1→2 — **управленческое решение**: принять recall=95% / precision=76% как достаточное, или требовать нового подхода.

---

## ❷ **Критический путь (08:00–19:00)**

### **08:00–09:00 — Утренние проверки (Teamlead)**

```bash
# 1. Типизация (docs/actions migration)
yarn turbo run typecheck --filter='@membrana/*' --skip-outputs

# 2. Lint
yarn lint --filter='@membrana/*'

# 3. MCP verify
yarn verify-mcp-bootstrap

# 4. Проверка вчерашнего code-review
cat docs/DAILY_CODE_REVIEW.md | grep -E "^## Blockers|^## Warnings"
```

**Блокеры из вчера:**
- ❌ `.sync-readme-out.txt` в корне репо → удалить
- ❌ `.agents/` и `.opencode/` не в AGENTS.md → явная регистрация
- ❌ `yarn turbo run typecheck` может иметь TS-ошибки в docs/actions

**Action:** Если typecheck = RED → fix и commit. Иначе готово к merge.

---

### **09:00–11:00 — Задача 1: Trends-FFT DRONE_TIGHT Promotion (Математик + Музыкант)**

**Математик (Dynin):**
1. Забрать шаблон `DRONE_TIGHT` из эпика #84 (файл в `docs/datasets/week-2026-06-14/fft-last-chance-report.md`).
2. Валидировать thresholds на train-данных:
   - centroid p10–p90 диапазона дронов: **2900–4300 Гц**
   - flux p10–p90: **0.03–0.16**
   - rms p10–p90: **0.07–0.28**
   - frameHitRatio ≥ **0.6**
3. Запустить `yarn benchmark:detectors --template=DRONE_TIGHT`:
   - recall ≥ 95%, FPR ≤ 30% на held-out val ✅
4. Залить результаты в `docs/datasets/week-2026-06-27/trends-promotion-benchmark.md`.

**Музыкант (Kuryokhin):**
1. Код-ревью интеграции `DRONE_TIGHT` в `@membrana/trends-detector-service`.
2. Unit-тесты:
   - drone-tight-match: истинный дрон → score ≥ threshold ✅
   - not-drone-reject: фоновый шум → score < threshold ✅
   - edge-case: пограничный сигнал ✅
3. Дефолты детектора указывают на новый шаблон из background-media.

**Definition of Done:**
- [ ] Шаблон в `background-media/catalogs/templates/DRONE_TIGHT.json`
- [ ] `yarn benchmark:detectors` показывает R ≥ 95%, FPR ≤ 30%
- [ ] Unit-тесты ≥ 3 сценария, все green
- [ ] Code review passed

**Пусть будет готово к:** 11:00 (перед consilium)

---

### **11:00–14:00 — MID-DAY: Stage-Gate 1→2 Consilium**

**Участники:** Teamlead (Vesnin) + Математик (Dynin) + Структурщик (Ozhegov) + Музыкант (Kuryokhin)

**Входы:**
- FFT_METRICS.md §4: потолок DSP = 88–100% FPR на одиночных детекторах
- FFT_METRICS.md §6: trends `DRONE_TIGHT` = 95% R / 30% FPR / 0.844 F1
- WHITE_PAPER.md §8: gate 1→2 требует P ≥ 85% / R ≥ 90%

**Обсуждение (2–3 часа):**

1. **Точность trends на live-данных?** (Математик)
   - Train на синтетике / dataset v0.1 → вероятна деградация на реальных полях
   - Ожидаемо: R ≈ 90%, P ≈ 0.70 (F1 ≈ 0.79)
   - Риск: шум города, ветер, нежелательные тональные источники

2. **Precision 76% — достаточно ли?** (Teamlead + Структурщик)
   - Gate требует P ≥ 85%, trends даёт 76%
   - Опции:
     - **(A)** GO с честной коммуникацией: «false alarm rate 24% на val, ожидается 25–30% на live»
     - **(B)** Затянуть: требовать нового датасета (VDR-эпик)
     - **(C)** Гибрид: trends + логирование confusions для обучения нейро на Этапе 1.B

3. **Параллельное развитие?** (Музыкант + Структурщик)
   - Спринт 4 (детекторы-диагностика): audit harmonic/cepstral/spectral-flux как вспомогательных
   - Спринт 5 (нейро): zero-shot YAMNet/CLAP если gate не пройден по precision
   - TDOA (Этап 2): можно начинать параллельно scaffold даже при gate = GO (но не интеграция)

**Выход consilium:**
```markdown
## Решение Stage-Gate 1→2 (2026-06-27)

**Дата:** 2026-06-27 14:00+03:00  
**Участники:** Vesnin, Dynin, Ozhegov, Kuryokhin  
**Вердикт:** [GO / NO-GO + обоснование]

### GO (Условное)
- Trends `DRONE_TIGHT` лучший инструмент эшелона 0
- Live-expectations: R ≈ 90% ± 5%, P ≈ 0.70
- Stage 2 (TDOA) разморозить; параллельно спринт 4–5 (детекторы + нейро)
- Commitment: validated dataset (VDR) в спринте 6–7

### NO-GO
- Требуется precision ≥ 85% перед stage 2
- Альтернатива: zero-shot YAMNet (спринт 5 приоритет 1)
- Trends остаётся как диагностический инструмент
```

**Протокол → `docs/seanses/stage-gate-1-2-consilium-2026-06-27.md`**

---

### **14:00–17:00 — Параллельные задачи (не блокируют consilium)**

#### **Задача 2: Audit DSP-детекторов (Структурщик + Музыкант)**

**Структурщик (Ozhegov):**
1. Обновить README каждого детектора (harmonic, cepstral, spectral-flux):
   - Секция **«Роль в системе»** — диагностика, быстрые индикаторы, объяснимость
   - Ссылка на FFT_METRICS.md §4 с таблицей потолков
2. В каждом файле `service.ts`: JSDoc `@deprecated-as-primary`.

**Музыкант (Kuryokhin):**
1. Код-ревью README-ов.
2. Убедиться, что дефолты пороговых значений в коде соответствуют таблице FFT_METRICS.

**Definition of Done:**
- [ ] 3 README.md обновлены (harmonic, cepstral, spectral-flux)
- [ ] Таблица потолков FPR/recall в каждом
- [ ] JSDoc-комментарии в коде
- [ ] `packages/services/detectors/README.md` содержит сводку

---

#### **Задача 4: Desktop logging audit (Верстальщик + Структурщик)**

**Верстальщик (Rodchenko):**
1. Полный скан IPC-каналов `apps/membrana-studio/`:
   - Поиск `console.log`, `logger.*`, `ipcRenderer.send`, `ipcMain.on`
   - Фильтры в `shell-log-scrub.ts` для AAC-буферов, WAV-заголовков, микрофонных путей
2. JSDoc-комментарии: `// ✓ no sensitive data` или `// ⚠️ filtered`
3. E2E-тест на отсутствие hex-буферов в логах

**Структурщик (Ozhegov):**
1. Обновить `DESKTOP_APP_LOGGING_POLICY.md` с чек-листом (20–30 пунктов)
2. Примеры безопасных логов

**Definition of Done:**
- [ ] Полный список IPC-точек в документе
- [ ] Фильтры добавлены / уточнены в `shell-log-scrub.ts`
- [ ] E2E-тест зелёный
- [ ] Политика с примерами

---

#### **Задача 3: TDOA-service scaffold (Структурщик + Математик)**

**Структурщик (Ozhegov):**
1. Создать структуру `packages/services/tdoa-service/`:
   ```
   src/
     math/
       tdoa-calc.ts (GCC-PHAT)
     core/
       tdoa-engine.ts
     hooks/
       useTdoa.ts
     types.ts
     index.ts
   README.md
   package.json
   ```

**Математик (Dynin):**
1. `tdoa-calc.ts`: чистые функции расчёта задержки по GCC-PHAT
2. `types.ts`: интерфейсы `TdoaInput { observations: AcousticObservation[] }`, `TdoaOutput`
3. README: алгоритм, требования синхронизации (миллисекундная точность)
4. Smoke-тест на mock-наблюдениях

**Definition of Done:**
- [ ] Структура создана
- [ ] README с объяснением GCC-PHAT
- [ ] Smoke-тест ✅
- [ ] Пакет помечен `@stage 2 FROZEN` (не в dev-сборке)

---

### **17:00–18:00 — LGTM и merge готовых PR**

**Teamlead (Vesnin):**
1. Code-review задач 1–2.
2. Проверка:
   - Нет нарушений слабой связанности
   - Unit-тесты green
   - Типизация без ошибок
3. LGTM → merge в main

**Статус:**
- ✅ Trends promotion: merge в main, deploy в background-media
- ✅ DSP audit: merge в main (документация)
- 🔄 TDOA scaffold: merge в main (frozen на stage 2)
- 🔄 Desktop logging: ready для review завтра (объёмная задача)

---

### **18:00–19:00 — Вечерний ритуал**

```bash
# Архив дневных артефактов
yarn archive:daily-day

# Code-review для завтра
yarn code-review

# Сохранение review
yarn save-code-review
```

---

## ❸ **Definition of Done (конец дня)**

- [ ] ✅ `yarn turbo run typecheck lint` — GREEN
- [ ] ✅ Вчерашний code-review processed (блокеры resolved)
- [ ] ✅ Trends-FFT DRONE_TIGHT: benchmark PR → LGTM → merge
- [ ] ✅ DSP-audit: README обновлены → LGTM → merge
- [ ] ✅ Stage-gate 1→2 consilium: решение → `docs/seanses/...md`
- [ ] ✅ TDOA-scaffold: PR → LGTM → merge (frozen)
- [ ] ⏳ Desktop logging: 70% complete, ready для review завтра
- [ ] ✅ `yarn ritual:evening` executed

---

## ❹ **Риски и зависимости**

| Риск | Уровень | Mitigation |
|------|---------|-----------|
| Consilium затянется → merge блокирован | P0 | Планировать на 11:00, 2–3 часа max |
| Desktop audit требует полного скана | P1 | Разбить на подтаски; базовый набор сегодня, расширение завтра |
| TDOA scaffold забирает время | P1 | Это scaffold, только типы и README; не реализация |
| Live-данные разрушат точность trends | P0 | Consilium даст честные ожидания (R 90% ± 5%) |

---

## ❺ **Быстрые ссылки**

| Документ | Назначение |
|----------|-----------|
| [`docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md`](./prompts/FF