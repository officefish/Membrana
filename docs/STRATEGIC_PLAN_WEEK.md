<!-- Сгенерировано: 2026-10-05T12:28:23.447Z (yarn plan:week@cc60af1d) -->
<!-- Период: последние 7 дней (since="7 days ago"); горизонт: следующая неделя -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующая неделя (2026-10-05 — 2026-10-11)

> **Стратегический планировщик проекта Membrana**  
> Справедливость контекста: данные за 7 дн. назад (с 2026-09-28); снимок git log к 2026-10-05 15:22:43.

---

## Стратегический якорь

**WHITE_PAPER.md §0 (видение):** Membrana — распределённая сенсорная сеть для мониторинга БПЛА в нижнем небе через акустическую триангуляцию. **Этап 1.A (Single-Node Detection First)** завершён на уровне trends FFT: recall **95% / FPR 30%** на val. Этап 2 (многоузловая синхронизация, TDOA) — **заморожен** до stage-gate 1→2.

**Мета-статус (на 2026-10-05):**
- **Детекция:** FFT-потолок зафиксирован (см. `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §0); дальше — нейро/zero-shot (CLAP/YAMNet, уже в продакшене).
- **Продукт:** свободный тариф (FREE) в финале; шаблоны trends-detector в образе media зафиксированы (PR #2575, исправлено в #2564); библиотека сэмплов стабильна (2 спринта закрыты #2569/#2570); cabinet/device-board подготовлены к выпуску.
- **Инфраструктура:** office-stack обновлён (credentials #2580/#2582/#2583), ночной ритуал фиксирует нарушения non-critical шагов (#2585).

---

## Краткий обзор достигнутого (7 дней)

### ✅ Завершённые спринты (git log)

| Спринт | Фокус | Гейт | Статус |
|--------|-------|------|--------|
| **chart-list-plugin-20261003** | Журнал прогонов плагинов в кабинете | 2/2 pass | CLOSED |
| **library-reconcile-on-open-2569** | Лёгкая сверка коллекций на открытии | 2/2 pass | CLOSED |
| **library-loading-state-2570** | UI-состояние загрузки вместо false-алёрта | 2/2 pass | CLOSED |
| **header-badge-narrow-2558** | Шапка доски: бейдж удержания при ~1065 px | 2/2 pass | CLOSED |
| **media-image-trends-templates** (срочно 03.10) | Шаблоны в Docker + регистрация плагинов | ad-hoc | merged |
| **tariff-dataset-label-2561** | Имя коллекции без тарифного ID | in progress | recut b2 |

### 🔧 Инфраструктурные работы

- **office-stack stabilization** (#2580/#2582/#2583): credentials generator, MongoDB health probe, prod env validation.
- **build cache fix** (#2525/#2555): `tsc -b --force` в сборке пакетов + зуб-сценарий отравления турбо-кеша.
- **ritual enhancements** (#2585): non-critical step tracker с эскалацией при пороговом количестве срывов.

### 📊 Состояние гейтов (по `docs/tasks/morning-gates-state.json` на 2026-10-04)

- **Утренние gate-проверки:** 2/3 pass (coverage ✓, eslint ✓; deps-watch ⚠).
- **Ночные:** ritual-close pass; CI на стволе зелёный.

---

## Гипотеза о текущем состоянии (разведка)

Из git log **НЕ видно**:
- Коммитов в сервисы детекции (audio-engine, fft-analyzer, detector-*) — контекст обслуживания или паузы на валидации?
- Активного развития Этапа 2 (TDOA, localizer, tracker сервисы из WHITE_PAPER §8) — заморожены до stage-gate?
- Явных PR на нейро-детекторы (yamnet уже в бенчмарке по `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §0); code-heavy work, похоже, в `background-media` и client-плагинах.

**Вопросы для валидации:**
1. Статус hard-gate 85%/90% (VDR-валидация) — когда пилотный корпус к утверждению?
2. Есть ли скрытый (незалитый в 7 дн.) код по нейро или fusion-layer?
3. Приоритет: завершить FREE-тариф (выпуск) vs. запустить next-sprint детекции?

---

## Предлагаемая магистраль на неделю

### **Магистраль #1 (высокий приоритет, владельцу на ratify)**

