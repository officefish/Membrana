<!--
  archive-role: archive-snapshot
  archive-day: 2026-06-18
  archived-at: 2026-06-18T18:57:29.125Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-06-17T05:45:58.758Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# 📋 ЕЖЕДНЕВНЫЙ СТЕНДАП — 2026-06-17

**Время:** 09:00 МСК  
**Период:** 2026-06-16 18:00 — 2026-06-17 09:00  
**Координатор:** Vesnin (Teamlead)

---

## 🔄 Синтез входных документов

### Источники (в порядке приоритета)

| Документ | Статус | Вес | Основное |
|----------|--------|-----|----------|
| **DAILY_CODE_REVIEW.md** (вчера, 18:10) | ✅ полный | 40% | Ветка `feat/trends-go-drone-tight` (49 коммитов) — FFT last-chance готов к merge, есть блокеры (tester background-office, turbo.json) |
| **STRATEGIC_PLAN_DAY.md** (вчера, 05:45) | ✅ полный | 35% | 6 задач на следующий день: T1–T6, приоритет VDR-эпик + zero-shot YAMNet/CLAP, stage-gate 1→2 решение |
| **MAIN_DAY_ISSUE.md** (2026-06-16) | ✅ справочный | 15% | Фокус JE1–JE5: event-driven journal, эпик #83 (telemetry-journal-event-driven) |
| **GitHub Issues** (открытые) | ✅ полный | 7% | 17 issues, приоритеты: #83, #79, #78, #59, #58, #57, #54, #49 |
| **packages/temp** | — | 3% | (неуказан в вызове) |

---

## 📊 КОНСОЛИДИРОВАННЫЙ ПЛАН НА СЕГОДНЯ (2026-06-17)

### **Утренний приоритет**

#### 🟥 БЛОКЕР 1: Code review ветки `feat/trends-go-drone-tight` → merge to `main`

**Статус:** готов к слиянию, **3 критических задачи**  
**Владелец:** Ozhegov (Структурщик) + тест-сервис  
**Предполагаемое время:** 09:00–10:30

| # | Задача | Ответственный | статус |
|---|--------|----------------|--------|
| 1️⃣ | Зафиксить `@membrana/background-office#test` (красный флаг) | Структурщик + DevOps | 🔴 |
| 2️⃣ | Добавить `outputs` в turbo.json для `harmonic-detector-service` и `journal-report-views` | Структурщик | 🟡 |
| 3️⃣ | Завернуть динамические объекты в useMemo (7 lint-warning в client) | Родченко (Верстальщик) | 🟡 |

**Definition of Done:** `yarn test` зелён, `yarn lint` зелён, `yarn typecheck` зелён → merge в `main`.

---

#### 🟨 БЛОКЕР 2: Stage-gate 1→2 решение (архитектурное) — документировать **ДО** начала 1.B

**Статус:** требует консилиума Teamlead + Математик  
**Владелец:** Vesnin + Dynin  
**Предполагаемое время:** 10:30–11:30

**Вопрос:** Проходит ли single-node FFT/DSP stage-gate (P≥85% R≥90%) с текущим `DRONE_TIGHT`?  
**Ответ (из FFT_METRICS_POTENTIAL_AND_LIMITS.md):**
- ✅ Trends recall: **95%** ✓
- ⚠️ Trends precision: **~76%** (ниже целевых 85%)
- ✅ Мягкая цель (P≥80% R≥90%): **достигнута** ✓
- 🔴 Жёсткая цель (P≥85% R≥90%): **не достигнута** ✗

**Решение:** Документировать в `docs/STAGE_GATE_1_TO_2_DECISION.md`:
- Trends + DRONE_TIGHT = лучший FFT-кандидат для prod на эшелоне 0 → **include в prod**.
- Hard stage-gate не пройден → **переход на Этап 1.B (нейро / zero-shot)** требует либо:
  - Validated Dataset (VDR эпик), либо
  - Zero-shot YAMNet/CLAP без обучения.
- Рекомендация: **параллельно инициировать VDR-сбор + YAMNet scaffold**, не ждать идеального FFT.

**Definition of Done:** документ подписан Vesnin (LGTM), выложен в `docs/`.

---

### **Основная работа (9:00–18:00)**

