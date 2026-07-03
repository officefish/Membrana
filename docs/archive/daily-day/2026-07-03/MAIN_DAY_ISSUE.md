<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-03
  archived-at: 2026-07-03T13:49:15.651Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-03T04:56:35.448Z (yarn main-day-issue) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: single-node-detection-first, real-dataset-live-calibration, media-library-a3-mic-recorder, media-library-a4-sample-player, trends-fft-template-editor, background-media-v1, background-media-a5a-server, background-media-a5b-docker, background-media-a5c-deploy, sample-library-drone-detection, sld3-dsp-detectors-free-v1, sld4-stage-gate-calibration, validated-drone-recognition, vdr1-sample-label-patch-api, vdr2-label-notes-ui, vdr3-ground-truth-export, vdr4-dsp-calibration-validated, vdr5-template-match-detector, vdr6-recognition-report-gate, live-parallel-detection-sprint, lp1-mic-drone-stream-modes, lp1b-drone-detailed-report-server, lp2-fft-plugins-journal-sink, lp3-track-import-backpressure, lp4-parallel-detection-smoke, lp5-journal-report-renderers, device-board-hackathon-1, db-h1b-board-shell, db-h1c-graph-serialize, db-h2a-json-import, db-h2b-scenario-runtime, db-h2c-mic-journal, db-h2d-cabinet-sync, db-h3a-trigger-stop, db-h3b-trigger-disconnect, db-h3c-subgraph, db-h4-alarm-close, membrane-node-realtime-gateway, membrane-node-realtime-nr0-contract, membrane-node-realtime-nr1-gateway, membrane-node-realtime-nr2-journal-ws, membrane-node-realtime-nr3-client-journal, membrane-node-realtime-nr4-mic-live, membrane-node-realtime-nr5-cabinet-live, membrane-node-realtime-nr6-prod-hardening, membrane-node-runtime-remote, mp7b-rt0-contract, mp7b-rt1-gateway, mp7b-rt2-client-runtime, mp7b-rt3-mode, mp7b-rt4-multinode-schema, mp7b-rt5-cabinet-nodes, mp7b-rt6-board-ux, mp7b-rt7-prod-hardening, deploy-pipeline-refactor, dpr-dr0-git-hygiene-gate, dpr-dr1-ci-gate, dpr-dr2-image-registry, dpr-dr3-rollback-runbook, dpr-dr4-smoke-suite, dpr-dr5-branch-migration-policy, dpr-dr6-client-delivery, dpr-dr7-zero-downtime, device-board-refactor-v04, dbr-0-concept-core, dbr-1-fullscreen, dbr-2-variables, dbr-3-event-node, dbr-4-dataflow-resolve, dbr-5-palette-nodes, dbr-6-run-gating, db-doc-v04-mvp, db-post-usercase-roadmap, usercase-mvp-v2-groups-async, ucv2-0-spec-lgtm, ucv2-1-graph-collapse, ucv2-2-freeze-async-tracks, ucv2-3-pack-verify, ucv2-4-operator-signoff, device-board-phase-3, db-p3-a1-usercase-catalog-service, db-p3-a2-runtime-validators, db-p3-a3-competition-restrictions, db-ap-r1-core-contracts, db-ap-r2-core-sequence-latent, db-ap-r3-async-job-store, db-ap-r4-sequence-latent-runtime, db-ap-r5-promise-nodes-editor, db-ap-r6-promise-nodes-executor, db-ap-r7-host-bridge-jobs, db-ap-r8-detached-event-dispatch, db-ap-r9-mvp-graph-v2, db-ap-r10-agenda-async-hub, db-ap-r11-observability-tests, db-ap-r12-docs-signoff, opencode-proxy-sprint-2026-06-25, oc-proxy-s0-research-isolation, oc-proxy-s1-opencode-install, oc-proxy-s2-freemodel-keys, oc-proxy-s3-llm-proxy-script, oc-proxy-s4-opencode-config, comp-packaging-catalog-2026-06-25, device-board-three-hosts-2026-06-26, ci-gate-stabilization, cg1-flaky-rag-service, cg2-two-tier-test-gate, cg3-flaky-metrics-week, cg4-ci-testing-docs, db3h-s2-cabinet-host, db3h-s5-desktop-logging, db3h-s4-microphone-detectors, device-board-server-first, db-sf-0-canon, db-sf-1-core-contracts, db-sf-2-gateway-board, db-sf-3-cabinet-lease-api, db-sf-4-client-follower, db-sf-5-board-flags-ui, db-sf-6-nodes-runtime, db-sf-7-last-track-preview, db-sf-8-tests-smoke, db-sf-9-docs-sync, neural-tier-1b-contract, neural-free-tier-dataset-report, rag-dual-circuit-v1, rag-r6-closure, rag-r7-optional, fv1-s2-closeout, db-scenario-selector -->

