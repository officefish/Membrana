<!-- Сгенерировано: 2026-07-05T07:30:01.356Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (18), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# Ежедневный стендап Membrana — 2026-07-05

**Координатор:** Vesnin (Teamlead)  
**Время:** 08:00 UTC  
**Период:** вчера вечер + GitHub Issues + packages/temp наброски

---

## 📋 Сводка входных сигналов

### 1. **Вчерашнее вечернее code-review** (`DAILY_CODE_REVIEW.md`)

✅ **T1 LGTM:** PC5 коммит (view-only при захвате) + спринт PCB готов к мёржу.  
⚠️ **P2 lint warning:** `UserCaseSettingsPanel.tsx` — useMemo dependency (авто-fix `yarn lint --fix`).  
🟢 **CI зелёный:** typecheck, test smoke pass; нет блокеров для утреннего плана.

---

### 2. **Дневной стратегический план** (`STRATEGIC_PLAN_DAY.md`)

**Главная цель этапа:** Закрытие Этапа 1.A (детекция на одном узле) + подготовка Этапа 2 (TDOA, триангуляция).

**Критический путь на сегодня:**

| # | Задача | Размер | Ответ | Статус |
|---|--------|--------|-------|--------|
| **4.1** | VDR hard-gate датасет пилот (30–35 сэмплов) | **L** | Верстальщик/Математик | 🔴 **NEW — блокирует Этап 2** |
| **4.2** | Trends DRONE_TIGHT prodification | **M** | Структурщик/Математик | 🟡 **in-progress** |
| **4.3** | TimeSyncProvider контракт | **M** | Структурщик/Математик | 🟡 **prep** |
| **4.4** | Transport-service скелет | **M** | Структурщик/Математик | 🟡 **prep** |
| **4.5** | Live DSP 3-brief диагностический гайд | **S** | Верстальщик/Музыкант | 🟢 **optional** |
| **4.6** | STAGE_1B_NEURAL_ROADMAP промпт | **M** | Структурщик/Математик | 🟢 **info** |

---

### 3. **Открытые GitHub Issues (сортировка по приоритету)**

#### **P0 / Блокирующие этап 2:**
- **#236** — ST7: Tray/global-shortcut emergency stop → `studio-capture-adaptation` (отложено, не сегодня)
- **#92** — MP7: Node Realtime Gateway (WSS + live-журнал, in-progress)
- **#95** — DBR v0.4 (device-board refactor, in-progress)

#### **P1 / Инфраструктура и процесс:**
- **#94** — Deploy детерминированный + rollback (postmortem MP7b, требует процесса)
- **#187** — Headroom proxy-perf замер (agent-context, optional)

#### **P2 / Intern / Ресёрч:**
- **#195** — T1: outbound self-check (диагностика背景-office)
- **#196** — T2: /health и /ready эндпоинты
- **#197** — T3: утренний ресёрч-дайджест через Perplexity

> **Вывод по Issues:** основной фокус — VDR hard-gate (4.1) и prodification trends (4.2), остальное параллельно.

---

### 4. **Наброски из `packages/temp/` (эхо вчера)**

```
packages/temp/
├── detector-perf-cache.json     ← trends v0.3 benchmark (переснять сегодня)
├── drone-tight-template-v0.3.ts ← финальные параметры из FFT-меморандума
├── transport-service-scaffold/  ← skeleton для Этапа 2
├── zero-shot-detector-types.ts  ← интеграция CLAP/YAMNet (prep)
└── time-sync-provider.ts        ← контракт синхронизации (prep)
```

→ **Все это — сегодняшние артефакты. Переместить в продакшн после LGTM.**

---

## 🎯 План на сегодня (по фазам)

### **ФАЗА 0: Утро (08:00–09:00) — Блокирующая синхронизация**

**Ответ:** Структурщик (Ozhegov) + Верстальщик (Rodchenko)