#### ✅ TASK T1: VDR Dataset Epic инициализация (M, 10–15 ч) — **ГЛАВНАЯ**

**Описание:** Создать минимальный validated dataset (30 real-world сэмплов, human-verified labels) для калибровки детекторов эшелона 1.B.

**Назначение:** 
- Музыкант (сбор примеров, метаданные)
- Teamlead (протокол, спецификация DTO)

**Артефакты (по DoD):**
- [ ] `docs/tasks/VDR_DATASET_COLLECTION_EPIC.md` (протокол + чеклист)
- [ ] `data/validated-samples/` (минимум 10 real сэмплов)
- [ ] CSV таблица: сэмпл | спектрограмма | разметка (drone/not-drone/ambiguous)
- [ ] Отчёт расхождений trends (`DRONE_TIGHT`) vs human labels (P/R/F1)

**Ссылка на промпт:** [`docs/prompts/TASK_PROMPT_WORKFLOW.md`](./prompts/TASK_PROMPT_WORKFLOW.md)

**Готовность в конце дня:** эпик инициирован, минимум 5–10 сэмплов загружено.

---

#### 🟨 TASK T2: Zero-shot YAMNet + CLAP интеграция (M, 12–20 ч) — scaffold фаза

**Описание:** Контракты и skeleton для двух нейросервисов (YAMNet, CLAP) на эшелоне 1.B, готовые к интеграции после VDR.

**Назначение:** 
- Математик (выбор моделей, инфер на mock-буферах)
- Структурщик (пакеты, контракты, DI)

**Артефакты (по DoD):**
- [ ] `@membrana/yamnet-detector-service` (пакет + контракт `DroneDetector`)
- [ ] `@membrana/clap-detector-service` (пакет + контракт `DroneDetector`)
- [ ] Unit-тесты на mock-данных
- [ ] Benchmark на ESC-50 (pre-flight, без VDR tie-in)

**Готовность в конце дня:** scaffold готов, unit-тесты на mock-буферах зелены.

---

#### 🟢 TASK T3: Sample-library UX hardening (S, 6–10 ч)

**Описание:** Упростить ручной тест trends и FFT-порогов в sample-library, добавить export.

**Назначение:**
- Верстальщик (UX + export компоненты)
- Музыкант (конфигурация порогов)

**Артефакты (по DoD):**
- [ ] Side-by-side таблица: сэмпл | FFT-вердикт | trends-вердикт | human-class
- [ ] Export CSV с метриками
- [ ] Link на `droneTightCalibration` из UI

**Готовность в конце дня:** основные компоненты готовы, export работает.

---

#### 🟡 TASK T4: Stage-gate 1→2 решение (уже выше) — документ

**Готовность в конце дня:** `STAGE_GATE_1_TO_2_DECISION.md` в `docs/` + signed LGTM.

---

#### 🟢 TASK T5: `@membrana/detection-ensemble-service` контракты (S, 5–8 ч)

**Описание:** Interfaces для агрегации результатов детекторов (DSP + neural).

**Назначение:**
- Структурщик (контракты)
- Математик (взвешивание)

**Артефакты (по DoD):**
- [ ] `EnsembleConfig`, `EnsembleResult` interfaces
- [ ] Три стратегии голосования (AND, OR, weighted-average)
- [ ] Unit-тесты на mock-детекторах
- [ ] ❌ **НЕ реализовывать интеграцию** — только скелет

**Готовность в конце дня:** контракты одобрены, юнит-тесты зелены.

---

#### 🟡 TASK T6: Background-media audio-analysis endpoint (M, 10–15 ч)

**Описание:** Завершить реализацию server-side endpoint для полного drone-detection-report.

**Назначение:**
- Структурщик (endpoint + контракты)
- Математик (оркестровка детекторов)

**Артефакты (по DoD):**
- [ ] `POST /analysis/drone-detection` endpoint готов
- [ ] Запускает trends + FFT-threshold
- [ ] Плейсхолдеры для YAMNet + CLAP
- [ ] Возвращает `DetectionReport` v1
- [ ] Интеграционный тест с sample-library

**Готовность в конце дня:** endpoint готов, не менее 50% функциональности.

---

### **Вечерний ритуал (17:30–18:30)**

```bash
yarn ritual:evening
# → yarn archive:daily-day
# → yarn code-review
# → yarn save-code-review
```

