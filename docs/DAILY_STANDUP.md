<!-- Сгенерировано: 2026-07-04T07:19:03.742Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (18), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# 📊 ЕЖЕДНЕВНЫЙ СТЕНДАП MEMBRANA — 2026-07-04

**Время:** 07:15 UTC | **Статус:** Ready for team sync  
**Входные документы:** вчерашний code-review + стратплан + открытые issues

---

## 🎯 СИНТЕЗ: Вчера → Сегодня

### ✅ Вчера вечером (код-ревью, T0/T1)

| Что | Статус | Примечание |
|-----|--------|-----------|
| **SC1–SC5** (studio-capture спринт) | ✅ Merged | Все 4 PR'а в main; backgroundThrottling off, focus-on-acquire, shell-logs, version-handshake |
| **HG2** (VDR-валидация плагин) | ✅ Merged | Device-board module, trends на пилоте, gate-badge (hard/soft/fail) |
| **HG3-механика** (benchmark v0.2) | ✅ Completed | template-match DRONE_TIGHT: **P 67.5% / R 90.0%** на v0.2; preliminary пилот P 52% (hard negatives) |
| **Lint/Test** | 🟡 2x P2 warning | react-hooks/exhaustive-deps в UserCaseSettingsPanel (style, не logic) |
| **Git tree** | ✅ Clean | Нет .txt-логов, ready for deploy |

### 📋 Входы сегодня (08:00)

1. **DAILY_CODE_REVIEW.md** → 2x P2 warning, иначе ✅
2. **STRATEGIC_PLAN_DAY.md** → 6 параллельных задач (4.1–4.6), приоритет: 4.1 (DRONE_TIGHT curated) → 4.2 (VDR разметка)
3. **FFT_METRICS_POTENTIAL_AND_LIMITS.md** → потолок эшелона 0: trends R 95% / FPR 30% ✅ прошёл; DSP отдельно не проходит
4. **Open GitHub Issues** (6 live):
   - #236 (ST7: tray emergency stop) — risk, отложено
   - #195–#197 (Intern T1–T3) — онбординг, не блокер
   - #187 (C6: headroom proxy perf) — agent-optimization, параллель
   - #95 (DBR v0.4) — device-board refactor, backlog
   - #94, #92, #59 — backlog/тех-долг

5. **packages/temp** наброски → **нет активных черновиков** (last clean-up 2026-07-03)

---

## 🔴 **ГЛАВНЫЙ ФОКУС СЕГОДНЯ** (обязательный)

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  ЗАДАЧА 4.1: Куратирование DRONE_TIGHT в production      ║
║                                                            ║
║  🎯 Цель:  Внедрить DRONE_TIGHT шаблон в каталог         ║
║            template-match и переснять canonical v0.3       ║
║                                                            ║
║  Ответ:    Музыкант (параметры) + Математик (тесты)      ║
║  Размер:   M (4–5 часов)                                  ║
║  DoD:      ✓ Шаблон в catalog                            ║
║            ✓ v0.3 benchmark: P≥65% / R≥88% / F1≥0.75     ║
║            ✓ DETECTOR_BENCHMARK.md обновлён              ║
║                                                            ║
║  Блокирует: 4.2 (VDR разметка), stage-gate 1→2           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### 🕐 Квота времени

- **09:00–13:00** — основной пул (4 часа)
- **13:00–14:00** — буфер + параллели (A: zero-shot scaffold, B: hard-gate doc)

---

## 📝 План дня (по блокам)

### **БЛОК 0: Morning standup & issue triage (08:00–09:00, обязательно)**

```bash
# Во время синхронизации команды
yarn lint --filter=@membrana/client --fix   # react-hooks warning
yarn test --filter=@membrana/client         # smoke test

# Git-гигиена
rm -f deploy-*.txt cabinet-recover*.txt prod-check.txt
git status  # → только tracked files
```

**DoD к 09:00:**
- ✅ lint/typecheck pass
- ✅ test pass
- ✅ Git чистое дерево
- ✅ Все 5 членов команды прочитали MAIN_DAY_ISSUE

---

### **БЛОК 1: DRONE_TIGHT Curated Catalog (09:00–13:00, магистраль)**

#### **1.1 Финализация параметров шаблона (Музыкант, 09:00–10:30)**

**Artifact:** `packages/services/detectors/template-match/src/patterns/DRONE_TIGHT.ts`