```bash
# Лог-тестирование
yarn lint --filter=@membrana/client --fix
yarn typecheck --filter=@membrana/client
yarn test --filter=@membrana/client --testNamePattern='smoke'
git status  # убедиться: нет *.txt-логов, clean tree
```

**DoD к 09:00:**
- ✅ lint pass (оба пакета)
- ✅ test smoke pass
- ✅ git clean
- ✅ **Все 5 членов команды прочитали этот standup**

---

### **ФАЗА 1: Trends DRONE_TIGHT (09:00–13:00) — МАГИСТРАЛЬ**

**Ответ:** Музыкант (Kuryokhin) + Математик (Dynin)  
**Источник параметров:** `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §3

#### 1.1 Финализация шаблона (09:00–10:30, Музыкант)

```typescript
// Экспортировать из packages/services/detectors/template-match/src/patterns/
export const DRONE_TIGHT: PatternTemplate = {
  key: 'DRONE_TIGHT',
  spectral: {
    centroid: { min: 2900, max: 4300 },   // p10–p90
    flux: { min: 0.03, max: 0.16 },
    rms: { min: 0.07, max: 0.28 },
    frameHitRatio: { min: 0.6, max: 1.0 },
  },
  temporal: {
    activityRatio: { min: 0.8, max: 1.0 },
    centroidStd: { min: 0, max: 400 },
    longTermStability: ['high', 'veryHigh'],
    volumeTrend: ['stable'],
    frequencyTrend: ['stable'],
  },
  scoring: {
    spectralWeight: 0.3,
    temporalWeight: 0.7,  // ← ключевой инвариант
    minConfidence: 35,
  },
};
```

**Проверки:**
- [ ] Параметры из FFT-меморандума (перцентили)
- [ ] Нет регрессии cross-val
- [ ] Конкурентные шаблоны определены

**DoD:** `yarn test --filter=@membrana/template-match --match="*DRONE_TIGHT*"` pass

---

#### 1.2 Benchmark v0.3 (10:30–12:30, Математик)

```bash
yarn benchmark:detectors \
  --catalog drone-tight-curated \
  --dataset free-v1 \
  --splits canonical \
  --output data/detectors-benchmark/v0.3/

# Ожидаемый результат (из FFT-меморандума §4):
# template-match DRONE_TIGHT: P ≥ 65% / R ≥ 88% / F1 ≥ 0.75
```

**Таблица обновления в `docs/DETECTOR_BENCHMARK.md`:**

| Детектор | P (%) | R (%) | FPR (%) | Статус |
|----------|-------|-------|---------|--------|
| **trends-DRONE_TIGHT (канонический)** | 67.5 | 90.0 | 30 | ✅ ref |
| template-match v0.3 | *переснять* | *переснять* | — | 🔄 today |

**DoD:** report json в `data/detectors-benchmark/v0.3/reports/latest.json`

---

#### 1.3 Документация (12:30–13:00, Teamlead)

Обновить `docs/DETECTOR_BENCHMARK.md` §v0.3:

```markdown
## v0.3 Canonical Results (DRONE_TIGHT Curated, 2026-07-05)

**Primary detector:** template-match DRONE_TIGHT  
**Dataset:** free-v1 canonical (120 samples, 60/20/20)  
**Precision:** [from benchmark]  
**Recall:** [from benchmark]  
**F1-score:** [calculated]

### Hard-gate Status (Stage 1→2)
- **Requirement:** P ≥ 85% AND R ≥ 90% on validated ground-truth
- **Current:** [from v0.3 canonical]
- **Status:** ❌ NOT MET (need VDR independent validation)
- **Next check:** ~2026-07-24 (after VDR annotation phase)
```

**DoD:** v0.3 раздел + hard-gate критерии зафиксированы

---

### **ФАЗА 2A: Zero-shot Scaffold (13:00–14:30, параллель)**

**Ответ:** Структурщик (Ozhegov) + Математик (Dynin)

#### 2A.1 INTEGRATIONS_STRATEGY уточнение (13:00–13:30, Dynin)

Обновить `docs/prompts/INTEGRATIONS_STRATEGY.md`:

```markdown
## Zero-shot Audio Models for Drone Detection (Stage 1.B)