# MAIN_DAY_ISSUE — 2026-07-03

**Дата:** 2026-07-03 | **Координатор:** Vesnin (Teamlead)  
**Время генерации:** 04:55 UTC | **Статус:** Ready for human action

---

## 🔴 **ЕДИНСТВЕННЫЙ ОБЯЗАТЕЛЬНЫЙ ФОКУС ДНЯ**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ⚡ VALIATION & STAGE-GATE CLEARANCE (VDR-INITIATION)        │
│                                                              │
│  🎯 ГЛАВНАЯ МАГИСТРАЛЬ: VDR-Protocol (09:00–14:00, 5 ч)      │
│     Lead: Vesnin + Ozhegov                                  │
│     Артефакт: docs/VDR_PROTOCOL.md + validate-vdr.mjs      │
│     DoD: Протокол завершён, скрипты работают                │
│                                                              │
│  📦 ПАРАЛЛЕЛЬ A: Zero-shot scaffold (13:00–15:00, 2 ч)      │
│     Lead: Ozhegov + Dynin                                   │
│     Артефакт: @membrana/zero-shot-detector live            │
│     DoD: Пакет компилируется, контракт реализован           │
│                                                              │
│  ✅ ПАРАЛЛЕЛЬ B: Stage-gate 1→2 doc (14:00–15:30, 1.5 ч)    │
│     Lead: Vesnin                                            │
│     Артефакт: docs/STAGE_GATE_1_TO_2.md                    │
│     DoD: Чек-лист и критерии gate зафиксированы            │
│                                                              │
│  🟢 УТРЕННЯЯ БЛОКИРУЮЩАЯ ФАЗА: Lint/Test (06:00–09:00, 3 ч) │
│     Lead: Ozhegov + Rodchenko                               │
│     Артефакт: Зелёный статус main                          │
│     DoD: @membrana/client && @membrana/research-tree-demo  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📌 Синхронизация с входными документами

| Источник | Ключевой вывод | Как попадает в MAIN_DAY_ISSUE |
|----------|----------------|-----------------------------| 
| **DAILY_STANDUP.md** | ❌ 2 блокера: lint/test падают в @membrana/client и research-tree-demo | **ФАЗА 0 (06:00–09:00)** — fix-on-arrival |
| **STRATEGIC_PLAN_DAY.md** | 3 вектора: VDR + zero-shot + stage-gate docs | **ФАЗЫ 1–3 (09:00–15:30)** — магистраль + параллели |
| **DAILY_CODE_REVIEW.md** | P0: lint/typecheck/test; P2: git-гигиена | **ФАЗА 0 + вечер (cleanup)** |
| **FFT_METRICS_POTENTIAL_AND_LIMITS.md** | Trends-DRONE_TIGHT пройден (95%/30%), hard-gate требует нового датасета (VDR) | **Контекст VDR-инициации** |

---

## 🕐 Временна́я кодировка дня

### **ФАЗА 0: Утренняя стабилизация (06:00–09:00, критичная)**

**Ответственность:** Ozhegov (Структурщик) + Rodchenko (Верстальщик)

```bash
# Шаг 1: Диагностика (06:00–06:30)
git status
yarn turbo run lint typecheck --filter='@membrana/client' --filter='@membrana/research-tree-demo' 2>&1 | tee /tmp/lint-report.txt

# Шаг 2: Автоправки (06:30–07:30)
yarn turbo run lint typecheck --filter='@membrana/client' --filter='@membrana/research-tree-demo' --fix

# Шаг 3: Unit-тесты (07:30–08:30)
yarn turbo run test --filter='@membrana/client' --filter='@membrana/research-tree-demo'

# Шаг 4: Git-гигиена (08:30–09:00)
# Удалить логи, зафиксировать статус
rm -f deploy-*.txt *.mjs.timestamp
git status  # → only tracked files, no .txt-logs
```

