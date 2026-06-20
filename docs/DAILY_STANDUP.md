<!-- Сгенерировано: 2026-06-20T04:18:30.181Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# 🎯 ЕЖЕДНЕВНЫЙ СТЕНДАП MEMBRANA — 2026-06-20

**Время:** 04:17 UTC · **Ветка:** `techies68` · **Период:** последние сутки  
**Координатор:** Vesnin (Teamlead)

---

## 📋 Синтез входных данных

### Вчерашнее вечернее Code Review (`DAILY_CODE_REVIEW.md`)
- ✅ MP4 (Membrane Platform) стабилизирована: Docker, quotas, паринг.
- ⚠️ **Граф зависимостей требует проверки:** `cabinet → background-media` должен быть через HTTP, не импорт.
- ⚠️ **MembraneRegistry lifecycle:** регистр должен инициализироваться ДО запроса первой квоты.
- 🟡 **Линтер `@membrana/client`:** выход с кодом 1.
- 🟡 **Tests:** FFT и core некорректно репортятся в turbo (passWithNoTests); a11y для WaveformPlayer.

### Дневной стратегический план (`STRATEGIC_PLAN_DAY.md`)
- **Ключевой вывод:** Эшелон 0 (DSP/FFT) **исчерпан** на free-v1.
- **Единственный FFT-путь, достигший целей:** Trends `DRONE_TIGHT` (recall 95%, FPR 30%, F1 0.844).
- **Stage-gate 1→2 заблокирован:** нужна precision ≥85%, а trends P=0.76. Пути: VDR-калибровка или zero-shot нейро (CLAP/YAMNet).
- **На сегодня (6 задач M–L):** promotion trends, ensemble-контракт, TZ на nейро, VDR-утилита, Turbo-обновление, research.

### FFT/Trends Потенциал и Лимиты (`FFT_METRICS_POTENTIAL_AND_LIMITS.md`)
- Harmonics: P 43.6%, R 68.3%, FPR 88% → сигнализатор, не детектор.
- Cepstral + Spectral-flux (live): R ≈100%, FPR ≈100% → присутствие, не селекция.
- **Trends `DRONE_TIGHT` — лучший результат:** узкий спектральный бокс + требование стабильности во времени закрывает мягкую планку (80%/40%).

### Открытые GitHub Issues (выборка критичных)
- **#95** — Device-Board Refactor v0.4 (переменные, Event-узел, fullscreen) — **размер L, зависит от stage-gate**.
- **#94** — Deploy детерминированный/гейтированный (postmortem MP7b 2026-06-18) — **КРИТИЧНО для инфры**.
- **#93** — Membrana Studio (Electron) — **после MP7/NR6**.
- **#92** — MP7: Node Realtime Gateway (WebSocket для журнала) — **зависит от MP6 ✅**.
- **#83** — Телеметрия event-driven (JE1–JE5) — **в работе**, фокус дня по MAIN_DAY_ISSUE.

### CURRENT_TASK (черновики)
- MP0–MP6 archived; prod regression OK.
- Merge `feat/membrane-platform-mp4` → `vesnin` ожидает LGTM.
- Облачный журнал (parity, live-badge, фильтры) — post-v1.

---

## 🎭 СТЕНДАП ПО РОЛЯМ

### [Teamlead / Vesnin]

**Стратегический ориентир на сегодня:**

