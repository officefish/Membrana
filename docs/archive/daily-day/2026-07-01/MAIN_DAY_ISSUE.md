<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-01
  archived-at: 2026-07-01T17:45:17.470Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-01T04:15:09.131Z (yarn main-day-issue) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: single-node-detection-first, real-dataset-live-calibration, media-library-a3-mic-recorder, media-library-a4-sample-player, trends-fft-template-editor, background-media-v1, background-media-a5a-server, background-media-a5b-docker, background-media-a5c-deploy, background-media-a5d-swagger, sample-library-drone-detection, sld3-dsp-detectors-free-v1, sld4-stage-gate-calibration, validated-drone-recognition, vdr1-sample-label-patch-api, vdr2-label-notes-ui, vdr3-ground-truth-export, vdr4-dsp-calibration-validated, vdr5-template-match-detector, vdr6-recognition-report-gate, drone-detector-detail-report, telemetry-journal-live-refactor, live-parallel-detection-sprint, lp1-mic-drone-stream-modes, lp1b-drone-detailed-report-server, lp2-fft-plugins-journal-sink, lp3-track-import-backpressure, lp4-parallel-detection-smoke, lp5-journal-report-renderers, module-catalog-v1, mc-0-catalog-regulation, mc-1-prompt-templates, mc-2-registry-microphone-pilot, mc-3-pilot-plugins, mc-4-telemetry-journal-stable, mc-5-remaining-modules-draft, mc-6-remaining-plugins-draft, mc-7-verify-script-ci, mc-8-agent-rules-integration, mc-9-stable-review, device-board-hackathon-1, db-h1b-board-shell, db-h1c-graph-serialize, db-h2a-json-import, db-h2b-scenario-runtime, db-h2c-mic-journal, db-h2d-cabinet-sync, db-h3a-trigger-stop, db-h3b-trigger-disconnect, db-h3c-subgraph, db-h4-alarm-close, membrane-node-realtime-gateway, membrane-node-realtime-nr0-contract, membrane-node-realtime-nr1-gateway, membrane-node-realtime-nr2-journal-ws, membrane-node-realtime-nr3-client-journal, membrane-node-realtime-nr4-mic-live, membrane-node-realtime-nr5-cabinet-live, membrane-node-realtime-nr6-prod-hardening, membrane-node-runtime-remote, mp7b-rt0-contract, mp7b-rt1-gateway, mp7b-rt2-client-runtime, mp7b-rt3-mode, mp7b-rt4-multinode-schema, mp7b-rt5-cabinet-nodes, mp7b-rt6-board-ux, mp7b-rt7-prod-hardening, deploy-pipeline-refactor, dpr-dr0-git-hygiene-gate, dpr-dr1-ci-gate, dpr-dr2-image-registry, dpr-dr3-rollback-runbook, dpr-dr4-smoke-suite, dpr-dr5-branch-migration-policy, dpr-dr6-client-delivery, dpr-dr7-zero-downtime, membrana-studio-desktop, device-board-refactor-v04, dbr-0-concept-core, dbr-1-fullscreen, dbr-2-variables, dbr-3-event-node, dbr-4-dataflow-resolve, dbr-5-palette-nodes, dbr-6-run-gating, device-board-cabinet-hotfix, dbh-0-canvas-overlay, dbh-1-sidebar-clamp, dbh-2-nav-split, dbh-3-delete-node, dbh-4-purge-expired-keys, device-board-w0-hotfix, db-w0-h3-selection-modal-keep, db-w0-h1-function-palette, db-w0-h2-copy-paste-hotkeys, db-doc-v04-mvp, db-post-usercase-roadmap, smoke-testing-s1-night-build, smoke-s1-nb0-gate-docs, smoke-s1-nb1-playwright-scaffold, smoke-s1-nb2-smoke-tests-testids, smoke-s1-nb3-optional-ci-workflow, smoke-s1-nb4-docs-handoff, usercase-mvp-v2-groups-async, ucv2-0-spec-lgtm, ucv2-1-graph-collapse, ucv2-2-freeze-async-tracks, ucv2-3-pack-verify, ucv2-4-operator-signoff, device-board-phase-3, db-p3-a1-usercase-catalog-service, db-p3-a2-runtime-validators, db-p3-a3-competition-restrictions, db-ap-r1-core-contracts, db-ap-r2-core-sequence-latent, db-ap-r3-async-job-store, db-ap-r4-sequence-latent-runtime, db-ap-r5-promise-nodes-editor, db-ap-r6-promise-nodes-executor, db-ap-r7-host-bridge-jobs, db-ap-r8-detached-event-dispatch, db-ap-r9-mvp-graph-v2, db-ap-r10-agenda-async-hub, db-ap-r11-observability-tests, db-ap-r12-docs-signoff, opencode-proxy-sprint-2026-06-25, oc-proxy-s0-research-isolation, oc-proxy-s1-opencode-install, oc-proxy-s2-freemodel-keys, oc-proxy-s3-llm-proxy-script, oc-proxy-s4-opencode-config, night-hunt-sprint-2026-06-25, nh-s1-office-module, nh-s2-fly-deploy, nh-s3-rituals, comp-packaging-catalog-2026-06-25, device-board-three-hosts-2026-06-26, db3h-s2-cabinet-host, db3h-s5-desktop-logging, db3h-s4-microphone-detectors, device-board-server-first, db-sf-0-canon, db-sf-1-core-contracts, db-sf-2-gateway-board, db-sf-3-cabinet-lease-api, db-sf-4-client-follower, db-sf-5-board-flags-ui, db-sf-6-nodes-runtime, db-sf-7-last-track-preview, db-sf-8-tests-smoke, db-sf-9-docs-sync, neural-tier-1b-contract, neural-free-tier-dataset-report, mcp-tooling-m1-codebase-memory, mcp-tooling-m2-headroom-pilot, mcp-tooling-m5-strategy-sync, rag-dual-circuit-v1, rag-r6-closure, rag-r7-optional, free-v1-sound-catalog, fv1-s2-content, fv1-s3-integration -->