#### **Завершение FREE-тарифа и выпуск (студия + лендинг)**

**Фокус:** Вывести продукт на стейджинг, готовый к скачиванию (free-v1).

**Блоки работ:**

**A. Stabilize & validate FREE-tier UX (1–2 дня)**
- Дорешить **tariff-dataset-label-2561** (b2: переименование collection только заводской строки).
- Проверить end-to-end: device-board → sample-library → trends-detector → live-analysis на real sample.
- Зубы:
  - UI: free-tier collection name == "Базовый набор" (без "(free-v1)" в новом каталоге).
  - Cabinet: чтение коллекций от media при открытии библиотеки узла (POST /quota, ENSURE_RESERVED).
  - Плагины: детектор + chart-list должны регистрироваться раздельно (изолированный try per block).

**B. Package Studio & Electron app (2–3 дня, параллельно)**
- Вернуть / актуализировать скрипт `yarn studio:dist` (Electron builder, code-sign if needed).
- Убедиться media-library-backend в контейнере слушает на правильном порту, Studio может connect.
- Зубы: E2E тест «Studio подняла media-image, загрузила коллекции, показала sample в библиотеке».

**C. Landing page & distribution channel (2 дня)**
- Заготовить лендинг (Markdown / HTML на `docs/` или отдельный сайт) с ссылками на GitHub Release.
- Скрипт GitHub Actions для создания Release с бинарниками Studio и media-docker-image.

**Зубы на этапе:**
- P1: collection name в device-board (новая позиция free-v1-каталога) совпадает заявленной.
- P2: Studio запускается и может communicate с media-backend.
- P3: GitHub Release содержит binaries и инструкцию.

---

### **Магистраль #2 (параллельно, подготовка к Этапу 2)**

#### **VDR hard-gate: валидация качества детекции на пилотном корпусе**

