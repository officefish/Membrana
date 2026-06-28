<!--
  archive-role: archive-snapshot
  archive-day: 2026-06-28
  archived-at: 2026-06-28T18:31:13.857Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-06-28T05:50:32.106Z (yarn main-day-issue) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: single-node-detection-first, real-dataset-live-calibration, media-library-a3-mic-recorder, media-library-a4-sample-player, trends-fft-template-editor, background-media-v1, background-media-a5a-server, background-media-a5b-docker, background-media-a5c-deploy, background-media-a5d-swagger, membrane-platform-v1, cabinet-sample-library-v1, cabinet-sample-library-csl1-api, cabinet-sample-library-csl2-ui, cabinet-sample-library-csl3-remote-ops, cabinet-mp4-hardening-night-build, cabinet-mp4-nb0-merge-gate, cabinet-mp4-nb1-sample-playback-dry, cabinet-mp4-nb2-cabinet-facade, cabinet-mp4-nb3-quality-contracts, sample-library-drone-detection, sld3-dsp-detectors-free-v1, sld4-stage-gate-calibration, validated-drone-recognition, vdr1-sample-label-patch-api, vdr2-label-notes-ui, vdr3-ground-truth-export, vdr4-dsp-calibration-validated, vdr5-template-match-detector, vdr6-recognition-report-gate, drone-detector-detail-report, telemetry-journal-live-refactor, live-parallel-detection-sprint, lp1-mic-drone-stream-modes, lp1b-drone-detailed-report-server, lp2-fft-plugins-journal-sink, lp3-track-import-backpressure, lp4-parallel-detection-smoke, lp5-journal-report-renderers, cabinet-journal-hotfix, cj-0-trends-enabled-keys, cj-1-media-api-safe-json, cj-2-journal-media-decouple, cj-3-brief-render-parity, cj-4-trends-counts-as-detection, cj-5-sync-push-observability, module-catalog-v1, mc-0-catalog-regulation, mc-1-prompt-templates, mc-2-registry-microphone-pilot, mc-3-pilot-plugins, mc-4-telemetry-journal-stable, mc-5-remaining-modules-draft, mc-6-remaining-plugins-draft, mc-7-verify-script-ci, mc-8-agent-rules-integration, mc-9-stable-review, device-board-hackathon-1, db-h1b-board-shell, db-h1c-graph-serialize, db-h2a-json-import, db-h2b-scenario-runtime, db-h2c-mic-journal, db-h2d-cabinet-sync, db-h3a-trigger-stop, db-h3b-trigger-disconnect, db-h3c-subgraph, db-h4-alarm-close, membrane-node-realtime-gateway, membrane-node-realtime-nr0-contract, membrane-node-realtime-nr1-gateway, membrane-node-realtime-nr2-journal-ws, membrane-node-realtime-nr3-client-journal, membrane-node-realtime-nr4-mic-live, membrane-node-realtime-nr5-cabinet-live, membrane-node-realtime-nr6-prod-hardening, membrane-node-runtime-remote, mp7b-rt0-contract, mp7b-rt1-gateway, mp7b-rt2-client-runtime, mp7b-rt3-mode, mp7b-rt4-multinode-schema, mp7b-rt5-cabinet-nodes, mp7b-rt6-board-ux, mp7b-rt7-prod-hardening, deploy-pipeline-refactor, dpr-dr0-git-hygiene-gate, dpr-dr1-ci-gate, dpr-dr2-image-registry, dpr-dr3-rollback-runbook, dpr-dr4-smoke-suite, dpr-dr5-branch-migration-policy, dpr-dr6-client-delivery, dpr-dr7-zero-downtime, membrana-studio-desktop, device-board-refactor-v04, dbr-0-concept-core, dbr-1-fullscreen, dbr-2-variables, dbr-3-event-node, dbr-4-dataflow-resolve, dbr-5-palette-nodes, dbr-6-run-gating, device-board-cabinet-hotfix, dbh-0-canvas-overlay, dbh-1-sidebar-clamp, dbh-2-nav-split, dbh-3-delete-node, dbh-4-purge-expired-keys, device-board-w0-hotfix, db-w0-h3-selection-modal-keep, db-w0-h1-function-palette, db-w0-h2-copy-paste-hotkeys, db-doc-v04-mvp, db-recording-gate-v07, db-recording-gate-r4-scenario-smoke, db-post-usercase-roadmap, smoke-testing-s1-night-build, smoke-s1-nb0-gate-docs, smoke-s1-nb1-playwright-scaffold, smoke-s1-nb2-smoke-tests-testids, smoke-s1-nb3-optional-ci-workflow, smoke-s1-nb4-docs-handoff, usercase-mvp-v2-groups-async, ucv2-0-spec-lgtm, ucv2-1-graph-collapse, ucv2-2-freeze-async-tracks, ucv2-3-pack-verify, ucv2-4-operator-signoff, device-board-phase-3, db-p3-a1-usercase-catalog-service, db-p3-a2-runtime-validators, db-p3-a3-competition-restrictions -->

