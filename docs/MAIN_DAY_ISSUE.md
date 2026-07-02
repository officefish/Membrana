<!-- Сгенерировано: 2026-07-02T04:08:00.752Z (yarn main-day-issue) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: single-node-detection-first, real-dataset-live-calibration, media-library-a3-mic-recorder, media-library-a4-sample-player, trends-fft-template-editor, background-media-v1, background-media-a5a-server, background-media-a5b-docker, background-media-a5c-deploy, sample-library-drone-detection, sld3-dsp-detectors-free-v1, sld4-stage-gate-calibration, validated-drone-recognition, vdr1-sample-label-patch-api, vdr2-label-notes-ui, vdr3-ground-truth-export, vdr4-dsp-calibration-validated, vdr5-template-match-detector, vdr6-recognition-report-gate, live-parallel-detection-sprint, lp1-mic-drone-stream-modes, lp1b-drone-detailed-report-server, lp2-fft-plugins-journal-sink, lp3-track-import-backpressure, lp4-parallel-detection-smoke, lp5-journal-report-renderers, device-board-hackathon-1, db-h1b-board-shell, db-h1c-graph-serialize, db-h2a-json-import, db-h2b-scenario-runtime, db-h2c-mic-journal, db-h2d-cabinet-sync, db-h3a-trigger-stop, db-h3b-trigger-disconnect, db-h3c-subgraph, db-h4-alarm-close, membrane-node-realtime-gateway, membrane-node-realtime-nr0-contract, membrane-node-realtime-nr1-gateway, membrane-node-realtime-nr2-journal-ws, membrane-node-realtime-nr3-client-journal, membrane-node-realtime-nr4-mic-live, membrane-node-realtime-nr5-cabinet-live, membrane-node-realtime-nr6-prod-hardening, membrane-node-runtime-remote, mp7b-rt0-contract, mp7b-rt1-gateway, mp7b-rt2-client-runtime, mp7b-rt3-mode, mp7b-rt4-multinode-schema, mp7b-rt5-cabinet-nodes, mp7b-rt6-board-ux, mp7b-rt7-prod-hardening, deploy-pipeline-refactor, dpr-dr0-git-hygiene-gate, dpr-dr1-ci-gate, dpr-dr2-image-registry, dpr-dr3-rollback-runbook, dpr-dr4-smoke-suite, dpr-dr5-branch-migration-policy, dpr-dr6-client-delivery, dpr-dr7-zero-downtime, device-board-refactor-v04, dbr-0-concept-core, dbr-1-fullscreen, dbr-2-variables, dbr-3-event-node, dbr-4-dataflow-resolve, dbr-5-palette-nodes, dbr-6-run-gating, db-doc-v04-mvp, db-post-usercase-roadmap, usercase-mvp-v2-groups-async, ucv2-0-spec-lgtm, ucv2-1-graph-collapse, ucv2-2-freeze-async-tracks, ucv2-3-pack-verify, ucv2-4-operator-signoff, device-board-phase-3, db-p3-a1-usercase-catalog-service, db-p3-a2-runtime-validators, db-p3-a3-competition-restrictions, db-ap-r1-core-contracts, db-ap-r2-core-sequence-latent, db-ap-r3-async-job-store, db-ap-r4-sequence-latent-runtime, db-ap-r5-promise-nodes-editor, db-ap-r6-promise-nodes-executor, db-ap-r7-host-bridge-jobs, db-ap-r8-detached-event-dispatch, db-ap-r9-mvp-graph-v2, db-ap-r10-agenda-async-hub, db-ap-r11-observability-tests, db-ap-r12-docs-signoff, opencode-proxy-sprint-2026-06-25, oc-proxy-s0-research-isolation, oc-proxy-s1-opencode-install, oc-proxy-s2-freemodel-keys, oc-proxy-s3-llm-proxy-script, oc-proxy-s4-opencode-config, comp-packaging-catalog-2026-06-25, device-board-three-hosts-2026-06-26, db3h-s2-cabinet-host, db3h-s5-desktop-logging, db3h-s4-microphone-detectors, device-board-server-first, db-sf-0-canon, db-sf-1-core-contracts, db-sf-2-gateway-board, db-sf-3-cabinet-lease-api, db-sf-4-client-follower, db-sf-5-board-flags-ui, db-sf-6-nodes-runtime, db-sf-7-last-track-preview, db-sf-8-tests-smoke, db-sf-9-docs-sync, neural-tier-1b-contract, neural-free-tier-dataset-report, rag-dual-circuit-v1, rag-r6-closure, rag-r7-optional, fv1-s2-closeout -->

# MAIN_DAY_ISSUE — 2026-07-02