# MAIN_DAY_ISSUE — 2026-07-01

**Дата:** 2026-07-01 · **Координатор:** Vesnin (Teamlead)  
**Время генерации:** 09:00 UTC · **Статус ветки:** chore/backlog-cleanup-s1-clean

---

## 🔴 **ЕДИНСТВЕННЫЙ ОБЯЗАТЕЛЬНЫЙ ФОКУС ДНЯ**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ⚡ MAIN_DAY_ISSUE_2026_07_01                                 │
│                                                              │
│  Инициировать VDR-протокол + закрепить Этап 1.A              │
│                                                              │
│  🎯 МАГИСТРАЛЬ: VDR-инфраструктура (Этап 2 подготовка)      │
│     Lead: Vesnin + Ozhegov                                  │
│     Таймбокс: 09:00–14:00 (5 часов)                         │
│     DoD: docs/VDR_PROTOCOL.md + скрипты валидации           │
│                                                              │
│  📦 ПАРАЛЛЕЛЬ 1: Zero-shot детектор scaffold                │
│     Lead: Ozhegov + Dynin                                   │
│     Таймбокс: 13:00–15:00 (2 часа)                          │
│     DoD: @membrana/zero-shot-detector компилируется         │
│                                                              │
│  ✅ ПАРАЛЛЕЛЬ 2: Stage-gate 1→2 документирование            │
│     Lead: Vesnin                                            │
│     Таймбокс: 14:00–15:30 (1.5 часа)                        │
│     DoD: STAGE_GATE_1_TO_2.md + чек-лист                    │
│                                                              │
│  ⏱️  РИТУАЛ УТРА: Lint-fix + smoke (06:00–09:00)             │
│  🎯 РИТУАЛ ВЕЧЕРА: Архив + code-review (17:00–18:00)        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 Синхронизация с входными документами

**DAILY_STANDUP.md:** Три критических блокера вчера (2026-06-29) закрыты:
- ✅ #178 диагностирована (async-v2 flow).
- ✅ #153 merged (W0-H3 selection).
- ✅ #187/#186-C2 завершены (headroom proxy + RAG).

**STRATEGIC_PLAN_DAY.md:** Шесть рекомендуемых задач на следующие дни:
- **4.1 VDR-протокол** ← **СЕГОДНЯ** (главный фокус).
- 4.2 Zero-shot scaffold ← **СЕГОДНЯ параллель**.
- 4.3 Stage-gate документирование ← **СЕГОДНЯ параллель**.
- 4.4–4.6 контента и контрактов ← следующие дни.

**DAILY_CODE_REVIEW.md:** Lint-ошибки в трёх пакетах требуют утреннего fix'а.

---

## 📊 Распределение по ролям