**Артефакты для следующего утра:**
- `docs/archive/daily-day/2026-06-17/` (снимок плана, станапа, журнала)
- `docs/DAILY_CODE_REVIEW.md` (новое ревью, read-only для завтрашнего утра)

---

## 🎯 РЕКОМЕНДУЕМОЕ РАСПРЕДЕЛЕНИЕ ПО РОЛЯМ

| Роль | Сегодня (приоритет) | Параллельные |
|------|---------------------|-------------|
| **Vesnin (Teamlead)** | ✅ Stage-gate решение + LGTM ветки | Review T1, T4, T5 контрактов |
| **Ozhegov (Структурщик)** | 🔴 Блокер #1: тесты + turbo.json | T2 scaffold, T5 контракты, T6 endpoint |
| **Dynin (Математик)** | 🟡 Stage-gate анализ метрик | T2 инфер, T5 взвешивание |
| **Музыкант** | 🟨 T1: сбор real samples | T3: конфигурация порогов |
| **Rodchenko (Верстальщик)** | 🟢 T3: UX hardening | Lint-fix (useMemo) в ветке |

---

## ⏱️ ТАЙМЛАЙН (примерный)

```
09:00–10:30  [БЛОКЕР 1] Code review → merge feat/trends-go-drone-tight
10:30–11:30  [БЛОКЕР 2] Stage-gate решение документ (Vesnin + Dynin)
11:30–12:00  Daily check-in (коротко, 15 мин)

12:00–17:00  Основная работа (T1–T6 параллельно)
             └─ T1 (VDR) — главная → готовность 50% к концу дня
             └─ T2 (YAMNet/CLAP scaffold) → ready unit-tests
             └─ T3 (sample-lib UX) → components green
             └─ T4 (stage-gate doc) — done
             └─ T5 (ensemble contracts) → signatures approved
             └─ T6 (background-media) → 50% endpoint

17:30–18:30  [Вечерний ритуал] Архив, code-review, commit
```

---

## 🔗 СВЯЗЬ С СТРАТЕГИЕЙ (WHITE_PAPER §8)

| Этап | Статус сегодня | Путь вперёд |
|------|-----------------|------------|
| **Этап 0** | ✅ завершён | — |
| **Этап 1.A (FFT/DSP)** | 🟡 исчерпан (потолок ~76% precision) | Trends DRONE_TIGHT в prod, остальное — диагностика |
| **Этап 1.B (Neural & Agentic)** | 🟨 инициирован сегодня | VDR + YAMNet/CLAP scaffold → готовность через 3–5 дней |
| **Этап 2+ (TDOA, multi-node)** | ❌ frozen | Разблокируется после stage-gate 1→2 (если прошли hard SLD) |

---

## 📌 КЛЮЧЕВЫЕ РЕШЕНИЯ (для LGTM)

**Утверждаю (Teamlead Vesnin):**

1. ✅ **Trends DRONE_TIGHT → prod** (recall 95%, precision ~76%, F1 0.844 на val).
   - Софт stage-gate (P≥80% R≥90%) достигнут ✓
   - Hard stage-gate (P≥85% R≥90%) не достигнут ✗
   - Рекомендация: включить в prod, параллельно VDR + zero-shot.

2. ✅ **VDR-эпик инициирован** как ближайший приоритет (follow-up к stage-gate).

3. ✅ **YAMNet + CLAP scaffold** как реквизит для Этапа 1.B (без спешки).

4. ✅ **Event-driven journal (JE1–JE5)** продолжает на параллельной ветке, не блокирует детекцию.

---

## 🚀 ИТОГО НА 2026-06-17

| Метрика | Целевое | Реалистичное |
|---------|---------|-------------|
| **Коммиты** | 10–15 | ~12 |
| **PR merged to main** | 2 (ветка + LGTM) | 1 (trends-go-drone-tight) |
| **Эпики инициированы** | 2 (VDR, 1.B start) | ✅ 2 |
| **Задачи D.O.D.** | 4/6 | ~3/6 (T4, T5, частично T1/T2) |
| **CI статус** | зелёный | 🟢 на конец дня |

---

**Координатор:** Vesnin (Teamlead)  
**Обновлено:** 2026-06-17T09:00+03:00  
**Статус:** ACTIVE