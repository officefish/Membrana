<!--
  archive-role: archive-snapshot
  archive-day: 2026-06-28
  archived-at: 2026-06-28T18:31:13.857Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-06-28T05:49:06.537Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# 🌅 ЕЖЕДНЕВНЫЙ СТЕНДАП MEMBRANA — 2026-06-28

**Время:** 06:42 UTC | **Горизонт:** следующие 24 часа  
**Координатор:** Vesnin (Teamlead) | **Цепь:** `yarn standup` + `yarn plan:day` + `yarn main-day-issue`

---

## 📊 СИНТЕЗ: Вчерашнее вечернее ревью + текущие блокеры

### ✅ Code Review (вчера 16:33 UTC)

| Статус | Сфера | Вывод |
|--------|-------|-------|
| ✅ | **Phase 2b (device-board-packaging)** | Архитектура целостна; UserCase-сценарии упакованы как замкнутые гены |
| ⚠️ | **exec-successor.ts + function-call-resolve.ts** (новые) | Требуют документирования в CONCEPT.md; проверить дублирование с function-pin-ops |
| ⚠️ | **user-case-catalog-service** (Location: apps/client) | Должен переместиться в `packages/services/usercase-catalog` (нарушение boundary) |
| ✅ | **Гигиена дерева** | Нет .txt-логов, рабочее дерево чистое |
| 🟡 | **Definition of Done** | Lint/typecheck зелень; Playwright green (48/48); a11y modal требует инспекции |

**Критерий LGTM:** Условный pass; Phase 3 требует консилиума на архитектурные решения.

---

### 📌 Стратегический план дня (вчера 05:42 UTC)

**Главная ось:** Завершить stage-gate 1→2 консилиум + зафиксировать FFT-потолок.

| Задача | Приоритет | Статус | Блокирует |
|--------|-----------|--------|-----------|
| **4.1** Документирование stage-gate 1→2 decision | 🔴 P0 | ⏳ Ожидает консилиума | Этап 2 (TDOA, multi-node) |
| **4.2** Frozen-mark в `@membrana/core` | 🟡 P1 | Sketch готов | Архитектурная граница |
| **4.3** Cepstral-detector → Working State | 🟡 P1 | Scaffold готов | Эшелон 1.A диагностика |
| **4.4** Refactor ensemble-service skeleton | 🟡 P1 | Контракты готовы | Этап 1.B (после gate) |
| **4.5** Promote trends `DRONE_TIGHT` в curated | 🟠 P2 | Шаблон готов | User-facing UX |
| **4.6** Multi-node transport sketch | 🟡 P1 | Тип-контракт sketch | Этап 2 foundation |
| **4.7** Dependency audit | 🟠 P2 | Скрипт нужен | CI/CD integrity |

---

### 🔴 OPEN GITHUB ISSUES (активные блокеры)

| ID | Название | Пакет | Severity | Resolve |
|----|----------|-------|----------|---------|
| **#187** | headroom proxy-perf замер (C6 of #186) | infra (tools) | 🟡 medium | Smoke-сеанс Claude Code |
| **#186** | agent context optimization — headroom+RAG | infra (ritual) | 🔴 high | C1–C6 интеграция в ритуал |
| **#185** | services→device-board boundary violation (8 imports) | `usercase-catalog` | 🔴 high | Refactor imports; вынести в core или shared |
| **#178** | async-v2 track upload fails (detached report blocked) | device-board, client | 🔴 high | UserCase async-job resolve flow |
| **#157** | comment group deletion removes child nodes | device-board | 🟠 medium | React Flow reparent logic |
| **#153** | selection cleared when closing grouping modal | device-board | 🟠 medium | Part of W0-hotfixes (#151) |
| **#151** | Device-board W0 hotfixes (H1–H3) | device-board, client | 🟠 medium | Backlog: H3→H1→H2 |

**Критическое:** #185 нарушает архитектурную границу и блокирует gate-проверку; нужен рефакторинг до LGTM.

---

### 📂 packages/temp/ (наброски)

```
packages/temp/
├── exec-successor.ts (new, ~120 LOC)
│   ├── Что: расширение block-executor для цепочек функций
│   ├── Статус: untracked, требует документирования
│   └── Action: привязать к DEVICE_BOARD_CONCEPT.md §Runtime
│
├── function-call-resolve.ts (new, ~90 LOC)
│   ├── Что: resolver пинов/вызовов функций
│   ├── Статус: untracked, возможен дублём с function-pin-ops.ts
│   └── Action: audit на пересечения, merge или разделить зоны
│
└── trends-template-curated.generated.ts (auto-gen, 540 LOC)
    ├── Что: JSON→TS for DRONE_TIGHT шаблон
    ├── Статус: ready for curated catalog
    └── Action: integrate в device-board/src/catalogs/
```