| Роль | Фокус | Таймбокс | Блокирует | DoD |
|------|-------|----------|-----------|-----|
| **Vesnin** (TL) | VDR-протокол инициация + stage-gate doc | 09:00–15:30 | Этап 2 разморозка | PROTOCOL.md + STAGE_GATE doc ✅ |
| **Ozhegov** (Структурщик) | VDR-скрипты + zero-shot scaffold | 09:00–15:00 | контракты готовы | validate-vdr-labels.mjs + scaffold ✅ |
| **Dynin** (Математик) | zero-shot выбор модели + типы | 13:00–15:00 | контракты TDOA | INTEGRATIONS обновлён + типы ✅ |
| **Rodchenko** (Верстальщик) | — | — | — | — |
| **Kuryokhin** (Музыкант) | — | — | — | — |

---

## 🔧 Три магистральных действия

### **ДЕЙСТВИЕ 1: VDR-протокол (инициация Этап 2)**

**Ответственность:** Vesnin + Ozhegov  
**Таймбокс:** 09:00–14:00

#### Фаза 1.1: Утренний ритуал + lint-fix (06:00–09:00)

```bash
# Зелёный тест перед началом
yarn turbo run lint typecheck test \
  --filter='@membrana/{client,trends-detector-service,template-match-detector}' \
  --force --fix

# Валидация контента
yarn prepare-free-v1-content --validate

# Smoke
yarn turbo run test --filter='@membrana/device-board'
```

**DoD к 09:00:**
- [ ] Все три пакета компилируются без ошибок.
- [ ] device-board smoke pass.
- [ ] Git-дерево чистое (нет случайных .txt логов).

#### Фаза 1.2: Документ VDR_PROTOCOL.md (09:00–11:00)

**Что включает:**

1. **Обзор VDR (Validated Dataset):**
   - Определение: размеченный корпус free-v1 с ручными лейблами (не только результаты trends).
   - Цель: переоценить детекторы на чистых данных → пройти stage-gate (P≥85% R≥90%).
   - Фазы: pilot (20–30 сэмплов) → alpha (100+) → beta (200+).

2. **Процесс аннотации:**
   - Инструмент: HTML-интерфейс (разработка 4.4) с прослушиванием + radios (drone/not-drone/disputed).
   - Консенсус: 2+ аннотатора → спорное → review-сеанс Vesnin.
   - Метаданные: source, datetime, location, signal-to-noise, confidence.

3. **Валидация консенсуса:**
   - Cohen's Kappa ≥ 0.75 (substantial agreement).
   - Спорные сэмплы (Kappa < 0.6) → escalation (не входят в train/val).
   - Скрипт: `validate-vdr-labels.mjs` (разработка 1.3).

4. **Переоценка детекторов:**
   - Train-val-test split: 60% / 20% / 20% из VDR.
   - Benchmark: `yarn benchmark:detectors --dataset vdr` (новый флаг).
   - Метрики: P, R, F1 на каждом детекторе (harmonic, cepstral, trends).
   - Reporting: `docs/VDR_BENCHMARK_REPORT.md` (автогенерируется после каждого run).

5. **Stage-gate решение:**
   - Если P≥85% R≥90% → gate **ПРОЙДЕН** → разморозить Этап 2 (TDOA).
   - Если нет → итерация: либо ensemble (fusion harmonic + trends), либо нейро (zero-shot).
   - Timeline: VDR-pilot к концу недели (задача 4.4).

**Документ разместить:** `docs/VDR_PROTOCOL.md` (200–300 строк, чёткая структура).

#### Фаза 1.3: Скрипты валидации (11:00–13:00)

**1. `scripts/validate-vdr-labels.mjs`**
```bash
yarn validate:vdr --dataset free-v1-validated
# Выход: report {
#   total_samples, labeled_samples, kappa_score, disputed_count,
#   table: [{ file_id, label, confidence, kappa }]
# }
```

**2. `scripts/prepare-vdr-annotations.mjs`**
```bash
yarn prepare:vdr-ui --output docs/datasets/free-v1/annotation-ui.html
# Генерирует интерфейс для локальной аннотации
```

**3. Интеграция в CI:**
```yaml
# .github/workflows/vdr-validate.yml
on: [pull_request, push]
jobs:
  validate-vdr:
    runs-on: ubuntu-latest
    steps:
      - run: yarn validate:vdr --strict
```

**DoD к 14:00:**
- [ ] `docs/VDR_PROTOCOL.md` завершён (чёткая структура + примеры).
- [ ] `scripts/validate-vdr-labels.mjs` работает: `yarn validate:vdr` выдаёт JSON-отчёт.
- [ ] `scripts/prepare-vdr-annotations.mjs` генерирует HTML.
- [ ] Оба скрипта в git, CI-гейт запущен (dry-run на текущих данных).

---

### **ДЕЙСТВИЕ 2: Zero-shot детектор scaffold (параллель)**

