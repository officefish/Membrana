<!-- Сгенерировано: 2026-06-26T04:56:34.884Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# ☀️ ЕЖЕДНЕВНЫЙ СТЕНДАП — Membrana (2026-06-26)

**Время:** 08:45 UTC+3 | **Координатор:** Vesnin (Teamlead)  
**Входы:** вчерашнее вечернее ревью + STRATEGIC_PLAN_DAY + открытые issues + packages/temp/  
**Выходы:** DAILY_STANDUP.md → MAIN_DAY_ISSUE.md → yarn plan:day

---

## 📊 I. Синтез вчерашнего кода (DAILY_CODE_REVIEW)

### Завершено (merged, LGTM)
- ✅ **Trends DRONE_TIGHT production-ready:** recall 95% / FPR 30% в val, документировано в `FFT_METRICS_POTENTIAL_AND_LIMITS.md` (финальный итог эпика #84).
- ✅ **Device-board async-v2 Phase 5:** Beta-команда победила consilium; три UserCase мигрированы на async; Phase A (catalog publishing) в работе.
- ✅ **L18/L19 микрофонного pipeline:** re-arm clip capture на повторный запуск сценария, detached report bridge в async-resolved-dispatch.
- ✅ **OpenRouter интеграция:** `openrouter.service` в `background-office`, llm-proxy preflight + ночной ритуал night-hunt.

### Вчерашние риски (DAILY_CODE_REVIEW)
| Риск | Статус | Action утра |
|------|--------|-----------|
| **P1: RAG-тесты падают** (`@membrana/rag-service`) | 🔴 Блокер | `yarn turbo run test --filter=@membrana/rag-service --force` (инвестигировать) |
| **P2: device-board warnings** (3 шт) | 🟡 Нит | `yarn lint --filter=@membrana/device-board` (fix или Issue) |
| **P2: .sync-readme-out.txt** | 🟢 Гигиена | Удалить из root, проверить `.gitignore` |

---

## 🗺️ II. Стратегический план на день (STRATEGIC_PLAN_DAY)

### Магистраль дня

| Этап | Задача | Роль | Таймбокс | Блокирует |
|------|--------|------|----------|-----------|
| **1. Детекция: нейро-эшелон** | A: NeuralDetector контракт + CLAP-skeleton | Динин + Музыкант | 09:00–11:00 | B |
| | B: Удалить архивные DSP-детекторы | Ozhegov | 09:30–10:30 | — |
| **2. Архитектура (Stage 2)** | C: TransportService спецификация | Ozhegov | 10:30–12:00 | D |
| | D: TDOA-service skeleton (frozen) | Ozhegov | 12:00–13:00 | — |
| **3. Бенчмарк & docs** | E: DETECTOR_BENCHMARK.md обновить | Верстальщик + Динин | 10:00–11:00 | — |
| | G: DEVELOPER_RHYTHM.md синхронизировать | Vesnin + Ozhegov | 11:00–12:00 | — |
| **4. Device-board стабилизация** | F: L20 async-pipeline stress-тест | Rodchenko | 13:00–14:00 | — |

### Параллели (выполняются без блокировки)
- **VDR data collection:** Музыкант собирает 15+ sample'ов с разметкой (эпик #84 follow-up).
- **Device-board W0 hotfixes:** Rodchenko работает над #146, #152, #153 (selection/palette/copy).
- **Night-hunt операции:** background-office ночной запуск trend-анализа через OpenRouter.

---

## 🔴 III. Открытые GitHub Issues (приоритизация)

### **T0 (Критичные блокеры — утро)**
1. **#180** — `L18 clip recorder re-arm + L19 detached report bridge` (async-v2 smoke fail)  
   *Статус:* fixing; target merge сегодня  
   *Роль:* Ozhegov (async-pipeline) + Музыкант (micro-test)

2. **#178** — `async-v2 track upload fails` (comp-packaging Phase C)  
   *Статус:* investigating; связан с #180  
   *Роль:* Структурщик (runtime), Верстальщик (UI)

### **T1 (P1 — высокий приоритет)**
3. **#151** — Device-board W0 hotfixes (эпик: #146, #152, #153)  
   *Target:* до конца спринта (MVP UserCase)  
   *Роль:* Rodchenko (lead)

4. **#144** — Tasks audit v1 (bookkeeping, reviewing, scripts)  
   *Статус:* planning; спецификация готова  
   *Роль:* Vesnin + Ozhegov

### **T2 (P2 — магистраль)**
5. **#141** — Device-board pause runtime v0.7  
   *Статус:* в очереди; зависит от #151 (W0 polish)  
   *Роль:* Ozhegov (runtime core)

6. **#131** — Device-Board Journal + Reporter v0.6  
   *Статус:* active; phase DBJ1 in progress  
   *Роль:* Музыкант (contracts) + Верстальщик (UI)

7. **#95** — Device-Board Refactor v0.4 (variables, Event, dataflow)  
   *Статус:* in progress; 6/7 фаз готовы  
   *Роль:* Структурщик (core), Rodchenko (UI)

8. **#157** — Bug: comment group deletion не должно удалять узлы  
   *Статус:* bug; S-размер  
   *Роль:* Rodchenko (graph logic)

9. **#153** — W0-H3: selection при закрытии модалки  
   *Статус:* bug; S-размер  
   *Роль:* Rodchenko (modal/selection)

10. **#146** — W0-H1: palette в редакторе функций отсутствует  
    *Статус:* bug; S-размер  
    *Роль:* Rodchenko (sidebar)

### **T3 (P3 — операционные)**
11. **#94** — Deploy детерминированность (POSTMORTEM MP7b)  
    *Статус:* planning; solution consilium готова  
    *Роль:* Математик (CI/scripts), Структурщик (staging)

12. **#92** — MP7: Node Realtime Gateway (WebSocket для журнала)  
    *Статус:* spec ready; waiting stage-gate 1→2  
    *Роль:* Ozhegov (transport), Верстальщик (UI)

---

## 📦 IV. Наброски в packages/temp/ (если есть)

*Примечание: `yarn standup:dry` без API не может прочитать содержимое; если temp/ содержит:*

- **`temp/neural-detector-sketch.ts`** (Dynin's work-in-progress)  
  → Перенести в `packages/services/detector-base/src/types.ts` как интерфейс `NeuralDetector` (задача A).

- **`temp/transport-concept.md`** (Ozhegov's notes)  
  → Формализовать в `packages/services/transport-service/CONCEPT.md` (задача C).

- **`temp/device-board-w0-fixes.txt`** (Rodchenko's checklist)  
  → Синхронизировать с #151 / #146 / #152 / #153; не дублировать.

---

## 🎯 V. СИНТЕЗИРОВАННЫЙ ДНЕВНОЙ ПЛАН

### **09:00–09:30 — Утренний брифинг (all roles)**

```bash
yarn lint --filter=@membrana/device-board  # P2 lint warnings
yarn turbo run test --filter=@membrana/rag-service --force  # P1 RAG debug
yarn turbo run typecheck build --no-cache --filter=@membrana/{core,detector-base}  # verify base
```

**Решение:** 
- RAG-тесты: если падает на imports или mock — исправить за 10 мин; если системная ошибка — залогировать Issue, помечать как `blocked-by:rag-service-tests`.
- Lint: device-board warnings → либо fix, либо #issues.
- Base packages: зелёные → proceed.

---

### **09:30–11:00 — Параллель A: Детекция (Динин + Музыкант)**

**Задача A: NeuralDetector контракт + CLAP-skeleton**

| Шаг | Содержание | Роль | Выход |
|-----|-----------|------|--------|
| A1 | Добавить `interface NeuralDetector { predict(window: AudioWindow, context?: InferenceContext) → Promise<DetectionResult> }` в `detector-base/src/types.ts` | Динин | файл типов |
| A2 | Создать заготовку `packages/services/clap-detector-service/` (package.json, tsconfig, index.ts с заглушкой) | Динин | skeleton пакета |
| A3 | Написать минимальный юнит-тест: CLAP inference на mock-буфере (48 kHz, 1 сек дрона) | Динин | test file + mock fixtures |
| A4 | Задокументировать в README: как подключить YAMNet/Whisper/другую модель; контракт inference | Динин | README.md |
| A5 | Интегрировать OpenRouter call для CLAP через `background-office` (skeleton, без full auth) | Музыкант | integration hook |
| A6 | CI: `yarn turbo run typecheck test --filter=@membrana/clap-detector-service` = green | Динин | turbo green ✅ |

**DoD:** Интерфейс добавлен; skeleton компилируется; unit-тесты пишутся; документация готова.  
**Блокирует:** B (удаление DSP).

---

### **09:30–10:30 — Параллель B: Инфраструктура (Структурщик)**

**Задача B: Удалить архивные DSP-детекторы**

| Шаг | Содержание | Роль | Выход |
|-----|-----------|------|--------|
| B1 | Удалить папки `packages/services/detectors/{harmonic,cepstral,spectral-flux}-detector-service/` | Ozhegov | git rm |
| B2 | Проверить и обновить ссылки в `ARCHITECTURE.md` §1e (удалить упоминания DSP-трио) | Ozhegov | doc patch |
| B3 | Добавить секцию в `DETECTOR_BENCHMARK.md`: "Why trends-FFT is the only FFT path" с ссылкой на `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §4–5 | Ozhegov | doc section |
| B4 | Обновить `scripts/lib/detection-planning-priorities.mjs`: блокировать предложение "unified benchmark harmonic+cepstral+flux" | Ozhegov | script patch |
| B5 | Turbo green: `yarn turbo run test --force` (обновить imports в тестах) | Ozhegov | turbo green ✅ |

**DoD:** Папки удалены; docs обновлены; тесты не падают; CI зелёный.  
**Блокирует:** ничего (параллельно).

---

### **10:30–12:00 — Параллель C: Многоузловая архитектура (Структурщик)**

**Задача C: Transport-Service спецификация**

| Шаг | Содержание | Роль | Выход |
|-----|-----------|------|--------|
| C1 | Создать `packages/services/transport-service/` + `CONCEPT.md` | Ozhegov | папка + doc |
| C2 | Определить типы: `NodeMessage`, `ObservationBatch`, `AckMessage`, retry-стратегия (exponential backoff, max 5 retries), TLS/client-cert | Ozhegov | CONCEPT.md sections |
| C3 | Интерфейс `TransportClient { send(msg: NodeMessage) → Promise<AckMessage>, onMessageLost(), bufferSize }` | Ozhegov | interface в типах |
| C4 | Диаграмма в README: узел → edge-gateway → fusion-server; обозначить слои | Ozhegov | ASCII/Mermaid diagram |
| C5 | Привязка к WHITE_PAPER §7 (контракт наблюдения `AcousticObservation`) | Ozhegov | cross-ref comment |

**DoD:** Спецификация написана; интерфейсы ясны; диаграмма есть; связь с WHITE_PAPER явная.  
**Блокирует:** D.

---

### **12:00–13:00 — Параллель D: TDOA skeleton (Структурщик)**

**Задача D: TDOA-сервис (frozen, documented)**

| Шаг | Содержание | Роль | Выход |
|-----|-----------|------|--------|
| D1 | Scaffold `packages/services/tdoa-service/` (package.json, tsconfig, vite.config.ts) | Ozhegov | папка |
| D2 | Файл `src/index.ts`: экспорт `interface TdoaAnalyzer { analyze(obs: AcousticObservation[]) → TdoaResult[] }` (типы в @membrana/core) | Ozhegov | interface file |
| D3 | Заглушка-реализация: `throw new Error('Not Yet Implemented: TDOA frozen until stage-gate 1→2')` | Ozhegov | stub impl |
| D4 | Файл `FREEZE_CONDITION.md`: описать, когда разморозить (trends-DRONE_TIGHT ≥ P85%/R90%, validated dataset) | Ozhegov | freeze doc |
| D5 | Комментарий в `.cursorrules` и ARCHITECTURE.md §1a о frozen-пакетах и условиях разморозки | Ozhegov | docs |

**DoD:** Skeleton пакета создан; интерфейсы ясны; заглушка компилируется; freeze-условия задокументированы.  
**Блокирует:** ничего (info-only для Stage 2 планирования).

---

### **10:00–11:00 — Параллель E: Бенчмарк & документация (Верстальщик + Динин)**

**Задача E: Обновить DETECTOR_BENCHMARK.md для trends-DRONE_TIGHT**

| Шаг | Содержание | Роль | Выход |
|-----|-----------|------|--------|
| E1 | Добавить новую строку в таблицу: "Trends FFT (DRONE_TIGHT)" с метриками recall 95% / FPR 30% / F1 0.844 | Динин | table row |
| E2 | Добавить ссылку на `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §0 (TL;DR) и §6 (куда дальше) | Верстальщик | cross-ref |
| E3 | Удалить или пометить как archived старые строки harmonic/cepstral/spectral-flux | Верстальщик | cleanup |
| E4 | Добавить секцию "Next Steps": validated dataset (VDR) или zero-shot CLAP/YAMNet как пути роста | Динин | new section |
| E5 | Добавить замечание о free-v1 датасете и необходимости переоценки на validated-корпусе | Динин | caveat |

**DoD:** Таблица обновлена; ссылки добавлены; секция "Next Steps" написана; документ форматирован.  
**Блокирует:** ничего (информационно).

---

### **11:00–12:00 — Параллель G: Синхронизация ритуалов (Teamlead + Структурщик)**

**Задача G: DEVELOPER_RHYTHM.md синхронизировать с FFT_METRICS**

| Шаг | Содержание | Роль | Выход |
|-----|-----------|------|--------|
| G1 | Обновить `scripts/lib/detection-planning-priorities.mjs`: новая функция `shouldBlockDspConsensusBenchmark()` возвращает true (блокирует proposing этого как магистраль) | Ozhegov | script |
| G2 | В `DEVELOPER_RHYTHM.md` §«Morning Standup» добавить: "trends-template-match is the prod path (DRONE_TIGHT), not DSP-consensus" | Vesnin | doc section |
| G3 | В `DEVELOPER_RHYTHM.md` §«Detection Planning» явно сказать: "На free-v1 FFT-потолок достигнут; дальше — VDR или нейро (эшелон 1.B)" | Vesnin | doc section |
| G4 | Обновить команду `yarn plan:day` чтобы читала флаг из `FFT_METRICS_POTENTIAL_AND_LIMITS.md` и выводила в STDOUT "Current FFT status: SATURATED, trends-DRONE_TIGHT is prod-ready" | Vesnin | bash/mjs |

**DoD:** Скрипты обновлены; документация синхронизирована; команда `yarn plan:day` читает статус и выводит актуальный вердикт.  
**Блокирует:** ничего (политика + инструментовка).

---

### **13:00–14:00 — Параллель F: Device-Board стабилизация (Верстальщик)**

**Задача F: L20 async-pipeline stress-тест**

| Шаг | Содержание | Роль | Выход |
|-----|-----------|------|--------|
| F1 | Написать тест `async-resolved-dispatch.stress.test.ts`: запустить сценарий 3 раза подряд, каждый раз с микрофонной записью 1 сек | Rodchenko | test file |
| F2 | Проверить: после каждого `stop` и повторного `start` запись корректно переключается (нет утечек буферов, таймеры очищены) | Rodchenko | test assertions |
| F3 | Добавить проверку на утечки памяти: используя `jest.clearAllMocks()` и отслеживание `setInterval` вызовов | Rodchenko | test guards |
| F4 | Интеграционный тест в CI: `yarn test device-board -- --grep "async.*re-arm"` | Rodchenko | CI config |
| F5 | Smoke: `yarn workspace @membrana/client dev`, вручную пройти цикл start → stop → start сценария | Rodchenko | manual check |

**DoD:** Stress-тесты написаны и проходят; утечек памяти нет; CI зелёный.  
**Блокирует:** ничего (стабилизация L18/L19).

---

### **Параллельно весь день (фоновые задачи)**

| Задача | Роль | Таймбокс | DoD |
|--------|------|----------|-----|
| **VDR data collection** | Музыкант | 09:00–17:00 | 15+ sample'ов с разметкой в `data/validated-samples/`, CSV |
| **W0 hotfixes** (#146, #152, #153) | Rodchenko | 10:00–17:00 | 3 PR ready for review |
| **Night-hunt operations** | background-office | 18:00–06:00 | daily trend-analysis run, logs в `/var/log/membrana-night-hunt/` |

---

## 📋 VI. Definition of Done (сегодня)

- [ ] **RAG-тесты:** `yarn turbo run test --filter=@membrana/rag-service` = green или Issue залоггена.
- [ ] **Детекция (A):** NeuralDetector контракт в detector-base; CLAP skeleton скомпилирован; unit-тесты пишутся.
- [ ] **DSP cleanup (B):** Три папки удалены; docs обновлены; `yarn turbo run test` green.
- [ ] **TransportService (C):** CONCEPT.md написан; типы определены; диаграмма есть.
- [ ] **TDOA skeleton (D):** Пакет создан; freeze-условия документированы.
- [ ] **DETECTOR_BENCHMARK (E):** Trends DRONE_TIGHT добавлена; "Next Steps" написаны.
- [ ] **DEVELOPER_RHYTHM (G):** Script + docs обновлены; `yarn plan:day` выводит актуальный статус.
- [ ] **L20 stress-тест (F):** Тесты написаны; no memory leaks; CI green.
- [ ] **Вечерний ритуал:** `yarn archive:daily-day`, `yarn code-review`, `git commit docs/`.

---

## 🚀 VII. Команды дня (быстрая справка)

```bash
# Утро: инвестигация
yarn lint --filter=@membrana/device-board
yarn turbo run test --filter=@membrana/rag-service --force

# Проверка base
yarn turbo run typecheck build --no-cache --filter=@membrana/{core,detector-base}

# Днём: параллельные запуски
yarn turbo run typecheck test --filter=@membrana/{clap-detector-service,detector-base,device-board}
yarn turbo run build --filter=@membrana/{transport-service,tdoa-service}  # skeleton only

# Вечер: архив
yarn ritual:evening  # = archive:daily-day + code-review + commit
```

---

## ✅ Итого

**Дневной фокус:** Завершение эшелона 0 FFT (trends-DRONE_TIGHT в продакшене) и закладка фундамента эшелона 1.B (нейро-детекторы) + архитектурная подготовка Stage 2 (многоузловая триангуляция). Device-board стабилизируется параллельно. **Все задачи независимы; выполняются параллельно; нет критических блокеров после утреннего RAG-инвеста.**

**Дата:** 2026-06-26 | **Публикация:** 08:45 UTC+3 | **Координатор:** Vesnin ✅