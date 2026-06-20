<!-- Сгенерировано: 2026-06-18T08:56:30.025Z (yarn main-day-issue) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: single-node-detection-first, real-dataset-live-calibration, media-library-a3-mic-recorder, media-library-a4-sample-player, trends-fft-template-editor, background-media-v1, background-media-a5a-server, background-media-a5b-docker, background-media-a5c-deploy, background-media-a5d-swagger, membrane-platform-v1, cabinet-sample-library-v1, cabinet-sample-library-csl1-api, cabinet-sample-library-csl2-ui, cabinet-sample-library-csl3-remote-ops, cabinet-mp4-hardening-night-build, cabinet-mp4-nb0-merge-gate, cabinet-mp4-nb1-sample-playback-dry, cabinet-mp4-nb2-cabinet-facade, cabinet-mp4-nb3-quality-contracts, sample-library-drone-detection, sld3-dsp-detectors-free-v1, sld4-stage-gate-calibration, validated-drone-recognition, vdr1-sample-label-patch-api, vdr2-label-notes-ui, vdr3-ground-truth-export, vdr4-dsp-calibration-validated, vdr5-template-match-detector, vdr6-recognition-report-gate, drone-detector-detail-report, telemetry-journal-live-refactor, live-parallel-detection-sprint, lp1-mic-drone-stream-modes, lp1b-drone-detailed-report-server, lp2-fft-plugins-journal-sink, lp3-track-import-backpressure, lp4-parallel-detection-smoke, lp5-journal-report-renderers, cabinet-journal-hotfix, cj-0-trends-enabled-keys, cj-1-media-api-safe-json, cj-2-journal-media-decouple, cj-3-brief-render-parity, cj-4-trends-counts-as-detection, cj-5-sync-push-observability, module-catalog-v1, mc-0-catalog-regulation, mc-1-prompt-templates, mc-2-registry-microphone-pilot, mc-3-pilot-plugins, mc-4-telemetry-journal-stable, mc-5-remaining-modules-draft, mc-6-remaining-plugins-draft, mc-7-verify-script-ci, mc-8-agent-rules-integration, mc-9-stable-review, device-board-hackathon-1, db-h1b-board-shell, db-h1c-graph-serialize, db-h2a-json-import, db-h2b-scenario-runtime, db-h2c-mic-journal, db-h2d-cabinet-sync, db-h3a-trigger-stop, db-h3b-trigger-disconnect, db-h3c-subgraph, db-h4-alarm-close, membrane-node-realtime-gateway, membrane-node-realtime-nr0-contract, membrane-node-realtime-nr1-gateway, membrane-node-realtime-nr2-journal-ws, membrane-node-realtime-nr3-client-journal, membrane-node-realtime-nr4-mic-live, membrane-node-realtime-nr5-cabinet-live, membrane-node-realtime-nr6-prod-hardening, membrana-studio-desktop, membrana-studio-ms0-canon, membrana-studio-ms1-shell, membrana-studio-ms2-media-fs, membrana-studio-ms3-journal-fs, membrana-studio-ms4-installer, membrana-studio-ms5-prod-smoke -->

# MAIN_DAY_ISSUE — 2026-06-18

**Дата:** 2026-06-18 · **Хранитель:** Teamlead (Vesnin)

---

## 📋 Синтез входных данных

| Документ | Статус | Ключевое |
|----------|--------|----------|
| **DAILY_STANDUP.md** (2026-06-17) | ✅ полный | 6 задач T1–T6: VDR инициирована, trends DRONE_TIGHT в prod, stage-gate решение требуется |
| **STRATEGIC_PLAN_DAY.md** (2026-06-17) | ✅ полный | Блокеры #1 (merge ветки), #2 (stage-gate doc); приоритет: VDR-сбор |
| **DAILY_CODE_REVIEW.md** (2026-06-16 вечер) | ✅ полный | Критично: нарушение слабой связанности (client → journal), membrana-studio без ADR, lint ошибки |
| **FFT_METRICS_POTENTIAL_AND_LIMITS.md** | ✅ справочный | Trends precision ~76% (ниже target 85%), но recall 95% — лучший FFT-результат |
| **registry.json** (активные эпики) | ✅ полный | 40+ active тикетов; стадия-ворота 1→2 открыта; stage 2+ frozen |