```typescript
// Обновить финальные bounds на основе free-v1 val-результатов (из эпика #84)
export const DRONE_TIGHT: PatternTemplate = {
  key: 'DRONE_TIGHT',
  displayName: 'Drone (Tight Classification)',
  
  spectral: {
    centroid: { min: 2900, max: 4300 },   // p10–p90 дронов
    flux: { min: 0.03, max: 0.16 },
    rms: { min: 0.07, max: 0.28 },
    frameHitRatio: { min: 0.6, max: 1.0 }, // доля кадров, где все в боксе
  },
  
  temporal: {
    activityRatio: { min: 0.8, max: 1.0 },
    centroidStd: { min: 0, max: 400 },
    longTermStability: ['high', 'veryHigh'],
    volumeTrend: ['stable'],
    frequencyTrend: ['stable'],
  },
  
  scoring: {
    spectralWeight: 0.3,      // спектр 30%
    temporalWeight: 0.7,      // время 70%
    minConfidence: 35,        // порог уверенности
  },
};

// Конкурентные шаблоны (не-дроны для discriminator)
export const DRONE_COMPETITORS = [
  SPEECH_BURST,       // импульсная речь/звуки
  ENVIRONMENTAL_HUM,  // фоновый гул (техника)
  BIRD_CHIRP,         // щебет птиц (ESC-50)
  // … ещё 2–3 по результатам val
];
```

**Проверки (Музыкант):**
- [ ] Параметры согласованы с FFT_METRICS_POTENTIAL_AND_LIMITS.md §3 (перцентили)
- [ ] Шаблон не переобучен на train (проверка через cross-val)
- [ ] Конкурентные шаблоны покрывают основные false-positive-классы

**DoD к 10:30:**
- ✅ DRONE_TIGHT.ts обновлена и скомпилирована
- ✅ Запущен quick-test: `yarn test --filter=@membrana/template-match --match="*DRONE_TIGHT*"`

---

#### **1.2 Benchmark v0.3 переснятие (Математик, 10:30–12:30)**

**Artifact:** `data/detectors-benchmark/v0.3/`

```bash
# Запуск canonical benchmark с DRONE_TIGHT
yarn benchmark:detectors \
  --catalog drone-tight-curated \
  --dataset free-v1 \
  --splits canonical \
  --output data/detectors-benchmark/v0.3/

# Ожидаемый результат (из FFT_METRICS_POTENTIAL_AND_LIMITS.md §4):
# template-match (DRONE_TIGHT): P ≥ 65%, R ≥ 88%, F1 ≥ 0.75
```

**Параллельно — таблица конкурентов:**

| Детектор | P (%) | R (%) | FPR (%) | F1 | Статус |
|----------|-------|-------|---------|-----|--------|
| **trends-DRONE_TIGHT** | 67.5 | 90.0 | 30 | 0.77 | ✅ Ref |
| template-match (old) | 55.2 | 87.3 | 45 | 0.68 | ⚠️ |
| harmonic | 43.6 | 68.3 | 88 | 0.53 | 🔴 |
| cepstral | — | 100 | 100 | — | 🔴 |
| spectral-flux | — | 87 | 100 | — | 🔴 |
| fft-threshold | 30–40 | 75–85 | 40–70 | 0.45–0.60 | 🔴 |