### 1. CLAP v2 (LAION Contrastive Learning)
- Model: laion/clap-htsat-unfused (170 MB)
- Inference: 50–100 ms CPU / 10–20 ms CUDA
- Target: 80%+ zero-shot recall

### 2. YAMNet (Google AudioSet)
- Model: 3.5 MB TFLite
- 521 AudioSet categories (aircraft, helicopter, drone, …)
- Integration: isDrone = topClass ∈ {drone, helicopter} AND confidence > 0.5

### 3. Deployment Strategy
- Service: @membrana/zero-shot-detector (Stage 1.B entry point)
- Contract: DroneDetector (same as harmonic, template-match, trends)
```

---

#### 2A.2 Пакет scaffold (13:30–14:30, Структурщик)

```bash
mkdir -p packages/services/detectors/zero-shot-detector/{src,__tests__}

# src/index.ts, src/service.ts, src/types.ts, src/inference.ts (stub)
# __tests__/service.spec.ts (smoke)

yarn turbo run build --filter='@membrana/zero-shot-detector'
yarn turbo run test --filter='@membrana/zero-shot-detector'
```

**DoD к 14:30:**
- ✅ Пакет структурирован
- ✅ Реализует `DroneDetector`
- ✅ Test smoke pass
- ✅ Нет нарушений слабой связанности

---

### **ФАЗА 2B: Hard-gate Document (14:00–14:30, параллель)**

**Ответ:** Teamlead (Vesnin)

Создать `docs/STAGE_GATE_1_TO_2.md`:

```markdown
# Stage-gate 1→2: Single-Node Detection Hard-gate

## Разморозка TDOA и multi-node требует:

**Detector must achieve: P ≥ 85% AND R ≥ 90% on validated ground-truth**

## Current Status (2026-07-05)
- trends-DRONE_TIGHT canonical: P 67.5% / R 90.0%
- template-match v0.3: [переснято выше]
- **Gate Status:** ❌ NOT PASSED (canonical нужна VDR валидация)

## Timeline
- **2026-07-05:** This document created, v0.3 benchmark done
- **~2026-07-17:** VDR operator annotation (30–35 samples, intra-rater ≥95%)
- **~2026-07-24:** Gate re-evaluation

## If PASS
→ Unfreeze TDOA-service, transport-service, localization (Stage 2)

## If FAIL
→ Escalate to neural tier (CLAP/YAMNet) via Stage 1.B
```

---

### **ФАЗА 3: Параллельные инициативы**

#### 3.1 VDR Hard-gate Pilot (продолжится за рамки сегодня)

**Задача 4.1 из STRATEGIC_PLAN_DAY.md:**
- Собрать 30–35 audio-сэмплов (записывающее оборудование + оператор)
- Ручная разметка (drone / not-drone), intra-rater ≥95%
- Переснять `yarn benchmark:detectors` на VDR
- DoD: manifest.json + результаты таблицы

**Ответ:** Верстальщик (запись) + Математик (разметка/валидация)  
**Размер:** L (многодневная запись + аннотация)  
**Блокирует:** hard-gate решение

---

#### 3.2 TimeSyncProvider контракт (параллель, prep)

**Задача 4.3 из STRATEGIC_PLAN_DAY.md:**

```bash
mkdir -p packages/core/src/contracts/time-sync

# Типы: TimeSyncProvider, TimeSyncMethod, TimeSyncOffset
# Unit-тесты, документ TIME_SYNC_SPEC.md
# DoD: контракт в публичном API core, тесты pass
```

**Ответ:** Структурщик (контракт) + Математик (модель ошибок)  
**Размер:** M  
**Не блокирует сегодня, но нужен для Этапа 2**

---

#### 3.3 Transport-service скелет (параллель, prep)

**Задача 4.4 из STRATEGIC_PLAN_DAY.md:**

```bash
mkdir -p packages/services/transport/{src,__tests__}

# Типы: TransportEvent, EventQueue, ReplayStrategy
# Интерфейс: enqueueEvent(), subscribeToEvents(), flush()
# Реализация: in-memory queue с ограничением
# DoD: тесты pass, README готов
```

**Ответ:** Структурщик + Математик  
**Размер:** M  
**Не блокирует сегодня**

---

### **ФАЗА 4: Fin & Check**

#### 4.1 Архив дня (17:30–18:00, Teamlead)

```bash
yarn archive:daily-day   # снимок STRATEGIC_PLAN_DAY + DAILY_STANDUP → docs/archive/daily-day/2026-07-05/

git add -A
git commit -m "docs(daily): 2026-07-05 standup + DRONE_TIGHT benchmark v0.3 + zero-shot scaffold"
```

#### 4.2 Evening Code Review (18:00–20:00, все)

```bash
yarn code-review         # → docs/DAILY_CODE_REVIEW.md (для завтра утром)
yarn save-code-review
```

---

## 🚨 Риски и критические моменты

| Риск | Вероятность | Действие |
|------|-----------|---------|
| Lint warning не фиксится авто | Low | Ручной fix → 5 минут |
| Benchmark v0.3 регрессия vs. v0.2 | Low | Документировать причину → продолжить |
| VDR пилот затягивается | Medium | Параллельные задачи 4.3–4.4 не зависят → progress |
| Zero-shot scaffold упирается в зависимости | Low | Stub-реализация достаточна → полнота в Stage 1.B |
| Hard-gate document согласование | Low | Консилиум 2026-07-17 уточнит критерии |

---

## ✅ Definition of Done к 20:00

### Обязательные (ФАЗА 0–1):
- [ ] Lint pass, test smoke pass
- [ ] DRONE_TIGHT шаблон в продакшне + benchmark v0.3 готов
- [ ] `docs/DETECTOR_BENCHMARK.md` v0.3 + hard-gate статус зафиксированы
- [ ] `docs/STAGE_GATE_1_TO_2.md` создан

### Параллельные (ФАЗА 2–3):
- [ ] INTEGRATIONS_STRATEGY.md уточнена
- [ ] zero-shot-detector scaffold создан + тесты pass
- [ ] TimeSyncProvider контракт prep (не full, но подготовка)
- [ ] Transport-service scaffold prep

### Архив:
- [ ] `docs/archive/daily-day/2026-07-05/` снята
- [ ] `docs/DAILY_CODE_REVIEW.md` вечером готов

---

## 📌 Команды на день

```bash
# Утро (ФАЗА 0)
yarn lint --filter=@membrana/client --fix
yarn typecheck --filter=@membrana/client
yarn test --filter=@membrana/client --testNamePattern='smoke'

# День (ФАЗА 1)
yarn benchmark:detectors --catalog drone-tight-curated --dataset free-v1 --splits canonical

# Параллель (ФАЗА 2–3)
mkdir -p packages/services/detectors/zero-shot-detector
mkdir -p packages/core/src/contracts/time-sync
mkdir -p packages/services/transport

# Вечер (ФАЗА 4)
yarn archive:daily-day
yarn code-review
```

---

## 📖 Справочные документы

- **FFT-метрики:** `docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md` (параметры DRONE_TIGHT)
- **Стратегический план:** `docs/STRATEGIC_PLAN_DAY.md` (задачи 4.1–4.6)
- **Detector бенчмарк:** `docs/DETECTOR_BENCHMARK.md` (историческая таблица)
- **Integrations:** `docs/prompts/INTEGRATIONS_STRATEGY.md` (Stage 1.B prep)
- **Architecture:** `ARCHITECTURE.md` (соблюдать слабую связанность)

---

**Итоговый план:** Закрытие Этапа 1.A (детекция) через DRONE_TIGHT prodification + подготовка Этапа 2 (TDOA) через контракты. VDR hard-gate идёт параллельно и решит, идём ли дальше в нейро или в триангуляцию на чистом FFT.