**Дата:** 2026-07-02 | **Координатор:** Vesnin (Teamlead)  
**Время генерации:** 04:30 UTC | **Статус:** Ready for human action

---

## 🔴 **ЕДИНСТВЕННЫЙ ОБЯЗАТЕЛЬНЫЙ ФОКУС ДНЯ**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ⚡ РАЗБЛОКИРОВКА ЭТАПА 2 + VDR-ИНИЦИАЦИЯ                    │
│                                                              │
│  🎯 МАГИСТРАЛЬ: VDR-протокол (09:00–14:00, 5 ч)             │
│     Lead: Vesnin + Ozhegov                                  │
│     DoD: VDR_PROTOCOL.md + validate-vdr-labels.mjs          │
│                                                              │
│  📦 ПАРАЛЛЕЛЬ: Zero-shot scaffold (13:00–15:00, 2 ч)        │
│     Lead: Ozhegov + Dynin                                   │
│     DoD: @membrana/zero-shot-detector компилируется         │
│                                                              │
│  ✅ ПАРАЛЛЕЛЬ: Stage-gate 1→2 doc (14:00–15:30, 1.5 ч)      │
│     Lead: Vesnin                                            │
│     DoD: STAGE_GATE_1_TO_2.md готов                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 Синхронизация со входными документами

**DAILY_STANDUP.md:** Вчерашние блокеры (lint @membrana/client, test @membrana/research-tree-demo) — требуют **немедленного fix в 06:00–09:00**.

**STRATEGIC_PLAN_DAY.md:** Три вектора на сегодня (VDR + zero-shot + stage-gate) — **все в MAIN_DAY_ISSUE**.

**DAILY_CODE_REVIEW.md:** P0 блокеры:
- ❌ `yarn lint typecheck` падают в @membrana/client
- ❌ Tests не проходят в @membrana/research-tree-demo
- ⚠️ Untracked mjs-timestamps в packages/services

---

## 📊 Три магистральных вектора дня

### **ВЕКТОР A: VDR-протокол (ГЛАВНЫЙ, 09:00–14:00)**

**Ответственность:** Vesnin (TL) + Ozhegov (Структурщик)

#### **Шаг 1: Утро (06:00–09:00) — Lint-fix и smoke**

```bash
# КРИТИЧНОЕ: зелёный тест перед основной работой
yarn turbo run lint typecheck --filter='@membrana/client' --filter='@membrana/research-tree-demo' --fix
yarn turbo run test --filter='@membrana/client'
yarn turbo run test --filter='@membrana/research-tree-demo'

# Валидация чистоты дерева
git status
# → должно быть: только tracked files, нет .txt-логов
```

**DoD к 09:00:**
- ✅ Все три пакета компилируются без ошибок
- ✅ Tests pass на @membrana/client
- ✅ Git-дерево чистое

#### **Шаг 2: Документ VDR_PROTOCOL.md (09:00–11:00, 2 часа)**

**Размещение:** `docs/VDR_PROTOCOL.md` (200–300 строк)

**Обязательные разделы:**

1. **Обзор:**
   - Определение: размеченный корпус free-v1 (ручные лейблы drone/not-drone)
   - Цель: валидация детекторов → stage-gate P≥85% R≥90%
   - Фазы: pilot (20–30) → alpha (100+) → beta (200+)

2. **Процесс аннотации:**
   - Инструмент: HTML-UI + прослушивание + radios
   - Консенсус: 2+ аннотатора → спорное → escalation
   - Метаданные: source, datetime, SNR, confidence

3. **Cohen's Kappa ≥0.75:**
   - Валидация межблюдателя
   - Спорные (< 0.6) → не входят в train/val

4. **Переоценка детекторов:**
   - Train 60% / val 20% / test 20%
   - `yarn benchmark:detectors --dataset vdr`
   - Метрики: P, R, F1 на каждом

5. **Gate решение:**
   - Если P≥85% R≥90% → **ПРОЙДЕН** → разморозить TDOA
   - Если нет → ensemble или zero-shot

#### **Шаг 3: Скрипты валидации (11:00–13:00, 2 часа)**

**1. `scripts/validate-vdr-labels.mjs`**
```bash
yarn validate:vdr --dataset free-v1-validated
# Output: { total_samples, labeled_samples, kappa_score, disputed_count, table }
```

**2. `scripts/prepare-vdr-annotations.mjs`**
```bash
yarn prepare:vdr-ui --output docs/datasets/free-v1/annotation-ui.html
```

**3. CI-интеграция (.github/workflows/vdr-validate.yml)**
```yaml
on: [pull_request, push]
jobs:
  validate-vdr:
    runs-on: ubuntu-latest
    steps:
      - run: yarn validate:vdr --strict
```