**DoD к 09:00:**
- ✅ `yarn turbo run lint typecheck` pass на обоих пакетах
- ✅ `yarn turbo run test` pass
- ✅ Git дерево чистое (no untracked .txt-logs)
- ✅ Smoke-тест аудиомодуля: `yarn turbo run test --filter='@membrana/audio-engine'` pass
- ✅ **Merge `feat/db-capture-tariff-v2-integration` → main** после green

**Роль Teamlead:** Контроль статуса; если блокер нерешим → переназначить ФАЗУ 1 на утро (+3ч) и пересчитать планы.

---

### **ФАЗА 1: VDR-Протокол (09:00–14:00, магистраль)**

**Ответственность:** Vesnin (TL, нарратив) + Ozhegov (структура)

#### **1.1 Документ `docs/VDR_PROTOCOL.md` (09:00–11:00)**

**Объём:** 250–350 строк Markdown  
**Место:** `/docs/VDR_PROTOCOL.md`

**Обязательные разделы:**

```markdown
# VDR Protocol: Validated Drone Recognition

## 1. Overview
- **Определение:** Размеченный корпус free-v1; целевые лейблы drone / not-drone
- **Цель:** Валидация детекторов для stage-gate (P ≥ 85%, R ≥ 90%)
- **Фазы:** 
  - Pilot: 20–30 сэмплов, консенсус 2+ аннотатора
  - Alpha: 100+ сэмплов
  - Beta: 200+ сэмплов (если нужно уточнение)

## 2. Annotation Process
- **Инструмент:** HTML-UI (прослушивание + radio-бокс drone/not-drone)
- **Консенсус:** Cohen's Kappa ≥ 0.75 между двумя аннотаторами
- **Disputations:** Если Kappa < 0.6, сэмпл → ручной разбор (3-й эксперт) или исключение
- **Метаданные:** source (free-v1-file), datetime, SNR-estimate, confidence

## 3. Cohen's Kappa ≥ 0.75
- Формула и интерпретация
- Пороги: >= 0.75 ✅, 0.60–0.74 🟡 (escalation), < 0.60 ❌ (exclude)

## 4. Detector Re-evaluation
- **Split:** Train 60% / Val 20% / Test 20% (стратифицировано по классам)
- **Запуск:** `yarn benchmark:detectors --dataset vdr --splits validated`
- **Метрики:** Precision, Recall, F1 для каждого детектора

## 5. Gate Decision
- **Условие PASS:** P ≥ 85% AND R ≥ 90% на валидационном сете
- **Если PASS:** Разморозить TDOA-сервис (Этап 2)
- **Если FAIL:** Ensemble детекторов ИЛИ zero-shot (YAMNet/CLAP)
- **Document:** Решение в [STAGE_GATE_1_TO_2.md]
```

**DoD к 11:00:**
- ✅ Документ размещён в git
- ✅ Все 5 разделов раскрыты
- ✅ Ссылки на связанные docs (WHITE_PAPER, DETECTOR_BENCHMARK)

---

#### **1.2 Скрипты валидации (11:00–13:00)**

**Скрипт 1: `scripts/validate-vdr-labels.mjs`**

```bash
yarn validate:vdr --dataset free-v1-validated [--output json|table]

# Output примера:
# {
#   "total_samples": 120,
#   "labeled_samples": 115,
#   "unlabeled": 5,
#   "drone_count": 58,
#   "not_drone_count": 57,
#   "kappa_score": 0.78,
#   "disputed_count": 3,
#   "comparison_table": [
#     { "sample_id": "...", "annotator1": "drone", "annotator2": "not-drone", "agreement": false }
#   ]
# }
```

**Скрипт 2: `scripts/prepare-vdr-annotations.mjs`**

```bash
yarn prepare:vdr-ui --output docs/datasets/free-v1/annotation-ui.html

# Генерирует HTML с:
# - Списком файлов из free-v1
# - Плеером WAV
# - Radio-боксом drone / not-drone / unclear
# - Сохранением в JSON локально (для последующей заливки в VDR)
```

**Скрипт 3: CI-регистрация (`.github/workflows/vdr-validate.yml`)**

```yaml
name: VDR Validate
on: [pull_request, push]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: yarn install
      - run: yarn validate:vdr --dataset free-v1-validated --strict
        # Fails if kappa < 0.70 или missing-labels > 10%
```