**Контекст:** Trends FFT достиг 95%/30% на `val` (эпик #84 passed soft-gate), но `stage-gate 1→2` требует **hard-gate 85%/90%** на **независимом пилотном сете** ~30–35 сэмплов с intra-rater ≥95%. (см. WHITE_PAPER §8 + `DETECTOR_BENCHMARK.md`).

**Блоки:**

**A. Prepare pilot dataset (1 день)**
- Выделить 30–35 новых сэмплов из real-world или student-corpus (intra-rater labelling двумя аннотаторами).
- Гайд аннотирования: drone / not-drone по спектральным + временным признакам.
- Datasheet: `docs/datasets/pilot-vdr-hardgate-2026-10.md`.

**B. Run benchmark on pilot (1 день)**
- `yarn benchmark:detectors --dataset pilot-vdr --models trends-drone-tight,yamnet`
- Вывести итоговую таблицу (P / R / F1 / FPR) для trends и yamnet.
- Сравнение с исходной целью 85%/90%.

**C. Decision gate (0.5 дня)**
- Если P≥85% AND R≥90%: hard-gate **PASSED** → Этап 2 разморозить (начать разработку tdoa-service).
- Иначе: hard-gate **FAILED** → R&D-эпик по нейро (CLAP fine-tuning) или fusion-strategy.

**Зубы:**
- P1: пилотный набор создан, аннотирован, размещён в `datasets/`.
- P2: `yarn benchmark:detectors` вывел таблицу результатов.
- P3: Протокол решения записан в `docs/seanses/vdr-hardgate-decision-2026-10-XX.md`.

---

### **Магистраль #3 (параллельно, держатели грейдов)**

#### **Рефакторинг & долг (build, docs, tests)**

**Фокус:** Закрыть технический долг и подготовить кодовую базу к масштабированию (Этап 2).

**Блоки:**

**A. Verify & document detector architecture (1 день)**
- Убедиться, что граф зависимостей `@membrana/detector-base` → `core` + `audio-engine-service` соблюдён всеми детекторами (harmonic, cepstral, spectral-flux, trends, yamnet).
- `scripts/verify-detector-deps.mjs` — новый скрипт в зубную систему (pre-push).
- Обновить `ARCHITECTURE.md` §1e с актуальной диаграммой.

**B. Standardize service templates (1–2 дня)**
- Убедиться новые сервисы (например, будущие `localizer-service`, `tracker-service` для Этапа 2) следуют шаблону из `SERVICES.md`.
- Scaffold-генератор `yarn new:service --name=localizer` (на базе `plop` или ручной checklist).
- Зубы: P1 любой новый service имеет `src/{math/,core/,hooks/,types.ts}` и `src/index.ts`; P2 зависимости соответствуют слоям.

**C. Repair nightly ritual (0.5 дня, follow-up #2585)**
- non-critical-streak логика работает, escalate при threshold-trigger.
- Проверить memory-подсистему в ritual (dynin/vesnin/ozhegov памяти обновляются корректно).

---

## Рекомендуемый день-за-днём (Пн — Пт)

| День | Магистраль | Ролевой фокус | Key deliverable |
|------|-----------|----------------|-----------------|
| **Пн 07.10** | #1 A, #3 A | Структурщик (rodchenko) + Тестировщик | tariff-dataset-label-2561 CLOSURE; detector-deps script draft |
| **Вт 08.10** | #1 B + #2 A | Интегратор (dynin) + Аннотатор (вн. контрактор) | Studio dist build; pilot-vdr datasheet signed |
| **Ср 09.10** | #1 C + #2 B | Marketer / Product (vesnin) + Математик | Landing page draft; benchmark:detectors run |
| **Чт 10.10** | #2 C + #3 B | Teamlead (ratify) | VDR hard-gate decision; service scaffold v0.1 |
| **Пт 11.10** | Синхро + буфер | Все | Weekly digest, plan next week |

---

## Гейты и критерии готовности

### Гейт 1: **FREE-выпуск (магистраль #1)**
- ✅ tariff-dataset-label-2561 CLOSED
- ✅ Studio builds и запускается без ошибок
- ✅ GitHub Release создана с инструкциями
- ✅ Лендинг размещён (docs/ или gh-pages)
- **Условие входа в продакшн:** Teamlead ратификация + 2/2 review (rodchenko + angelina)

### Гейт 2: **VDR hard-gate decision (магистраль #2)**
- ✅ Пилотный набор аннотирован (intra-rater ≥95%)
- ✅ `yarn benchmark:detectors --dataset pilot-vdr` completed
- ✅ Решение записано (pass/fail)
- **Если PASS:** Этап 2 разморозить (нарезка tdoa-service в LOCAL_SPRINT)
- **Если FAIL:** R&D-эпик нейро открыт

### Гейт 3: **Долг закрыт (магистраль #3)**
- ✅ detector-deps verification скрипт в CI
- ✅ service-scaffold checklist актуален
- ✅ ARCHITECTURE.md §1e обновлена

---

## Риски и предупреждения

| Риск | Сценарий | Смягчение |
|------|----------|----------|
| **Пилотный датасет не готов** | Intra-rater fails, нужны новые аннотаторы | Начать подготовку **сегодня**, параллель с #1. |
| **Studio build fails** | Electron/code-sign issues, path problems | Прототипировать на Пн, не откладывать на Ср. |
| **VDR hard-gate FAIL** | trends + yamnet не достигли 85%/90% | Предусмотреть R&D-эпик (2–3 дня на fine-tuning или fusion). |
| **Шаблоны trends не в образе** | Регрессия #2575 не зафиксирована | Verify-скрипт в CI (правило 4 зуба, #2575). |

---

## Предложение к Teamlead

1. **Ратифицировать магистраль** на неделю: **#1 (выпуск) + #2 (VDR hard-gate) параллельно, #3 фон**.
2. **Развилка по VDR результату:** если hard-gate PASS → Этап 2, иначе → R&D-спринт (1 нед.).
3. **Назначить owner'ов** по блокам (см. день-за-днём выше).
4. **Зарезервировать буфер** на непредвиденное: ночной ритуал может требовать срочных фиксов (#2580, #2585-like).

---

## Как валидировать этот план

- **Предусловие:** запустить `yarn plan:day 2026-10-07` в понедельник утром → он должен резонировать с этим документом.
- **Проверка хода:** `docs/LOCAL_SPRINT_ACTIVE.md` должен отражать спринты по магистралям.
- **Завершение:** фото-отчёт в `docs/seanses/weekly-digest-2026-10-11.md` на Пт.

---

**Документ готов к ратификации Teamlead-ом.**  
*Последнее обновление: 2026-10-05 15:22:43 UTC*