**DoD к 14:00:**
- ✅ docs/VDR_PROTOCOL.md завершён
- ✅ `yarn validate:vdr` работает
- ✅ `yarn prepare:vdr-ui` генерирует HTML
- ✅ CI-гейт в git (dry-run)

---

### **ВЕКТОР B: Zero-shot scaffold (ПАРАЛЛЕЛЬ, 13:00–15:00)**

**Ответственность:** Ozhegov (Структурщик) + Dynin (Математик)

#### **Фаза B.1: Выбор модели (13:00–13:30)**

**Dynin обновляет** `docs/prompts/INTEGRATIONS_STRATEGY.md`:
- ✅ Выбор: **CLAP v2** (HuggingFace, ~170 МБ, >80% accuracy)
- ✅ Link: `https://huggingface.co/laion/clap-htsat-unfused`
- ✅ Документировать: загрузка, инференс-контракт, edge-развёртывание

#### **Фаза B.2: Scaffold пакета (13:30–14:30)**

```bash
mkdir -p packages/services/detectors/zero-shot-detector/{src,__tests__}
```

**Структура:**
```
src/
├── index.ts
├── service.ts (stub DroneDetector)
├── types.ts (ZeroShotDetectionResult)
└── __tests__/service.spec.ts (smoke)
```

**Типы в @membrana/core:**
```typescript
export interface ZeroShotDetectionResult extends DetectionResult {
  modelVersion: string;
  embeddings?: number[];
}
```

#### **Фаза B.3: CI (14:30–15:00)**

```bash
yarn turbo run build --filter='@membrana/zero-shot-detector' ✅
yarn turbo run test --filter='@membrana/zero-shot-detector' ✅
```

**DoD к 15:00:**
- ✅ Пакет в git, компилируется
- ✅ Типы экспортированы
- ✅ PR открыт, marked `@experimental @stage 2`

---

### **ВЕКТОР C: Stage-gate 1→2 документирование (ПАРАЛЛЕЛЬ, 14:00–15:30)**

**Ответственность:** Vesnin (TL)

**Документ:** `docs/STAGE_GATE_1_TO_2.md` (300–400 строк)

**Структура:**

1. **Определение:** P≥85% R≥90% на одиночном детекторе
2. **Текущие метрики** (free-v1):
   | Детектор | P | R | F1 | Статус |
   |----------|---|---|-----|--------|
   | Trends DRONE_TIGHT | 76% | 95% | 0.844 | 🟡 |
   | Требование | **≥85%** | **≥90%** | — | |

3. **Чек-лист:**
   - VDR-pilot готов (≥20 сэмплов)
   - Cohen's Kappa ≥0.75
   - Переоценка даёт P≥85% R≥90%
   - Консилиум согласен

4. **Что нельзя до gate:**
   - ❌ @membrana/tdoa-service (scaffold/frozen)
   - ❌ @membrana/localizer-service
   - ❌ @membrana/tracker-service

**DoD к 15:30:**
- ✅ Документ завершён
- ✅ Связан с WHITE_PAPER §8
- ✅ Чек-лист раскрыт

---

## ✅ Definition of Done (день)

```
УТРО (06:00–09:00):
  ✅ yarn turbo run lint typecheck --fix pass
  ✅ yarn turbo run test pass
  ✅ Git дерево чистое

ДЕНЬ (09:00–15:30):
  ✅ docs/VDR_PROTOCOL.md завершён
  ✅ scripts/validate-vdr-labels.mjs работает
  ✅ scripts/prepare-vdr-annotations.mjs генерирует HTML
  ✅ @membrana/zero-shot-detector scaffold компилируется
  ✅ docs/STAGE_GATE_1_TO_2.md готов
  ✅ Все три вектора выдали артефакты в git

ВЕЧЕР (17:00–18:00):
  ✅ yarn ritual:evening выполнен
  ✅ WHITE_PAPER §8 обновлён
  ✅ docs/DAILY_CODE_REVIEW.md готов на завтра
```

---

## 📌 Приоритет

1. **ВЕКТОР A (VDR-протокол)** — разблокирует Этап 2
2. **ВЕКТОР B (Zero-shot)** — подготовка эшелона 2
3. **ВЕКТОР C (Stage-gate)** — документальное закрытие Этапа 1

**Если времени не хватит:** ВЕКТОР C может перейти на завтра; ВЕКТОР A — **must-have**.

---

**Статус:** 🟢 Ready for human action  
**Консилиум (если нужен):** `yarn consilium "уточнить VDR scope и stage-gate criteria"`