---

## 🎯 ГЛАВНЫЙ ФОКУС ДНЯ (MAIN_DAY_ISSUE, обновлено 28.06)

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│  🔴 ЕДИНСТВЕННЫЙ ОБЯЗАТЕЛЬНЫЙ ФОКУС                       │
│                                                           │
│  1. Разрешить #185 (boundary violation)                   │
│     → Вынести UserCaseCatalogEntrySummary в @membrana/core
│     → Обновить imports в usercase-catalog-service       │
│                                                           │
│  2. Консилиум stage-gate 1→2                              │
│     → Recall 95% ✅ / Precision 76% vs target 85% ⚠️      │
│     → Документировать в STAGE_GATE_1_TO_2_DECISION.md    │
│     → Принять: "Conditional Pass" (soft SLD) или         │
│       "Требуется доработка ensemble/trends-конкуренты"  │
│                                                           │
│  3. Fix #178 async-v2 track upload                        │
│     → Жизненный цикл async-job в device-board runtime    │
│     → Detached drone report зависит от resolve           │
│                                                           │
│  ⏱️ Таймбокс: 09:00–13:00 (4 часа критических работ)      │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 📋 НАЗНАЧЕНИЕ ПО РОЛЯМ (сегодня)

### [Teamlead — Vesnin]

**Фокус:** Stage-gate консилиум + граница CORE

1. **09:00–09:30:** Инициировать консилиум stage-gate 1→2 (Dynin + Ozhegov)
   - Входные метрики из FFT_METRICS_POTENTIAL_AND_LIMITS.md
   - Дискуссия: recall 95% / precision 76% — мягкий SLD или доработка?
   - Выход: `STAGE_GATE_1_TO_2_DECISION.md` с LGTM

2. **09:30–10:30:**审查 #185 (boundary violation)
   - Какие типы нужны в usercase-catalog-service?
   - Вариант: `UserCaseCatalogEntrySummary` → `@membrana/core/src/device-board-types.ts`
   - Или: дублировать локально в usercase-catalog без зависимости

3. **10:30–11:00:** Review / LGTM для Phase 2b (device-board-packaging)
   - Проверить exec-successor, function-call-resolve на документирование
   - LGTM или return to Phase 3

**DoD:**
- [ ] Консилиум завершён; STAGE_GATE_1_TO_2_DECISION.md в docs
- [ ] #185 разрешена (выбран путь refactor)
- [ ] LGTM или conditional pass Phase 2b

---

### [Структурщик — Ozhegov]

**Фокус:** Boundary refactor + #178 fix

1. **09:00–10:00:** Audit #185 (8 нарушений boundary)
   - Проверить все imports usercase-catalog → device-board
   - Выбрать: вынести в core или дублировать типы
   - PR-черновик с рефактором

2. **10:00–11:00:** Разобраться с #178 (async-v2 upload fails)
   - Жизненный цикл: make-track → start-async-job → upload → detached-report
   - Где обрывается chain?
   - Точка fix: scenarioMicJournalBridge / getDefaultMediaLibraryService

3. **11:00–12:30:** Реализация #185 рефактора
   - Merge exec-successor, function-call-resolve в runtime или scaffold
   - Проверить дублирования с function-pin-ops

**DoD:**
- [ ] #185 PR готов к review (boundary refactored)
- [ ] #178 root-cause identified; fix-план описан
- [ ] `yarn turbo run lint typecheck --no-cache` — зелень

---

### [Верстальщик — Rodchenko]

**Фокус:** W0-hotfixes + Phase 2b smoke

1. **09:00–10:30:** Smoke Phase 2b UserCase
   - Запустить alpha/beta/gamma сценарии в dev-режиме
   - Проверить ношу (копирование узлов) — для #152 подготовка
   - a11y инспекция modal из Phase 2b

2. **10:30–12:00:** W0-hotfix #153 (selection clearance)
   - Backdrop / Escape → узлы остаются выделенными
   - Fix: dismissSelectionAction не должна вызывать clearCanvasNodeSelection

3. **12:00–13:00:** Ожидание ЛГТМ #185; если merge — smoke новых типов