**DoD к 13:00:**
- ✅ Оба скрипта компилируются и работают без ошибок
- ✅ `yarn validate:vdr` на test-датасете (mock) выдаёт корректный JSON
- ✅ `yarn prepare:vdr-ui` генерирует валидный HTML
- ✅ CI-워크플로 добавлена в `.github/workflows/`

---

### **ФАЗА 2: Zero-shot Scaffold (13:00–15:00, параллель A)**

**Ответственность:** Ozhegov (структура) + Dynin (контракт модели)

#### **2.1 Выбор и документирование модели (13:00–13:30)**

**Dynin обновляет** `docs/prompts/INTEGRATIONS_STRATEGY.md` (раздел Zero-shot Models):

```markdown
## Zero-shot Models for Drone Detection

### CLAP v2 (HuggingFace)
- **Link:** https://huggingface.co/laion/clap-htsat-unfused
- **Size:** ~170 MB
- **Accuracy:** Contrastive learning; 80%+ on unseen audio categories
- **Inference:** ONNX Runtime or PyTorch (latency ~50–100ms per window)
- **Integration:** @membrana/zero-shot-detector service

### YAMNet (Google)
- **Link:** https://github.com/google-research/perceptual-learning-of-audio
- **Size:** ~3.5 MB (quantized)
- **Output:** Multi-label classification (aircraft, helicopter, drone, wind, rain, …)
- **Integration:** Adaptive labels → isDrone ∈ {drone, helicopter, aircraft}

---
```

**DoD к 13:30:**
- ✅ docs/prompts/INTEGRATIONS_STRATEGY.md обновлена
- ✅ Ссылки на модели и ремарки о latency/accuracy

---

#### **2.2 Scaffold пакета (13:30–14:30)**

```bash
mkdir -p packages/services/detectors/zero-shot-detector/{src,__tests__}
```

**Структура файлов:**

```
packages/services/detectors/zero-shot-detector/
├── src/
│   ├── index.ts                    # Re-exports
│   ├── service.ts                  # ZeroShotDetector class
│   ├── types.ts                    # ZeroShotDetectionResult interface
│   ├── model-loader.ts             # stub: load CLAP/YAMNet
│   └── inference.ts                # stub: run inference on AudioWindow
├── __tests__/
│   └── service.spec.ts             # Smoke tests
├── package.json                    # @membrana/zero-shot-detector
└── README.md                       # Usage & API

```

**`src/service.ts` (stub):**

```typescript
import { DroneDetector, DetectionResult } from '@membrana/detector-base';

export class ZeroShotDetector implements DroneDetector {
  constructor(private modelVersion: string) {}

  async detect(window: AudioWindow): Promise<DetectionResult> {
    // TODO: Load CLAP/YAMNet embeddings
    // TODO: Compare audio embedding with "drone" reference
    return {
      isDrone: false,
      confidence: 0,
      reasoning: 'Stub: not yet implemented',
    };
  }

  async getConfig(): Promise<DetectorConfig> {
    return {
      name: 'zero-shot-detector',
      modelVersion: this.modelVersion,
      stage: 'experimental',
    };
  }
}
```

**`__tests__/service.spec.ts`:**

```typescript
import { ZeroShotDetector } from '../src/service';

describe('ZeroShotDetector', () => {
  it('should instantiate', () => {
    const detector = new ZeroShotDetector('clap-v2');
    expect(detector).toBeDefined();
  });

  it('should return stub detection', async () => {
    const detector = new ZeroShotDetector('clap-v2');
    const mockWindow: AudioWindow = { /* ... */ };
    const result = await detector.detect(mockWindow);
    expect(result.isDrone).toBe(false);
    expect(result.confidence).toBe(0);
  });
});
```

**DoD к 14:30:**
- ✅ Пакет структурирован по SERVICES.md
- ✅ Реализует контракт DroneDetector из @membrana/detector-base
- ✅ Unit-тесты проходят (`yarn test`)
- ✅ Нет зависимостей на другие детекторные сервисы (чистая архитектура)

---

#### **2.3 CI & PR (14:30–15:00)**

```bash
# Build & Test
yarn turbo run build --filter='@membrana/zero-shot-detector'
yarn turbo run test --filter='@membrana/zero-shot-detector'

# Create branch & PR
git checkout -b feat/zero-shot-detector-scaffold
git add packages/services/detectors/zero-shot-detector/
git commit -m "feat: