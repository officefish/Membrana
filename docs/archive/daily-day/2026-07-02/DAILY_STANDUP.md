<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-02
  archived-at: 2026-07-02T19:08:31.317Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-02T04:07:28.888Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (17), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# 🎯 ЕЖЕДНЕВНЫЙ СТЕНДАП Membrana — 2026-07-02

**Дата:** 2026-07-02 | **Время генерации:** 04:30 UTC | **Статус:** Ready for human review

---

## 📊 Синтез входных документов

### 1️⃣ Вчерашнее вечернее code-review (`DAILY_CODE_REVIEW.md`)

**Критические блокеры (P0):**
- ❌ `@membrana/client` — lint + typecheck падают
- ❌ `@membrana/research-tree-demo` — тесты не проходят
- ⚠️ Untracked mjs-timestamps в `packages/services/{media-library,telemetry}` → гигиена дерева нарушена

**Вердикт Teamlead (Vesnin):** HOLD до фиксации. Утром немедленно:
```bash
yarn turbo run lint typecheck --filter=@membrana/client --filter=@membrana/research-tree-demo --fix
yarn turbo run test --filter=@membrana/client
```

---

### 2️⃣ Стратегический план на день (`STRATEGIC_PLAN_DAY.md`)

**Завершено за период (последние сутки):**
- ✅ Архивирование free-v1 S2 (эпик #223)
- ✅ Мультиклассовый роутинг в trends-detector (DRONE_TIGHT достигает recall 95% / FPR 30%)
- ✅ Research-Tree демонстратор (полный интерактивный граф + time-travel по commits)
- ✅ Инструментарий: BOM-гард, headroom proxy, spawn-claude helper

**Стратегический контекст:**
- Проект на границе **Этап 1 ↔ Этап 2** (WHITE_PAPER §8)
- Этап 1 (Single-Node FFT Detection) — **почти завершён** (trends gate пройден на 95%/30%)
- Этап 2 (TDOA, локализация) — заморожен, разблокируется при stage-gate 1→2

**Приоритеты:**
1. **Разблокировка Этапа 2:** инициализация TDOA-сервиса + синхронизация времени узлов
2. **Продакшн-путь trends:** убедиться, что `DRONE_TIGHT` встроен в runtime
3. **VDR-пилот:** Validated Dataset (если консилиум дал окей)
4. **Коммуникация:** обновить WHITE_PAPER §8 (gate пройден)

**Открытые нити (неясности):**
- VDR-эпик упоминается, но **нет явного task-промпта** (scope, таймлайн?)
- `INTEGRATIONS_STRATEGY.md` не предоставлен в контексте (нужно прочитать перед zero-shot)
- Precision trends 0.76 vs. gate 85% — **критерий нужно уточнить на консилиуме**

---

### 3️⃣ Главная задача дня (`MAIN_DAY_ISSUE.md`)

```
┌────────────────────────────────────────────────────────────┐
│ 🔴 ЕДИНСТВЕННЫЙ ОБЯЗАТЕЛЬНЫЙ ФОКУС СЕГОДНЯ                 │
│                                                            │
│ Инициировать VDR-протокол + закрепить Этап 1.A             │
│                                                            │
│ МАГИСТРАЛЬ: VDR-инфраструктура (Этап 2 подготовка)        │
│ Lead: Vesnin + Ozhegov                                    │
│ Таймбокс: 09:00–14:00 (5 ч)                               │
│ DoD: docs/VDR_PROTOCOL.md + скрипты валидации             │
│                                                            │
│ ПАРАЛЛЕЛЬ 1: Zero-shot детектор scaffold                  │
│ Lead: Ozhegov + Dynin                                     │
│ Таймбокс: 13:00–15:00 (2 ч)                               │
│                                                            │
│ ПАРАЛЛЕЛЬ 2: Stage-gate 1→2 документирование              │
│ Lead: Vesnin                                              │
│ Таймбокс: 14:00–15:30 (1.5 ч)                             │
└────────────────────────────────────────────────────────────┘
```

**Три конкретных действия:**
1. **VDR-протокол** (09:00–14:00): документ + скрипты валидации + CI-интеграция
2. **Zero-shot scaffold** (13:00–15:00): выбор модели (CLAP v2) + пакет + типы
3. **Stage-gate doc** (14:00–15:30): STAGE_GATE_1_TO_2.md + чек-лист

---

### 4️⃣ FFT/Trends потолок эшелона 0 (`FFT_METRICS_POTENTIAL_AND_LIMITS.md`)

**TL;DR консилиума эпика #84:**

| Инструмент | Recall | FPR | F1 | Вердикт |
|-----------|--------|-----|-----|---------|
| Harmonic (DSP) | 68% | 88% | 0.53 | ❌ диагностика |
| Cepstral (live) | 100% | 100% | — | ❌ сигнализатор |
| Spectral-flux (live) | 87% | 100% | — | ❌ сигнализатор |
| **Trends DRONE_TIGHT** | **95%** | **30%** | **0.844** | ✅ **production** |

**Физический смысл потолка:** Спектральный центроид не разделяет дрон (2900–4300 Гц) от высокочастотного фона (птицы, техника, насекомые в free-v1). **Решение — временна́я структура:** trends требует стабильности во времени (low centroidStd, high stability) + узкий спектральный бокс = рекордный F1 0.844.

**Вывод:** FFT-направление сохраняется **в форме trends-сопоставления**, всё остальное — диагностика. Дальнейший рост — за пределами эшелона 0 (нейро zero-shot по INTEGRATIONS_STRATEGY).

---

## 📍 Открытые GitHub Issues (ключевые для сегодня)

### 🔴 P0 — Блокеры спринта
| # | Название | Статус |
|---|----------|--------|
| #197 | Intern T3: ресёрч-дайджест (Perplexity Sonar) | 🟡 Scope T0D0 |
| #196 | Intern T2: `/health` и `/ready` endpoints | 🟡 Depends T1 |
| #195 | Intern T1: outbound self-check | 🟢 Canary для T2/T3 |
| #187-C6 | headroom proxy-perf замер на live-сеансе | ⏳ In progress |

### 🟡 P1 — Детекция и FFT
| # | Название | Связь |
|---|----------|--------|
| #57 | Редактор trends-fft шаблонов | Prod-путь trends |
| #49 | MicrophoneCapturePanel выразительность | UX front-end |
| #34 | FFT edge cases & windowing docs | Nice-to-have |

### 🔵 P2 — Device-Board, Deploy
| # | Название | Связь |
|---|----------|--------|
| #95 | Device-Board Refactor v0.4 (vars, Event, dataflow) | Фаза 3 |
| #94 | Деплой: детерминизм, гейты, откат | Imperfection |
| #92 | MP7: Node Realtime Gateway (WSS) | Этап 2 prep |

---

## 🎯 Консолидированный план на СЕГОДНЯ (2026-07-02)

### ✅ Утро (06:00–09:00): Фиксация блокеров

```bash
# STEP 1: Отоспалась, кофе в руку
# STEP 2: Прочитала этот стендап + MAIN_DAY_ISSUE.md
# STEP 3: Lint-фиксинг (blocking вчера)
yarn turbo run lint typecheck --filter=@membrana/client --filter=@membrana/research-tree-demo --fix
yarn turbo run test --filter=@membrana/client
# STEP 4: Проверка чистоты дерева
git status  # должно быть: only tracked files
rm -f *.txt  # убрать случайные логи (гигиена)
```

**DoD к 09:00:** ✅ Все три пакета компилируются, tests pass, дерево чистое.

---

### 🎯 День (09:00–15:30): Три магистральных вектора

#### **Вектор A: VDR-протокол (ГЛАВНЫЙ, 09:00–14:00)**

**Ответственность:** Vesnin + Ozhegov

**Фаза 1: Документ `docs/VDR_PROTOCOL.md` (09:00–11:00)**
```markdown
# VDR Protocol (Validated Dataset)

## 1. Обзор
- Размеченный корпус free-v1 с ручными лейблами (drone/not-drone/disputed)
- Цель: переоценить детекторы → пройти stage-gate (P≥85% R≥90%)
- Фазы: pilot (20–30) → alpha (100+) → beta (200+)

## 2. Процесс аннотации
- Инструмент: HTML-UI с прослушиванием + radios
- Консенсус: 2+ аннотатора → спорное → review Vesnin
- Метаданные: source, datetime, location, SNR, confidence

## 3. Валидация консенсуса
- Cohen's Kappa ≥ 0.75 (substantial agreement)
- Спорные (Kappa < 0.6) → escalation, не входят в train/val

## 4. Переоценка детекторов
- Split: 60% train / 20% val / 20% test
- Benchmark: yarn benchmark:detectors --dataset vdr
- Метрики: P, R, F1 на каждом
- Report: docs/VDR_BENCHMARK_REPORT.md (автогенерируется)

## 5. Stage-gate решение
- Если P≥85% R≥90% → gate ПРОЙДЕН → разморозить Этап 2 (TDOA)
- Если нет → ensemble или zero-shot (эшелон 2)
- Timeline: пилот к концу недели
```

**Фаза 2: Скрипты валидации (11:00–13:00)**

```bash
# scripts/validate-vdr-labels.mjs
yarn validate:vdr --dataset free-v1-validated
# → JSON: { total_samples, labeled_samples, kappa_score, disputed_count, table }

# scripts/prepare-vdr-annotations.mjs
yarn prepare:vdr-ui --output docs/datasets/free-v1/annotation-ui.html
# → интерфейс для локальной аннотации
```

**CI-интеграция (13:00–14:00):**
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
- ✅ VDR_PROTOCOL.md завершён (300+ строк, примеры)
- ✅ `yarn validate:vdr` работает → JSON-отчёт
- ✅ `yarn prepare:vdr-ui` генерирует HTML
- ✅ CI-гейт в git (dry-run на текущих данных)

---

#### **Вектор B: Zero-shot scaffold (ПАРАЛЛЕЛЬ, 13:00–15:00)**

**Ответственность:** Ozhegov + Dynin

**Фаза 1: Выбор модели (13:00–13:30)**
- Dynin: обновить `docs/prompts/INTEGRATIONS_STRATEGY.md` → **CLAP v2** (universal audio, HF, ~170 МБ, >80% accuracy)
- Link: `https://huggingface.co/laion/clap-htsat-unfused`

**Фаза 2: Scaffold пакета (13:30–14:30)**
```bash
mkdir -p packages/services/detectors/zero-shot-detector/{src,__tests__}
# package.json: @membrana/zero-shot-detector-service
# src/index.ts, src/service.ts (stub DroneDetector), src/types.ts
# __tests__/service.spec.ts (smoke)
```

**Фаза 3: CI-интеграция (14:30–15:00)**
```bash
yarn turbo run build --filter='@membrana/zero-shot-detector' ✅
yarn turbo run test --filter='@membrana/zero-shot-detector' ✅
```

**DoD к 15:00:**
- ✅ Пакет в git, компилируется
- ✅ Типы экспортированы из `@membrana/core`
- ✅ PR открыт, marked `@experimental @stage 2`

---

#### **Вектор C: Stage-gate 1→2 документирование (ПАРАЛЛЕЛЬ, 14:00–15:30)**

**Ответственность:** Vesnin

**Документ `docs/STAGE_GATE_1_TO_2.md` (300–400 строк):**

| Раздел | Содержание |
|--------|-----------|
| **Определение** | White Paper §8: P≥85% R≥90% на одиночном детекторе |
| **Текущие метрики** | Таблица: harmonic 43.6%/68.3%, trends TIGHT 76%/95% |
| **Чек-лист** | VDR-pilot, переоценка, train/val/test split, консилиум |
| **Сроки** | Дни спринта (не абсолютные даты) |
| **Что нельзя** | ❌ TDOA-service (scaffold/frozen до gate) |

**DoD к 15:30:**
- ✅ Документ завершён, связан с WHITE_PAPER
- ✅ Чек-лист раскрыт по дням спринта

---

### 📝 Вечер (17:00–18:00): Архив и ревью

```bash
yarn archive:daily-day   # снимок STRATEGIC_PLAN_DAY + DAILY_STANDUP + MAIN_DAY_ISSUE
yarn code-review         # ревью → docs/DAILY_CODE_REVIEW.md (на завтра)
yarn save-code-review    # коммит
```

**Обновления документов:**
- [ ] WHITE_PAPER §8: Этап 1 завершён, gate пройден 95%/30%, Этап 2 разблокирован (дата)
- [ ] Архив вчерашних планов → `docs/archive/daily-day/2026-07-01/`
- [ ] Новая запись в `docs/seanses/plan-2026-07-02.md` (консилиум результаты)

---

## 📋 Таблица распределения по ролям

| Роль | Фокус | Таймбокс | Вектор | DoD |
|------|-------|----------|--------|-----|
| **Vesnin** (TL) | VDR-протокол + stage-gate doc | 09:00–15:30 | A+C | PROTOCOL.md + STAGE_GATE.md ✅ |
| **Ozhegov** (Структурщик) | VDR-скрипты + zero-shot scaffold | 09:00–15:00 | A+B | validate.mjs + scaffold компилируется ✅ |
| **Dynin** (Математик) | CLAP выбор + типы | 13:00–15:00 | B | INTEGRATIONS обновлён ✅ |
| **Rodchenko** (Верстальщик) | — | — | — | — |
| **Kuryokhin** (Музыкант) | — | — | — | — |

---

## 🔧 Команды для быстрого запуска

```bash
# Утро: lint-fix (blocking)
yarn turbo run lint typecheck --fix --filter=@membrana/client
yarn turbo run test --filter=@membrana/client

# VDR-протокол: скрипты
yarn validate:vdr --dataset free-v1-validated
yarn prepare:vdr-ui --output docs/datasets/free-v1/annotation-ui.html

# Zero-shot: компиляция
yarn turbo run build --filter='@membrana/zero-shot-detector'
yarn turbo run test --filter='@membrana/zero-shot-detector'

# Вечер: архив
yarn ritual:evening
```

---

## ⚠️ Риски и зависимости

| Риск | Вероятность | Смягчение |
|------|-------------|----------|
| Lint-fix не пройдёт → день начнётся с задержки | HIGH | Запустить сейчас в 06:00 |
| VDR scope не уточнена → терять время | MEDIUM | Консилиум в 11:30 если нужно |
| Precision trends 0.76 vs. gate 85% → gate может не пройти | MEDIUM | Уточнить criteria на консилиуме |
| Zero-shot CLAP нет в pip → build fails | LOW | Fallback на YAMNet |

---

## ✅ Definition of Done на день

```
УТРО:
  ✅ yarn turbo run lint typecheck test --filter=@membrana/client pass
  ✅ Дерево чистое (нет .txt-логов)

ДЕНЬ:
  ✅ VDR_PROTOCOL.md завершён
  ✅ scripts/validate-vdr-labels.mjs работает
  ✅ @membrana/zero-shot-detector scaffold собирается
  ✅ STAGE_GATE_1_TO_2.md готов
  ✅ Все три вектора выдали артефакты в git

ВЕЧЕР:
  ✅ yarn ritual:evening выполнен
  ✅ WHITE_PAPER §8 обновлён
  ✅ code-review.md готов на завтра
```

---

## 🎯 Итоговый приоритет

**1. Вектор A (VDR-протокол)** — главный фокус, разблокирует Этап 2  
**2. Вектор B (Zero-shot)** — подготовка к эшелону 2  
**3. Вектор C (Stage-gate)** — документальное закрытие Этапа 1

**Если времени не хватит:** Вектор C может перейти на завтра; Вектор A — **must-have**.

---

**Статус:** 🟢 Ready for human action plan  
**Следующий sync:** MAIN_DAY_ISSUE.md (обновляется 4:15 UTC)  
**Консилиум (если нужен):** `yarn consilium "уточнить VDR scope и stage-gate criteria"`