# MAIN_DAY_ISSUE — 2026-06-28

**Дата:** 2026-06-28 · **Координатор:** Vesnin (Teamlead)  
**Фокус:** Консилиум stage-gate 1→2 + разрешение #185 (boundary violation) + stabilize Phase 2b

---

## 🔴 **ЕДИНСТВЕННЫЙ ОБЯЗАТЕЛЬНЫЙ ФОКУС ДНЯ**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ⚡ MAIN_DAY_ISSUE_2026_06_28                            │
│                                                         │
│  1. Консилиум stage-gate 1→2 (09:00–10:00)             │
│     Метрики: recall 95% / precision 76% vs target      │
│     → STAGE_GATE_1_TO_2_DECISION.md                    │
│                                                         │
│  2. Разрешить #185 (boundary violation)                │
│     8 импортов usercase-catalog → device-board        │
│     → Refactor + PR ready для review                   │
│                                                         │
│  3. Fix #178 (async-v2 track upload fails)             │
│     Detached drone report blocked на async-job        │
│     → Root-cause identified + fix-план                │
│                                                         │
│  ⏱️  ТАЙМБОКС: 09:00–13:00 (4 часа)                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Обоснование:**
- **Консилиум stage-gate** определяет, блокирует ли precision ~76% переход к этапу 2.
- **#185 boundary refactor** критичен для архитектурной целостности и gate-проверки.
- **#178 async-v2** блокирует detached report, необходим для device-board smoke.

---

## 📊 Распределение по ролям (сегодня, 09:00–13:00)

| Роль | Главная задача | Таймбокс | DoD | Блокирует |
|------|---|---|---|---|
| **Vesnin** (Teamlead) | Консилиум gate + #185 граница | 09:00–11:00 | STAGE_GATE_1_TO_2_DECISION.md, LGTM | merge phase 2b |
| **Ozhegov** (Структурщик) | #185 refactor + #178 диагностика | 09:00–12:30 | PR #185 ready, root-cause #178 | Vesnin LGTM |
| **Rodchenko** (Верстальщик) | W0-hotfix #153 + smoke phase 2b | 09:00–13:00 | #153 merged, smoke done | lint pass |
| **Dynin** (Математик) | Консилиум метрик + C3 headroom | 09:00–13:00 | DECISION signed, C3 smoke | gate doc |
| **Kuryokhin** (Музыкант) | T1 VDR-сбор параллельно | 11:00–17:00 | 10+ сэмплов | не блокирует |

---

## 🔧 Три критических действия утром

### **Действие 1: Консилиум stage-gate 1→2 (09:00–10:00)**

**Участники:** Vesnin + Dynin + Ozhegov (advisory).

**Вопрос:** Пройден ли stage-gate для перехода к этапу 2?

**Входные метрики (FFT_METRICS_POTENTIAL_AND_LIMITS.md):**
```
Trends DRONE_TIGHT на held-out validation:
  Recall: 95% ✅
  Precision: ~76% ❌ (target 85%)
  F1: 0.844
  FPR: 30% ✓
```

**Решение (выбрать один вариант):**

**Вариант A: Conditional Pass (рекомендуемый)**
```markdown
## Вердикт: Conditional Pass

### Обоснование
- Soft SLD (P≥75% R≥90%): ✅ ПРОЙДЕН
  - Recall 95%, Precision 76% → F1 0.844 покрывает soft критерий
- Trends DRONE_TIGHT — лучший FFT-детектор; продолжаем в stage 1.B (ensemble)

### Действие
- ✅ Этап 1.B (ensemble single-node): ensemble-service skeleton, конкуренты
- ✅ Параллельно VDR-сбор (validated dataset) для улучшения precision
- ❌ Этап 2 (TDOA) остаётся frozen до финального решения в конце спринта
  (требуется precision ≥85% на реальных данных)
```

**Вариант B: Hard Requirement (консервативный)**
```markdown
## Вердикт: Hard SLD Failed

Precision 76% < target 85% → Stage 1.A не пройден.
Требуется:
1. Доработка trends (добавить конкуренты, ансамбль)
2. Или ускорить VDR + retrain на реальных данных

Этап 2 остаётся frozen.
```

**Документирование:** Файл `docs/seanses/stage-gate-1-2-decision-2026-06-28.md` с таблицей, решением, дальнейшими шагами.

**DoD:**
- [ ] Консилиум проведён (участники подписались).
- [ ] Решение документировано в docs/seanses/.
- [ ] LGTM Teamlead в файле.

---

### **Действие 2: Refactor #185 (boundary violation) — 09:30–12:30**

**Статус:** 8 импортов usercase-catalog → device-board нарушают архитектурную границу.

**Проблема:** `usercase-catalog-service` находится в `apps/client/src/modules/device-board/services/`, но импортирует типы из `device-board` и создаёт циклическую зависимость.

**Решение (выбрать один путь):**