1. **Перекрёстное согласование трёх фронтов** (code-review вчера + strategy план + FFT-потенциал):
   - **Front 1 (MP4/MP7):** stabilize platform (journal, pairing, live-realtime) → **в коде сегодня**.
   - **Front 2 (Детекция):** transition от DSP (исчерпан) к VDR + nейро → **в спецификации / scaffold**.
   - **Front 3 (Инфра):** fix deploy determinism (#94) и Turbo reporting → **в checklist today**.

2. **Stage-gate 1→2 — не gate на сегодня, но инфраструктура:**
   - Trends `DRONE_TIGHT` ready for promotion (задача 1 в плане).
   - Ensemble-контракт (`DetectionEnsemble` в core) — scaffold к ZS-детекторам.
   - TZ на CLAP/YAMNet (задача 3).

3. **Линтер `client` красный** — найти и зафиксировать перед merge MP4.

4. **MembraneRegistry lifecycle** — проверить, что инит перед первым запросом quotas (микрокритична для MP4).

**Action (утро):**
```bash
yarn workspace @membrana/client lint --debug  # найти ошибку
yarn workspace @membrana/core test             # проверить passWithNoTests
yarn build                                     # глобальная проверка
```

---

### [Структурщик / Ozhegov]

**На сегодня:**

1. **Граф зависимостей MP4:** проверить линию `cabinet → background-media`. Должна быть:
   - ✅ HTTP API (`/v1/catalog`, `/v1/templates`), не импорт.
   - ❌ Запрещено: `import { catalog } from '@membrana/background-media'` в фронт.
   - Проверить: `yarn workspaces info | grep -A5 cabinet`.

2. **Ensemble-контракт (`DetectionEnsemble`)** — дизайн в `@membrana/core`:
   - Типы: `WeightedDetectorResult`, `EnsembleConfig`, `EnsembleVerdic`.
   - Утилита: `aggregateDetectorResults(results[], config)` — чистая функция.
   - Unit-тесты: единогласие, разброс, одиночный детектор.
   - **Размер:** S, LGTM от Teamlead в конце.

3. **Turbo-граф:** обновить для будущих nейро-сервисов (ONNX, HF transformers зависимости):
   - Добавить `devDependencies`: `onnxruntime`, `@huggingface/transformers`.
   - Turbo task-зависимости: `@membrana/zero-shot-detector-service`.
   - CI-check: `yarn check-deps` на циклы.

**Action (день):**
```bash
yarn workspaces info | grep -E "(cabinet|background-media)" # граф MP4
yarn add --save-dev onnxruntime @huggingface/transformers    # подготовка
# реализовать DetectionEnsemble контракт (см. Definition of Done)
```

---

### [Математик / Dynin]

**На сегодня:**

1. **Trends `DRONE_TIGHT` promotion** (параллельно с Музыкантом):
   - Бенчмарк на curated-датасете (≥50 дронов, ≥100 не-дронов, ESC-50 + городской фон).
   - Запуск: `yarn benchmark:detectors --dataset=curated-hand-labeled`.
   - Таблица результатов: recall, precision, F1, FPR.
   - Вывод: проходит ли stage-gate (P≥85%, R≥90%)?

2. **Research SOTA** (`acoustic-drone-detection-sota.md`, ~3000 слов):
   - CLAP vs YAMNet vs PANNs vs Whisper-на-БПЛА (сравнение).
   - Метрики на benchmark-датасетах (литература).
   - Ожидаемая performance на free-v1 (no fine-tuning, интерполяция).
   - Рекомендация для stage-gate (путь 1 / 2 / гибридный 3).
   - **Размер:** M, к концу дня draft.

3. **Edge-case тесты FFT** (`#32`) — если будет время:
   - Пустой буфер, NaN/Infinity, Nyquist, window Hann/Hamming.
   - JSDoc / README в `fft-analyzer`.

**Action (день):**
```bash
yarn benchmark:detectors --dataset=curated-hand-labeled
# сбор данных для research SOTA
# (parallel track: не блокирует фокус детекции)
```

---

### [Музыкант]

**На сегодня:**

1. **Trends `DRONE_TIGHT` promotion** (параллельно с Математиком):
   - Шаблон экспортирован в `background-media/templates/drone-tight-curated.json`.
   - Полное описание гиперпараметров (centroid/flux/rms боксы, temporal constraints).
   - Запуск бенчмарка (см. Математик).

2. **VDR-калибратор** (утилита переразметки, **размер L, начнём в течение дня**):
   - Скрипт `yarn vdr:calibrate-trends --input=libre-v1.zip --output=vdr-calibrated.csv`.
   - Входные параметры, выход (sample_id | ground_truth_label | trends_confidence | trends_verdict | manual_override).
   - Интерфейс ручной разметки (Electron / web-форма).
   - Статистика покрытия.

3. **Plug-in обновления** — если нужны minor правки в trends после бенчмарка (live-калибровка).

**Action (день):**
```bash
# экспорт DRONE_TIGHT шаблона
# начало разработки VDR-утилиты (scaffold + CLI)
```

---

### [Верстальщик / Rodchenko]

**На сегодня:**

1. **MP4 a11y issues** (из code-review):
   - `WaveformPlayer` в таблице: добавить `aria-label` и `role="region"`.
   - Проверить высоту строки таблицы (≤48px, чтобы не разрушить сетку).
   - Плеер: клавиша Escape для остановки (не мешать навигации).
   - Protesting с axe (a11y scan).

2. **Sample-library SPA** — адаптив на мобиль:
   - Соответствие DESIGN.md (контрастность, шрифты, расстояния).
   - Тесты контрастности, медиа-точки.

3. **VDR-утилита UI** (следующий, с Музыкантом):
   - Web-форма для разметки спорных сэмплов (inline audio player + радио выбор).
   - Быстрая навигация (стрелки / горячие клавиши).

**Action (день):**
```bash
# a11y фиксы MP4 (WaveformPlayer)
# SPA адаптив проверка
# подготовка к VDR-UI
```

---

## 📊 ОБЪЕДИНЁННЫЙ ПЛАН ДНЯ (Мастер-лист)

| # | Задача | Размер | Ответственный | Зависит от | DoD | Статус |
|---|--------|--------|---|---|---|---|
| **1** | Trends `DRONE_TIGHT` в prod-каталог | M | Музыкант + Математик | — | Бенчмарк ✅, шаблон export ✅, таблица в DETECTOR_BENCHMARK.md ✅ | 🔵 Start |
| **2** | Контракт `DetectionEnsemble` в core | S | Структурщик + Математик | — | Типы ✅, утилита ✅, unit-тесты ✅, export ✅, LGTM ✅ | 🔵 Start |
| **3** | TZ на zero-shot детектор (CLAP/YAMNet) | M | Математик + Структурщик | — | Docs ✅, выбор модели ✅, контракт ✅, scaffold ✅, README ✅ | 🔵 Start |
| **4** | VDR-калибратор (утилита + UI) | L | Музыкант + Верстальщик | 1 | CLI работает ✅, CSV валидна ✅, UI прототип ✅, инструкция ✅ | 🟡 Backlog |
| **5** | Turbo + nейро-зависимости (инфра) | S | Структурщик + Teamlead | — | package.json ✅, turbo.json ✅, workflow ✅, yarn build ✅ | 🔵 Start |
| **6** | Research SOTA (литература) | M | Математик + Teamlead | — | Docs ~3000 слов ✅, таблица сравнения ✅, 3+ ссылки ✅, рекомендация ✅ | 🟡 Draft |
| **\*MP4** | Lintel `client`, MembraneRegistry, graф | S | Teamlead + Ozhegov | — | Lint ✅, registry init ✅, граф OK ✅, merge MP4 ✅ | 🟠 Urgent |
| **\*MP7** | Node Realtime Gateway (WebSocket) | L | TBD (после MP4 LGTM) | MP4 ✅ | Контракт ✅, консилиум ✅, scaffold ✅ | 🟡 Depends |

---

## 🚨 Критические Action Items (утро)

### 1. **Лифтез линтера `client` ⚡**
```bash
cd apps/client
yarn lint --debug 2>&1 | tee /tmp/lint-debug.log
# → найти ошибку, зафиксировать сегодня перед merge MP4
```

### 2. **MembraneRegistry lifecycle проверка ⚡**
```bash
rg -n "new MembraneRegistry|initRegistry|registerPlugin" apps/client src/  # поиск инициализации
# убедиться: registry.init() ДО первого quotaService.get()
```

### 3. **Граф MP4 (cabinet → background-media) ⚡**
```bash
yarn workspaces info 2>&1 | grep -A10 "cabinet"
# проверить, что импорты идут через @membrana/core и HTTP, не прямо из background-media
```

### 4. **Trigger Trends бенчмарк (параллель)**
```bash
yarn benchmark:detectors --dataset=curated-hand-labeled &
# запустить в фоне, результаты к дневному синтезу
```

---

## 📅 Горизонт (недельный view)

| День | Фокус | Gate / Milestone |
|------|-------|-----------------|
| **Сегодня (20-го)** | Trends promotion + Ensemble контракт + TZ на nейро + инфра | MP4 merge ✅, задачи 1–3 draft |
| **Завтра (21-го)** | VDR-калибратор (прототип), Research завершение, MP4 prod smoke | — |
| **22–23 июня** | Zero-shot детектор scaffold → реализация (50%), консилиум stage-gate | — |
| **24–26 июня** | MP7 (Node Realtime) — разработка, калибровка нейро на real-data | MP7 production-ready |
| **Post-gate** | Device-Board Refactor v0.4 (переменные, Event-узел), Membrana Studio setup | Этап 2 разморозка (TDOA) |

---

## ✅ Definition of Done (конец дня)

- [ ] **Lint client:** `yarn workspace @membrana/client lint` — 0 ошибок.
- [ ] **Graф MP4:** `cabinet → background-media` через HTTP (проверено).
- [ ] **MembraneRegistry:** инит ДО quotas (код + комментарий).
- [ ] **Trends бенчмарк:** вывод в `DETECTOR_BENCHMARK.md` (recall ≥95%, FPR ≤35%).
- [ ] **Ensemble контракт:** types + utils в core, PR open / merged.
- [ ] **TZ на nейро:** docs `zero-shot-detector-spec.md`, LGTM Teamlead.
- [ ] **Turbo обновления:** package.json, turbo.json, `yarn build` ✅.
- [ ] **Research draft:** `acoustic-drone-detection-sota.md` опубликован (внутренне).
- [ ] **MP4 merge:** все критерии вчерашнего code-review закрыты, merge готов.
- [ ] **Вечер:** `yarn ritual:evening` (архив + code-review на завтра).

---

## 📌 Ключевые ссылки (для контекста)

| Документ | Назначение |
|----------|-----------|
| [`FFT_METRICS_POTENTIAL_AND_LIMITS.md`](./docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) | Потолок эшелона 0, выбор путей к stage-gate |
| [`STRATEGIC_PLAN_DAY.md`](./docs/STRATEGIC_PLAN_DAY.md) | 6 задач на сегодня, приоритет |
| [`DAILY_CODE_REVIEW.md`](./docs/DAILY_CODE_REVIEW.md) | Вчерашние риски MP4 (граф, registry, lint) |
| [`MAIN_DAY_ISSUE.md`](./docs/MAIN_DAY_ISSUE.md) | Телеметрия event-driven (JE1–JE5) — parallel track |
| [`DETECTOR_BENCHMARK.md`](./docs/DETECTOR_BENCHMARK.md) | Таблица результатов детекторов (обновить) |

---

**Статус:** ✅ **Синтез завершён. Команда готова к работе.**

🎯 **Мантра дня:** *Trends ready → Ensemble scaffold → Neural TZ → VDR prep* + *MP4 merge*, затем *stage-gate 1→2* (VDR-калибровка или zero-shot), потом *Этап 2 разморозка* (TDOA).