**DoD к 12:30:**
- ✅ v0.3 report json сгенерирован и сохранён
- ✅ Таблица конкурентов заполнена (старые результаты из эпика #84)
- ✅ Precision/Recall/F1 соответствуют целям (P≥65%, R≥88%)
- ✅ Никаких регрессий vs. v0.2

---

#### **1.3 Документация DETECTOR_BENCHMARK.md (Teamlead, 12:30–13:00)**

**Artifact:** `docs/DETECTOR_BENCHMARK.md` (обновление)

```markdown
## v0.3 Canonical Results (DRONE_TIGHT)

**Dataset:** free-v1 (120 samples, 60/20/20 split)  
**Primary detector:** template-match DRONE_TIGHT  
**Timestamp:** 2026-07-04T13:00:00Z

### Main Result
- **Precision:** 67.5% (P = TP / (TP + FP))
- **Recall:** 90.0% (R = TP / (TP + FN))
- **F1-score:** 0.77 (2·P·R / (P+R))
- **False Positive Rate:** 30%

### Competitor Detectors (Single-node DSP)

[таблица из 1.2]

### Hard-gate Threshold (Stage 1→2)

To unfreeze TDOA and multi-node infrastructure:
- **Precision ≥ 85%** AND
- **Recall ≥ 90%** AND
- **On validated ground-truth** (VDR protocol)

Status: **NOT MET** (P 67.5%, missing validated labels)  
Next check: After VDR operator annotation (~2026-07-17)

### Methodology

[формулы, кросс-валидация, конфиги]
```

**DoD к 13:00:**
- ✅ Раздел v0.3 с числами
- ✅ Таблица конкурентов
- ✅ Hard-gate критерии чётко сформулированы
- ✅ Дата gate-повторной проверки зафиксирована

---

### **БЛОК 2A: Zero-shot Scaffold (параллель, 13:00–14:30)**

**Ответственность:** Ozhegov (структура) + Dynin (модель)  
**Размер:** M (параллельно с блоком 1)  
**Блокирует:** эшелон 2 (нейро-интеграции)

#### **2A.1 INTEGRATIONS_STRATEGY обновление (Dynin, 13:00–13:30)**

**Artifact:** `docs/prompts/INTEGRATIONS_STRATEGY.md` (раздел Zero-shot Models)

```markdown
## Zero-shot Audio Models for Drone Detection

### 1. CLAP v2 (LAION Contrastive Learning)
- **HuggingFace:** laion/clap-htsat-unfused
- **Size:** ~170 MB (quantized: ~50 MB)
- **Input:** Audio window (16 kHz, mono or stereo)
- **Output:** Embedding (512-dim), then cosine-similarity to "drone" reference
- **Latency:** 50–100 ms per window (CPU) / 10–20 ms (CUDA)
- **Integration point:** `@membrana/zero-shot-detector/src/model-loader.ts`

### 2. YAMNet (Google Perceptual Learning)
- **GitHub:** google-research/perceptual-learning-of-audio
- **Size:** 3.5 MB (quantized TFLite)
- **Classes:** 521 AudioSet categories (aircraft, helicopter, drone, wind, rain, etc.)
- **Output:** Multi-label class predictions + confidence per class
- **Adaptation:** `isDrone = ['drone', 'helicopter'].includes(topClass) && confidence > 0.5`
- **Latency:** ~30 ms per window

### 3. Selection Rationale
- **Why CLAP:** Alignment-based, zero-shot on new categories, works on free audio
- **Why YAMNet:** Lightweight, already trained on drones (AudioSet contains RC aircraft), explainable classes
- **Ensemble strategy:** CLAP (embedding) → confidence ranking; YAMNet (class) → veto rule (if 'drone' class detected and not overridden)

---
```

**DoD к 13:30:**
- ✅ Обе модели документированы с параметрами
- ✅ Latency-оценки указаны
- ✅ Integration point'ы уточнены

---

#### **2A.2 Scaffold пакета `@membrana/zero-shot-detector` (Ozhegov, 13:30–14:30)**

```bash
# Создать структуру
mkdir -p packages/services/detectors/zero-shot-detector/{src,__tests__}

# Содержимое: как описано в STRATEGIC_PLAN_DAY.md §4.3
# Files: index.ts, service.ts, types.ts, model-loader.ts (stub), inference.ts (stub)
# Tests: service.spec.ts (smoke tests)

# Build & test
yarn turbo run build --filter='@membrana/zero-shot-detector'
yarn turbo run test --filter='@membrana/zero-shot-detector'
```

**DoD к 14:30:**
- ✅ Пакет структурирован
- ✅ Контракт DroneDetector реализован
- ✅ Тесты проходят (stubs)
- ✅ Нет нарушений слабой связанности (ARCHITECTURE.md)

---

### **БЛОК 2B: Hard-gate контракт (параллель, 14:00–14:30)**

**Ответственность:** Teamlead  
**Размер:** S (параллельно)

**Artifact:** `docs/STAGE_GATE_1_TO_2.md` (новый)

```markdown
# Stage-gate 1→2: Single-Node Detection Hard-gate

## Overview

Условие разморозки TDOA-сервиса, multi-node архитектуры и Этапа 2:

**Detector must achieve P ≥ 85% AND R ≥ 90% on validated ground-truth dataset**

---

## Validation Dataset (VDR Protocol)

See: [`docs/VDR_PROTOCOL.md`](./VDR_PROTOCOL.md)

- **Pilot phase:** 20–30 samples, 2 annotators, Cohen's Kappa ≥ 0.75
- **Alpha phase:** 100+ samples (if pilot passes)
- **Acceptance:** Kappa ≥ 0.75; disputed samples reviewed by 3rd expert

---

## Detection Metrics (Precision & Recall)

**Precision** = TP / (TP + FP)  
**Recall** = TP / (TP + FN)

Both computed on **validation split** (20% of VDR set).

---

## Current Status (2026-07-04)

| Detector | P (%) | R (%) | Val Set | Notes |
|----------|-------|-------|---------|-------|
| trends-DRONE_TIGHT | 67.5 | 90.0 | free-v1 canonical | ✅ R passes; P fails |
| template-match v0.2 | 55.2 | 87.3 | free-v1 canonical | Both fail |

**Gate Status:** ❌ NOT PASSED — Need VDR ground-truth for authoritative evaluation

---

## Next Steps

1. Annotate VDR pilot (20–30 samples)
2. Re-evaluate all detectors on VDR pilot validation split
3. If P ≥ 85% AND R ≥ 90%: **PASS** → unlock Stage 2
4. If FAIL: Ensemble detectors OR escalate to zero-shot (CLAP/YAMNet)

---

## Timeline

- **2026-07-04:** This document created
- **~2026-07-17:** VDR operator annotation completed
- **~2026-07-24:** Gate re-evaluation and decision

---
```

**DoD к 14:30:**
- ✅ Документ создан и структурирован
- ✅ Текущий статус и timeline чётки
- ✅ Привязка к VDR_PROTOCOL

---

## 🎬 Итоговый план-матрица

| № | Блок | Время | Ответ | Артефакт | DoD | Статус |
|---|------|-------|-------|----------|-----|--------|
| **0** | Morning standup | 08:00–09:00 | All | lint pass, test pass | ✅ Clean git | Обязательно |
| **1.1** | DRONE_TIGHT финал | 09:00–10:30 | Музыкант | DRONE_TIGHT.ts | Params confirmed | До 10:30 |
| **1.2** | v0.3 benchmark | 10:30–12:30 | Математик | report + table | P≥65%, R≥88% | До 12:30 |
| **1.3** | DETECTOR_BENCHMARK.md | 12:30–13:00 | Teamlead | docs upd | v0.3 + gate | До 13:00 |
| **2A.1** | INTEGRATIONS_STRATEGY | 13:00–13:30 | Математик | docs upd | Models docs | До 13:30 |
| **2A.2** | zero-shot scaffold | 13:30–14:30 | Структурщик | pакет | Tests pass | До 14:30 |
| **2B** | hard-gate doc | 14:00–14:30 | Teamlead | STAGE_GATE_1_TO_2.md | Timeline fixed | До 14:30 |

---

## 🟢 Проверки в конце дня (15:30)

```bash
# Финальная валидация
yarn turbo run lint typecheck test build --continue
git status  # → чистое дерево

# Рузультаты в консилиум
echo "✅ DRONE_TIGHT curated, v0.3 benchmark P 67.5% / R 90.0%"
echo "✅ zero-shot scaffold готов к интеграции"
echo "✅ Hard-gate контракт задокументирован, дата gate-проверки 2026-07-24"
```

---

## ⚠️ Риски на сегодня

| Риск | Вероятность | Mitigation |
|------|----------|-----------|
| Benchmark зависает на large dataset | M | Запустить на subset первым; если timeout → skip live и переснять вечером |
| Template-match параметры не проходят v0.3 | L | Fallback: взять консервативный DRONE_TIGHT из эпика #84 (уже валидирован) |
| React-hooks warning не исправляется | L | П2, не блокирует; отложить на вечер |

---

## 📞 Обращения к персонажам

```bash
# Если вопросы по FFT-метрикам
yarn ask dynin --gh-issue 236 "DRONE_TIGHT параметры твёрдые или есть место для калибровки?"

# Если уточнение по VDR Protocol
yarn ask vesnin --no-context "контракт stage-gate 1→2 правильный: P≥85% AND R≥90%?"
```

---

## 📊 Это стендап перед
- 🎯 Главная магистраль: DRONE_TIGHT curated + v0.3 benchmark
- 📦 Параллели: zero-shot scaffold + hard-gate doc
- 🔓 Hard-gate 1→2: зависит от VDR разметки (2026-07-17)

**Команда готова. Вперёд! ⚡**