**Путь A: Вынести UserCaseCatalogEntrySummary в @membrana/core (рекомендуемый)**
```typescript
// @membrana/core/src/device-board-types.ts
export interface UserCaseCatalogEntrySummary {
  id: string;
  name: string;
  description: string;
  tags: string[];
  thumbnail?: string;
}

// apps/client/src/modules/device-board/services/usercase-catalog-service.ts
import { UserCaseCatalogEntrySummary } from '@membrana/core';
```

**Путь B: Дублировать типы локально (если тип не переиспользуется)**
```typescript
// apps/client/src/modules/device-board/services/usercase-catalog-service.ts
interface LocalUserCaseCatalogEntry { … }
// Нет зависимостей от device-board типов
```

**Действие Структурщика (Ozhegov):**
1. Выбрать путь (обсудить с Teamlead в консилиуме).
2. Refactor: переместить типы ИЛИ дублировать и убрать импорты.
3. Проверить: `yarn lint` и `yarn turbo run typecheck --no-cache`.
4. PR с описанием решения (1 абзац).

**DoD:**
- [ ] #185 PR ready to review.
- [ ] Нет циклических импортов между usercase-catalog и device-board.
- [ ] Lint + typecheck green.

---

### **Действие 3: Диагностика #178 (async-v2 track upload fails) — 10:00–12:00**

**Статус:** `async-v2` upload зависает, detached-report не генерируется.

**Цепочка жизненного цикла:**
```
make-track (device-board)
  ↓
start-async-job (scenarioMicJournalBridge?)
  ↓
upload (где обрывается?)
  ↓
detached-report (замёрзло здесь)
```

**Действие Структурщика (Ozhegov):**
1. **Trace-исследование:**
   - Запустить `yarn workspace apps/client run dev` в режиме debug.
   - Load UserCase из device-board → track upload → Check console + network tab.
   - Где обрывается цепь?

2. **Root-cause гипотезы:**
   - `getDefaultMediaLibraryService()` не инициализирован?
   - Async-job storage не сохраняет state?
   - WebSocket/HTTP upload timeout?

3. **Документирование в PR/issue:**
   - Описать найденный bottleneck.
   - Предложить fix (может быть, небольшой patch).

**DoD:**
- [ ] Root-cause identified и задокументирован.
- [ ] Fix-план описан (1–2 абзаца).
- [ ] Если fix простой (< 30 мин) → merge; если сложный → добавить в backlog.

---

## 📋 Параллельные работы (остаток дня)

| Задача | Роль | Таймбокс | DoD |
|--------|------|----------|-----|
| **W0-H3 (#153): selection clearance** | Rodchenko | 09:00–11:00 | PR merged |
| **Smoke Phase 2b (alpha/beta/gamma)** | Rodchenko | 11:00–13:00 | Ошибки задокументированы |
| **C3 headroom-audit интеграция** | Dynin | 10:00–12:00 | Smoke-тест green |
| **T1 VDR-сбор параллельно** | Kuryokhin | 11:00–17:00 | 10+ сэмплов |

---

## 🚀 Команды дня

```bash
# Утро: Консилиум (09:00–10:00)
yarn ask dynin --task-file ./docs/FFT_METRICS_POTENTIAL_AND_LIMITS.md \
  --save-as STAGE_GATE_1_TO_2_DECISION \
  "Пройден ли stage-gate hard SLD (P≥85% R≥90%) на trends DRONE_TIGHT 95%/76%? \
   Или принимаем soft SLD (P≥75%) с условием VDR-эпика в 3–5 дней?"

# Проверка code качества
yarn turbo run lint typecheck test --no-cache

# Smoke Phase 2b
yarn workspace @membrana/client run dev &
# Device Board → Load UserCase → alpha scenario

# Headroom-audit smoke
yarn ritual:day  # включает ритуал, который проверит C3

# Вечер
yarn ritual:evening
```

---

## ✅ Definition of Done (день)

- [ ] **Консилиум завершён** → `STAGE_GATE_1_TO_2_DECISION.md` с LGTM Teamlead.
- [ ] **#185 refactor** → PR ready to review или merged.
- [ ] **#178 root-cause identified** → fix-план в issue или PR.
- [ ] **W0-H3 (#153) merged** → selection-clearance работает.
- [ ] **Smoke Phase 2b** → ошибки задокументированы в `docs/audit-phase-2b-smoke-2026-06-28.md`.
- [ ] **C3 headroom-audit интегрирована** → smoke-тест green.
- [ ] **`yarn turbo run lint typecheck test build`** → ✅ zero errors.
- [ ] **Вечерний ритуал выполнен** (`yarn ritual:evening`, архив + code-review).

---

**Статус:** 🟢 **READY FOR EXECUTION**  
**Фокус дня:** Консилиум + граница #185 + диагностика #178  
**Ответственность:** Vesnin (координация), Ozhegov (refactor + диаг.), Dynin (метрики)  
**Опубликовано:** 2026-06-28T05:49 UTC