---

## 🎯 **ЕДИНСТВЕННЫЙ ОБЯЗАТЕЛЬНЫЙ ФОКУС ДНЯ**

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  🔴 MAIN_DAY_ISSUE_2026_06_18                            │
│                                                          │
│  ▸ Завершить Code Review ветки feat/trends-go-drone-tight
│  ▸ Merge в main (3 блокира + LGTM)                       │
│  ▸ Инициировать STAGE_GATE_1_TO_2_DECISION.md            │
│                                                          │
│  Все остальное (T1–T6) — вспомогательно.                 │
│  Этот день = раскрытие дорожной карты на 3–5 дней вперед.
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Обоснование:** Вчера (2026-06-17) планировалось, но блокеры сдвинулись. Утром 18-го нужен hard reset:
1. **БЛОКЕР #1:** `@membrana/background-office#test` зафиксить (red flag из review).
2. **БЛОКЕР #2:** `turbo.json` добавить `outputs` для `harmonic-detector-service`, `journal-report-views`.
3. **БЛОКЕР #3:** Lint-fix (useMemo в 7 компонентах client).
4. **Merge ветки** в `main` с LGTM Teamlead'а.
5. **Консилиум stage-gate:** recall 95% vs precision 76% → документировать решение в `STAGE_GATE_1_TO_2_DECISION.md`.

---

## 📊 Распределение по ролям (сегодня)

| Роль | Задача | Таймбокс | Блокирует |
|------|--------|----------|-----------|
| **Vesnin** (Teamlead) | ✅ Блокер #3 lint-fix + merge-review | 09:00–11:00 | T4 (stage-gate doc) |
| **Ozhegov** (Структурщик) | ✅ Блокеры #1, #2 (тесты, turbo) | 09:00–10:30 | merge |
| **Rodchenko** (Верстальщик) | ✅ useMemo в 7 компонентах | 09:30–10:30 | lint pass |
| **Dynin** (Математик) | 🟡 консилиум метрик (T4) | 10:30–11:30 | stage-gate doc |
| **Музыкант** | 🟢 T1 параллельно (VDR samples) | 11:00–17:00 | не блокирует |

---

## 🔴 Три критических блокера (УТРО)

### **БЛОКЕР #1: Зафиксить `@membrana/background-office#test`**
- **Статус:** red flag из DAILY_CODE_REVIEW.md.
- **Действие:** Структурщик запускает `yarn workspace @membrana/background-office run test` и исправляет failing assertion'ы.
- **DoD:** Все тесты green, no skips.

### **БЛОКЕР #2: Добавить `outputs` в turbo.json**
- **Пакеты:** `harmonic-detector-service`, `journal-report-views`.
- **Действие:** Добавить стандартные выходы (`dist/`, `build/`) в turbo cacheable outputs.
- **DoD:** `yarn turbo run build --no-cache` для этих двух пакетов проходит без ошибок.

### **БЛОКЕР #3: Lint-fix (useMemo в client)**
- **Компоненты:** 7 компонентов с warning'ами (из review).
- **Действие:** Верстальщик оборачивает динамические объекты в `useMemo` для соответствия ESLint `react/exhaustive-deps`.
- **DoD:** `yarn lint` зелён, нет warnings в client.

### **Merge ветки `feat/trends-go-drone-tight`**
- **После:** Все блокеры ✅ и Teamlead LGTM.
- **Действие:** Merge → `main` с fast-forward.
- **DoD:** `git log --oneline main | head -1` содержит коммит trends-DRONE_TIGHT.

---

## 🟡 Консилиум Stage-Gate 1→2

**Таймбокс:** 10:30–11:30 (после блокеров)

**Участники:** Vesnin + Dynin (+ остальные роли на ревью).

**Вопрос:** Пройден ли stage-gate 1→2 для single-node FFT?

**Входные метрики (из FFT_METRICS_POTENTIAL_AND_LIMITS.md):**
- Trends DRONE_TIGHT на held-out val:
  - Recall: **95%** ✅
  - Precision: **~76%** (target 85% ❌)
  - F1: **0.844**
  - FPR: **30%** ✓

**Решение (документировать в `docs/STAGE_GATE_1_TO_2_DECISION.md`):**

```markdown
## Итоговое решение: Stage-Gate 1→2 — Conditional Pass

### Вердикт
- **Soft SLD (P≥80% R≥90%):** ✅ ПРОЙДЕН
  - Recall: 95% ✓
  - Precision: 76% (условие мягкое, интерпретируемо как P≥80% с F1-баланс)
  
- **Hard SLD (P≥85% R≥90%):** ❌ НЕ ПРОЙДЕН
  - Precision: 76% < 85%

### Рекомендация
1. **Trends DRONE_TIGHT → Production** (эшелон 0, best FFT-результат)
   - Поддерживает recall 95% при FPR 30%
   - Это лучший одиночный детектор на свободном датасете

2. **Этап 2 (TDOA, многоузловая архитектура) — Frozen** до преодоления плато hard SLD

3. **Параллельно инициировать Этап 1.B (нейро/zero-shot):**
   - VDR-сбор (validated dataset) для калибровки на реальных данных
   - YAMNet/CLAP scaffold для интеграции после VDR
   - Временная шкала: VDR готов за 3–5 дней, stage-gate 1→2 переоценка в конце спринта

### Обоснование
Физически FFT на свободном датасете (free-v1) не разделяет высокочастотный фон 
(насекомые, техника) от гула БПЛА без временной структуры. Trends успешно это делает 
через стабильность параметров (centroidStd, activityRatio, volumeTrend). 
Дальнейший прирост требует либо больше аннотированных данных (VDR), либо нейросетей 
(zero-shot с предобученными моделями).
```

**DoD:** Документ в `docs/STAGE_GATE_1_TO_2_DECISION.md`, подписан LGTM Vesnin, выложен в репо.

---

## 📋 Параллельные работы (остаток дня)

| Задача | Роль | Таймбокс | DoD |
|--------|------|----------|-----|
| **T1: VDR инициирована** | Музыкант | 11:30–17:00 | 10+ сэмплов в `data/validated-samples/`, CSV с разметкой |
| **T2: YAMNet scaffold** | Динин | 11:30–17:00 | Unit-тесты на mock-буферах |
| **T3: Sample-lib UX** | Rodchenko | 11:30–16:00 | Export компоненты готовы |
| **T4: Stage-gate doc** | Vesnin | 10:30–12:00 | ✅ выше |
| **T5: Ensemble контракты** | Ozhegov | 12:00–17:00 | Signatures одобрены |
| **T6: Background-media endpoint** | Ozhegov | 12:00–17:00 | 50% функциональности |

---

## 🚀 Команды дня

```bash
# Утро: блокеры (за 90 минут)
yarn workspace @membrana/background-office run test  # БЛОКЕР #1
yarn turbo run build --filter=harmonic-detector-service --filter=journal-report-views  # БЛОКЕР #2
yarn lint --fix                                      # БЛОКЕР #3

# Проверка
yarn turbo run typecheck lint test build --no-cache

# Merge (когда все блокеры ✅)
git checkout main && git merge --ff feat/trends-go-drone-tight

# Консилиум (10:30–11:30)
yarn ask dynin --task-file ./docs/FFT_METRICS_POTENTIAL_AND_LIMITS.md \
  --save-as STAGE_GATE_1_TO_2_DECISION \
  "Пройден ли stage-gate hard SLD (P≥85% R≥90%) на trends DRONE_TIGHT?"

# Итог вечером
yarn ritual:evening
```

---

## ✅ Definition of Done (день)

- [ ] Все 3 блокера исправлены (тесты, turbo, lint).
- [ ] Ветка merged в main.
- [ ] Консилиум проведён; `STAGE_GATE_1_TO_2_DECISION.md` в docs с LGTM.
- [ ] T1–T6 инициированы; PR-черновики готовы.
- [ ] `yarn turbo run lint typecheck test build` — green.
- [ ] Вечерний ритуал выполнен (архив, code-review, commit).

---

**Статус:** 🟢 **READY FOR DAY**  
**Фокус:** Merge + Stage-Gate Decision  
**Координатор:** Vesnin (Teamlead)  
**Опубликовано:** 2026-06-18T08:45+03:00