**DoD:**
- [ ] Smoke Phase 2b пройдён; ошибок отмечены
- [ ] W0-H3 (#153) merged (или PR готов)
- [ ] a11y инспекция завершена

---

### [Математик — Dynin]

**Фокус:** Консилиум метрик + C3 headroom audit

1. **09:00–10:00:** Участие в консилиума stage-gate
   - Прочитать FFT_METRICS_POTENTIAL_AND_LIMITS.md
   - Защитить точность precision-метрик; предложить пути к 85%
   - Проголосовать за gate decision

2. **10:00–11:00:** Реализация C3 headroom-audit (`yarn ritual:evening`)
   - Добавить `headroom audit-reads --format json` в rag-evening-index.mjs
   - Сохранять в `docs/archive/<date>-audit-reads.json`
   - Smoke-тест: ночной ритуал запускается без ошибок

3. **11:00–13:00:** Подготовка C6 (proxy-perf замер)
   - Запустить headroom proxy (tools/headroom-venv)
   - Провести рабочий сеанс Claude Code (≥20 tool calls)
   - Заполнить proxy-perf-report.json

**DoD:**
- [ ] Консилиум завершён; метрики задокументированы
- [ ] C3 headroom-audit интегрирована в ритуал
- [ ] C6 proxy-perf-report готов (или smoke-план)

---

### [Музыкант — Kuryokhin]

**Фокус:** Параллельно T1–T2 (VDR, YAMNet)

1. **11:00–16:00:** Продолжить VDR-сбор (из вчерашнего плана T1)
   - 10+ сэмплов в `data/validated-samples/`
   - CSV разметка (time, class, confidence notes)
   - Параллельно: YAMNet scaffold (если время)

2. **Async:** Monitoring #178 (может потребоваться audio-плагин в device-board)
   - Если фикс требует Web Audio интеграции — готов помочь
   - Но сегодня это не критический путь

**DoD:**
- [ ] 10+ VDR-сэмплов в данных
- [ ] YAMNet scaffold (типы, контракты) готов

---

## 🔧 КОМАНДЫ УТРА

```bash
# Синхронизация состояния
yarn install --frozen-lockfile
yarn turbo run lint typecheck test --no-cache

# Консилиум stage-gate (10 мин)
yarn ask dynin --task-file ./docs/FFT_METRICS_POTENTIAL_AND_LIMITS.md \
  --save-as STAGE_GATE_1_TO_2_DECISION \
  "Пройден ли gate hard SLD (P≥85% R≥90%) на trends DRONE_TIGHT? \
   Или принимаем soft SLD (P≥75% R≥90%) с условием VDR-эпика в 3–5 дней?"

# Проверка #185 (boundary)
node scripts/check-package-boundaries.mjs --filter=services-no-device-board-imports

# Smoke Phase 2b (dev-режим)
yarn workspace @membrana/client dev &
# в браузере: Device Board → Load UserCase → alpha scenario

# Ночной ритуал (эхо вечером)
yarn ritual:day
```

---

## ✅ Definition of Done (день)

- [ ] **Консилиум stage-gate 1→2 завершён** → STAGE_GATE_1_TO_2_DECISION.md в docs с LGTM
- [ ] **#185 boundary refactor** → PR в review ИЛИ merged
- [ ] **#178 root-cause identified** → fix-план или hotfix merge
- [ ] **W0-H3 (#153)** → PR merged
- [ ] **C3 headroom-audit в ритуале** → smoke-тест green
- [ ] **Smoke Phase 2b** → ошибки задокументированы
- [ ] **`yarn turbo run lint typecheck test build`** → ✅ zero errors
- [ ] **Вечерний ритуал выполнен** (`yarn ritual:evening`, архив + code-review)

---

## 📅 Контекст (связь с WHITE_PAPER)

| Документ | Актуальность | Применимо |
|----------|--------------|-----------|
| **WHITE_PAPER.md** | Stage-gate 1→2 определен в §8 | ✅ Основа консилиума |
| **FFT_METRICS_POTENTIAL_AND_LIMITS.md** | Trends DRONE_TIGHT 95%/30%, precision 76% | ✅ Входные метрики |
| **ARCHITECTURE.md** | Граница services ↔ device-board | ✅ #185 boundary rule |
| **SERVICES.md** | usercase-catalog-service в foundation | ✅ Переместить в packages/services/ |
| **DEVELOPER_RHYTHM.md** | Ежедневный ритуал, консилиум, code-review | ✅ Наш календарь |

---

## 🚀 Статус готовности

```
09:00 — 🟢 Команда готова к запуску утренних блокеров
10:00 — 🟡 Консилиум на параллельном потоке (Dynin + Vesnin)
12:00 — 🟡 Ожидание ЛГТМ #185 и smoke Phase 2b
13:00 — 🟢 Вечерний ритуал (архив, code-review, планирование завтра)
```

---

**Опубликовано:** 2026-06-28T06:42 UTC  
**Координатор:** Vesnin (Teamlead)  
**Ветка:** `techies68` (Phase 3, device-board W1) + `rodchenko` (W0-hotfixes)  
**Целевой эшелон:** Этап 1.A завершен; gate-1→2 решение; Этап 2 frozen до ЛГТМ