**Ответственность:** Ozhegov + Dynin  
**Таймбокс:** 13:00–15:00

#### Фаза 2.1: Выбор модели (13:00–13:30)

**Dynin (Математик):**
1. Обновить `docs/prompts/INTEGRATIONS_STRATEGY.md`:
   - Конкретный выбор: **CLAP** или **YAMNet**?
   - Критерии: размер (<200 МБ), accuracy (>80% на benchmark), поддержка WebGL.
   - Рекомендация: **CLAP v2** (universal audio representation, HuggingFace, ~170 МБ).
   - Link: `https://huggingface.co/laion/clap-htsat-unfused`.
2. Документировать: загрузка модели, инференс-контракт, edge-развёртывание.

#### Фаза 2.2: Scaffold пакета (13:30–14:30)

**Ozhegov (Структурщик):**
```bash
mkdir -p packages/services/detectors/zero-shot-detector/{src,__tests__}
touch packages/services/detectors/zero-shot-detector/{package.json,tsconfig.json,vite.config.ts}
```

**Структура:**
```
packages/services/detectors/zero-shot-detector/
├── package.json
│   └── {
│       "name": "@membrana/zero-shot-detector-service",
│       "dependencies": { "@membrana/core": "*", "@membrana/audio-engine": "*" }
│     }
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── index.ts (экспорт ZeroShotDetectorService)
    ├── service.ts (заглушка, implements DroneDetector)
    ├── types.ts (ZeroShotDetectionResult extends DetectionResult)
    └── __tests__/
        └── service.spec.ts (smoke test)
```

**Типы в `@membrana/core/src/detectors/`:**
```typescript
export interface ZeroShotDetectionResult extends DetectionResult {
  modelVersion: string;  // e.g. "clap-v2"
  embeddings?: number[];  // optional audio embedding
  topK?: Array<{ class: string; score: number }>;  // если есть многоклассовая выход
}
```

#### Фаза 2.3: CI интеграция (14:30–15:00)

- Scaffold компилируется: `yarn turbo run build --filter='@membrana/zero-shot-detector'` ✅
- Тесты (smoke): `yarn turbo run test --filter='@membrana/zero-shot-detector'` ✅

**DoD к 15:00:**
- [ ] Пакет в git, компилируется без ошибок.
- [ ] Типы экспортированы из `@membrana/core`.
- [ ] PR открыт, marked `@experimental @stage 2`.

---

### **ДЕЙСТВИЕ 3: Stage-gate 1→2 документирование (параллель)**

**Ответственность:** Vesnin  
**Таймбокс:** 14:00–15:30

#### Фаза 3.1: Документ STAGE_GATE_1_TO_2.md (14:00–15:00)

**Структура (300–400 строк):**

1. **Что такое Stage-Gate 1→2:**
   - Обязательный шлюз WHITE_PAPER §8.
   - Условие: P≥85% R≥90% на одиночном детекторе.
   - Разблокирует: TDOA, мультиузловую синхронизацию, локализацию.

2. **Текущие метрики (free-v1):**
   | Детектор | Precision | Recall | F1 | Статус |
   |----------|-----------|--------|-----|--------|
   | Harmonic | 43.6% | 68.3% | 0.532 | ❌ |
   | Cepstral | — | 100% | — | ❌ FPR 100% |
   | Spectral-flux | — | 87% | — | ❌ FPR 100% |
   | Trends DRONE_TIGHT | 76% | 95% | 0.844 | 🟡 R OK, P не OK |
   | **Требование** | **≥85%** | **≥90%** | — | |

3. **Чек-лист прохождения:**
   - [ ] VDR-датасет готов (pilot ≥20 сэмплов, alpha ≥100).
   - [ ] Переоценка детектора на VDR дала P≥85% R≥90%.
   - [ ] Документирование разделения train/val/test.
   - [ ] Reproduce-скрипт: `yarn benchmark:detectors --dataset vdr`.
   - [ ] Консилиум: все 5 ролей согласны с решением.

4. **Сроки разблокировки (спринт-дни, без абсолютных дат):**
   - VDR-pilot: дни 1–3 спринта (задача 4.4 STRATEGIC_PLAN_DAY).
   - Переоценка: дни 3–5.
   - Консилиум + решение: день 6.
   - Если пройден: день 7 — разморозить Этап 2.

5. **Что нельзя начинать до gate:**
   - ❌ `@membrana/tdoa-service` (остаётся в scaffold/frozen).
   - ❌ `@membrana/localizer-service`.
   - ❌ `@membrana/tracker-service`.
   - 