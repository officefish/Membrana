<!--
  archive-role: archive-snapshot
  archive-day: 2026-06-09
  archived-at: 2026-06-09T18:40:43.260Z
  source: docs/STRATEGIC_PLAN_DAY.md
  canonical: docs/STRATEGIC_PLAN_DAY.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-06-09T16:52:09.675Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день — Membrana

> Версия v0.1 | Дата планирования: 2026-06-09 | Горизонт: 24–48 часов

---

## 1. Что сделано за период (последние сутки)

За последние 24 часа выполнена **одна коммитна точка**:

### Корневая инфраструктура (конфигурация окружения)
- **a1b74e3** (druid + Cursor, 29 минут назад) — `fix(anthropic): allow ANTHROPIC_NO_PROXY for large ritual API calls`
  - Добавлена поддержка переменной окружения `ANTHROPIC_NO_PROXY` в конфигурацию для крупных запросов к API Anthropic.
  - Изменены: `.env.example`, `scripts/_anthropic-env.mjs`.
  - **Оценка**: техническое, инфраструктурное, не влияет на стратегическую цель напрямую.

**Итог**: иных коммитов, связанных с функциональностью Membrana (сервисы, аналайзеры, архитектура), за последние сутки нет. Рабочее дерево чистое.

---

## 2. Привязка к стратегической цели

### Текущее положение на дорожной карте

По дорожной карте из `WHITE_PAPER.md` § 8 мы находимся на **Этапе 0–1.A**:

- **Этап 0 (фундамент)** — ЗАВЕРШЁН: `audio-engine-service` поставляет кадры, `fft-analyzer-service` даёт спектр, клиент умеет его показывать.
- **Этап 1.A (DSP-эшелон)** — В РАЗРАБОТКЕ: необходимо реализовать три независимых DSP-детектора дрона:
  - `@membrana/harmonic-detector-service` (обнаружение гармонических признаков)
  - `@membrana/cepstral-detector-service` (кепстральный анализ)
  - `@membrana/spectral-flux-detector-service` (динамика спектра)

### Что из сделанного на стратегию

Последний коммит (fix окружения) — **нейтрален** к функциональности. Это техническое улучшение для запуска экспериментов и локального обслуживания, но не продвигает реализацию детекторов и не открывает путь к stage-gate 1→2.

### Критический путь

Из раздела `WHITE_PAPER.md` § 8 **Stage-gate 1→2** — обязательный шлюз перед переходом к сетевым технологиям (TDOA, мультилатерация, трекинг):

> **Пока шлюз не пройден: TDOA, мультиузловая синхронизация, локализация — заморожены.**

Это значит:

- ❌ Не начинать `tdoa-service`, `localizer-service`, `tracker-service` без достижения precision ≥ 85%, recall ≥ 90% на одном узле.
- ✅ Все текущие усилия должны быть направлены на реализацию и бенчмарк трёх DSP-детекторов (1.A) и подготовку к нейросетевой части (1.B).

### Недостающие сервисы для этапа 1.A

Нужно создать (scaffold) три пакета в `packages/services/detectors/`:

| Сервис | Статус | Блокирует |
|--------|--------|----------|
| `@membrana/detector-base` | scaffold (контракты) | все детекторы |
| `@membrana/harmonic-detector-service` | scaffold | stage-gate 1→2 |
| `@membrana/cepstral-detector-service` | scaffold | stage-gate 1→2 |
| `@membrana/spectral-flux-detector-service` | scaffold | stage-gate 1→2 |
| `@membrana/detection-ensemble-service` | заморожен | stage-gate 1→2 |
| `docs/DETECTOR_BENCHMARK.md` | scaffold | Все детекторы (измерение метрик) |
| `docs/DATASET.md` | scaffold | Все детекторы (стандартизация тестовых данных) |

---

## 3. Риски и долг

### Технические риски

| Риск | Описание | Связь с WHITE_PAPER |
|------|---------|---------------------|
| **Отсутствие контракта детектора** | Нет `DroneDetector` interface и `DetectionResult` — разработчики детекторов будут импровизировать. | § 8, 1.A: ARCHITECTURE.md § 1e требует единого контракта. |
| **Нет тестового датасета** | Без стандартизированного `DATASET.md` (классы: мульти-ротор, крыло, шум, город, ветер) невозможно сравнить качество детекторов. | § 8, stage-gate 1→2: требует precision/recall на едином наборе. |
| **Нет бенчмарка метрик** | ARCHITECTURE.md § 1e ссылается на `docs/DETECTOR_BENCHMARK.md` и автоматизацию `yarn benchmark:detectors`, но документ не создан. | § 8, stage-gate: метрики — точка входа для PR-ревью. |
| **Накопленный долг: Web Audio синхронизация на узле** | `audio-engine-service` захватывает звук, но нет гарантии привязки `capturedAt` к глобальной шкале времени. На этапе 1.A некритично, но разложит мину на stage-gate 1→2 (TDOA требует микросекундной точности). | § 5.2, § 4.3: синхронизация времени — основа TDOA. |
| **Граничные случаи тишины дрона** | `WHITE_PAPER.md` § 9 откровенно говорит: электрические БПЛА на низких оборотах могут быть тихими. DSP-детекторы без нейросетей на этот случай не рассчитаны. | § 1.A должен быть preparation к нейросетевой части (1.B), а не финалом. |

### Долг, связанный с архитектурой

- Пока `detector-base` не создан, есть риск, что каждый детектор напишет свой `interface DetectionResult` — нарушение единого контракта.
- `SERVICES.md` § "Подкаталог `packages/services/detectors/*`" требует, чтобы детекторы **НЕ импортировались друг в друга**, но сейчас нечего импортировать → нужна явная регуляция.

### Ограничения из WHITE_PAPER, актуальные сейчас

| Ограничение | Статус | Действие |
|-------------|--------|---------|
| Тишина дрона (§ 9) | Риск | Добавить в DATASET.md примеры тихих режимов; на 1.A принять как Known Issue. |
| Шум среды (§ 9) | Высокий приоритет | Городской фон, ветер должны быть в тестовом наборе для валидации precision. |
| Скорость звука (§ 5.3) | Отложено на этап 2 | На 1.A не учитываем, но задокументировать. |

---

## 4. План на следующий день

### Задача 1: Создать контрактный пакет `@membrana/detector-base`

**Цель**  
Определить единый интерфейс `DroneDetector`, `DetectionResult`, `AudioWindow` и ошибки, которыми будут руководствоваться все реализации детекторов.

**Пакет / слой**  
`packages/services/detectors/@membrana/detector-base` — **foundation** (по аналогии с `audio-engine`).

**Связь с WHITE_PAPER**  
§ 8, Этап 1.A. ARCHITECTURE.md § 1e требует контракта перед любой реализацией.

**Definition of Done**
1. Файл `packages/services/detectors/detector-base/src/index.ts` экспортирует:
   - `DroneDetector` interface с методом `detect(window: AudioWindow): Promise<DetectionResult>`.
   - `AudioWindow` type: `{ samples: Float32Array; sampleRate: number; capturedAt: number }`.
   - `DetectionResult` type: `{ detected: boolean; confidence: number; features?: Record<string, number>; timestamp: number }`.
   - `DetectorError` и `DetectorConfig`.
2. Типы согласованы с `AcousticObservation` из `@membrana/core` (WHITE_PAPER § 7).
3. Написан `README.md` с примерами реализации.
4. `tsconfig.json` и `vite.config.ts` созданы по эталону `audio-engine-service`.
5. Zero runtime-зависимостей, кроме `@membrana/core`.

**Роль**  
**Структурщик** — ответственен за границы интерфейса и соответствие ARCHITECTURE.md / SERVICES.md.

**Размер**  
**S** (контракты + документация, no code).

---

### Задача 2: Создать документ `docs/DATASET.md`

**Цель**  
Стандартизировать тестовый датасет для бенчмарка детекторов: определить классы (мульти-ротор, крыло, шум, город, ветер), источники записей, разметку.

**Пакет / слой**  
Документация в корне `docs/DATASET.md` — инфраструктура.

**Связь с WHITE_PAPER**  
§ 8, stage-gate 1→2 требует единого датасета и протокола `DETECTOR_BENCHMARK.md`.

**Definition of Done**
1. Документ включает:
   - Перечень классов: ✓ мульти-ротор, ✓ крыло (самолётного типа), ✓ крупный БПЛА, ✓ птица, ✓ шум (не дрон).
   - Для каждого класса: 20–50 примеров аудиозаписей, источник (ваш датасет / Zenodo / синтез).
   - Метаданные: дата записи, оборудование (микрофон), условия (город/поле, день/ночь, ветер).
   - Формат файлов и структура на диске: `datasets/raw/<class>/<uuid>.wav`.
   - Лицензирование и атрибуция.
2. Минимум 5–10 записей каждого класса загружены в `datasets/raw/` (или подготовлены ссылки на облако).

**Роль**  
**Музыкант** (по акустическим характеристикам) + **Структурщик** (по организации).

**Размер**  
**M** (сбор записей + документирование, может быть частично автоматизировано).

---

### Задача 3: Создать документ `docs/DETECTOR_BENCHMARK.md`

**Цель**  
Протокол бенчмарка: как запускать тесты, какие метрики (precision, recall, latency p95), как генерировать отчёт.

**Пакет / слой**  
Документация в корне `docs/DETECTOR_BENCHMARK.md` — инфраструктура + скрипты.

**Связь с WHITE_PAPER**  
§ 8, stage-gate 1→2: «На тестовом наборе лучший одиночный детектор **или** согласованный ensemble: **precision ≥ 85%**, **recall ≥ 90%**. Протокол и таблица метрик: `docs/DETECTOR_BENCHMARK.md` (автогенерация `yarn benchmark:detectors`)».

**Definition of Done**
1. Документ описывает:
   - Структуру теста: для каждого класса из DATASET.md запускаем `detector.detect()` и собираем confusion matrix.
   - Метрики: precision, recall, F1, latency p50/p95 на типовом ноутбуке.
   - Формат вывода: таблица markdown с сравнением детекторов.
2. Скрипт `scripts/benchmark-detectors.ts` (или `yarn benchmark:detectors`) реализован и проходит на одном DSP-детекторе (stub).
3. GitHub Actions workflow `.github/workflows/benchmark-detectors.yml` добавлен (опционально на 1.A, но scaffold).

**Роль**  
**Математик** (формулы метрик) + **Верстальщик** (вывод таблиц).

**Размер**  
**M** (протокол + stub-скрипт).

---

### Задача 4: Scaffold `@membrana/harmonic-detector-service` (чистая структура)

**Цель**  
Создать skeleton пакета с правильной структурой (`src/math/`, `src/core/`, `src/hooks/`, `index.ts`), всеми конфигами, и placeholder-реализацией `detectHarmonics()` — но без логики обработки.

**Пакет / слой**  
`packages/services/detectors/harmonic-detector/` — **analyzer** (зависит от `detector-base` + `audio-engine-service`).

**Связь с WHITE_PAPER**  
§ 8, Этап 1.A, § 5.1: гармонические признаки винтов дрона (80–250 Гц + кратные).

**Definition of Done**
1. Структура каталога по SERVICES.md эталону:
   ```
   packages/services/detectors/harmonic-detector/
   ├── src/math/harmonics.ts    (пусто: export async function detectHarmonics(...)
   ├── src/core/engine.ts       (пусто: export class HarmonicEngine ...)
   ├── src/hooks/use-harmonic-detector.ts
   ├── src/types.ts
   ├── src/index.ts
   └── package.json (@membrana/harmonic-detector-service)
   ```
2. `package.json` имеет зависимости: `@membrana/core`, `@membrana/detector-base`, `@membrana/audio-engine-service`.
3. `tsconfig.json` с `composite: true`, `vite.config.ts` с library mode.
4. `README.md` с описанием и примером use-case.
5. Компилируется без ошибок, экспортирует `HarmonicDetectorService` class (пустой).

**Роль**  
**Структурщик** — создание файловой структуры и конфигов по pattern.

**Размер**  
**S** (scaffold, no logic).

---

### Задача 5: Scaffold `@membrana/cepstral-detector-service` (чистая структура)

**Цель**  
Аналогично задаче 4, но для кепстрального анализа.

**Пакет / слой**  
`packages/services/detectors/cepstral-detector/` — **analyzer**.

**Связь с WHITE_PAPER**  
§ 8, Этап 1.A, § 5.1: кепстральный анализ для выделения базовых частот винтов.

**Definition of Done**
1. Идентична задаче 4: структура, конфиги, пусто внутри.
2. `src/math/cepstral.ts` с placeholder `computeCepstrum(spectrum: Float32Array): Float32Array`.
3. Компилируется, экспортирует `CepstralDetectorService`.

**Роль**  
**Структурщик**.

**Размер**  
**S**.

---

### Задача 6: Scaffold `@membrana/spectral-flux-detector-service` (чистая структура)

**Цель**  
Аналогично задачам 4–5, но для анализа динамики спектра.

**Пакет / слой**  
`packages/services/detectors/spectral-flux-detector/` — **analyzer**.

**Связь с WHITE_PAPER**  
§ 8, Этап 1.A: изменение спектра во времени как признак дрона (ротор создаёт ритмичные импульсы).

**Definition of Done**
1. Структура как в задачах 4–5.
2. `src/math/spectral-flux.ts` с placeholder `computeSpectralFlux(spectrumPrev, spectrumCurr): number`.
3. Компилируется и экспортирует `SpectralFluxDetectorService`.

**Роль**  
**Структурщик**.

**Размер**  
**S**.

---

### Задача 7: Подготовить `docs/seanses/single-node-detection-first-consensus.md`

**Цель**  
Записать консилиум / техническую встречу про stage-gate 1→2: что означает `precision ≥ 85%, recall ≥ 90%`, как интерпретировать результаты, что делать если один детектор слабый.

**Пакет / слой**  
Документация — инфраструктура (опирается на наработки WHITE_PAPER § 8, ARCHITECTURE.md § 1e).

**Связь с WHITE_PAPER**  
§ 8, stage-gate 1→2: «Консилиум и task-промпт: `docs/prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md`, протокол `docs/seanses/single-node-detection-first-2026-05-16.md`».

**Definition of Done**
1. Документ содержит:
   - Согласованное определение precision / recall в контексте детекции дронов.
   - Примеры confusion matrix и интерпретация (false positives из ветра, false negatives из тихих режимов).
   - Если один из трёх детекторов слаб → что делать (улучшить, добавить ensemble, отложить).
   - Кто принимает решение (Teamlead).
2. Подписи участников или ссылка на meeting-ноты.

**Роль**  
**Teamlead** + **Математик** (метрики).

**Размер**  
**M** (обсуждение + документирование).

---

## 5. Что НЕ делаем на этом горизонте

1. **TDOA-сервис и синхронизация узлов** — заморозили на stage-gate 1→2. `WHITE_PAPER.md` § 8: «Пока шлюз не пройден, TDOA, мультиузловая синхронизация, локализация — заморожены». Начнём только после того, как на одном узле достигнем precision ≥ 85%, recall ≥ 90%.

2. **Нейросетевые детекторы (YAMNet, CLAP, Agentic)** — Этап 1.B, начнётся после завершения и бенчмарка 1.A. На горизонте 24–48 часов мы закладываем фундамент для них, но не реализуем.

3. **Трекинг целей и мультилатерация** — Этапы 3–4, требуют stage-gate 1→2. Не трогаем.

4. **UI-карта квадрата и ситуационный слой для многоузловой сети** — Этап 4, после трекинга. Сейчас `apps/client` показывает спектры на одном узле, этого достаточно.

5. **RF-приёмник, видео-верификация, ADS-B интеграция** — Этап 6, расширение модальностей. Акустика — приоритет.

---

## 6. Проверки в конце периода

По завершении плана на следующий день (24–48 часов) мы сможем подтвердить успех следующими артефактами и проверками:

### Проверка 1: Все 6 scaffold-пакетов компилируются

```bash
cd packages/services/detectors/detector-base && npm run build
cd packages/services/detectors/harmonic-detector && npm run build
cd packages/services/detectors/cepstral-detector && npm run build
cd packages/services/detectors/spectral-flux-detector && npm run build
```

**Критерий**: нет ошибок типов, экспорты в `index.ts` доступны.

### Проверка 2: `DATASET.md` содержит минимум 5 записей на класс

```bash
ls -1 datasets/raw/multirotor/ | wc -l  # ≥ 5
ls -1 datasets/raw/wing-type/ | wc -l    # ≥ 5
ls -1 datasets/raw/noise/ | wc -l        # ≥ 5
```

**Критерий**: файлы `.wav` с метаданными в DATASET.md.

### Проверка 3: `DETECTOR_BENCHMARK.md` и скрипт готовы к запуску

```bash
yarn benchmark:detectors --detector harmonic  # Stub: всегда выводит таблицу
```

**Критерий**: скрипт не падает, markdown-таблица с пустыми метриками появляется.

### Проверка 4: Контракт `DroneDetector` используется в 1+ детекторе

Хотя бы `harmonic-detector` инстанцирует `HarmonicDetectorService implements DroneDetector` и метод `detect()` имеет правильную сигнатуру.

**Критерий**: TypeScript не ругается на реализацию интерфейса.

### Проверка 5: Документирование ясно

- `docs/DATASET.md` объясняет, где взять датасет и как его использовать.
- `docs/DETECTOR_BENCHMARK.md` объясняет, как запустить бенчмарк.
- `docs/seanses/single-node-detection-first-consensus.md` объясняет, что считается успехом stage-gate 1→2.

**Критерий**: новый разработчик может прочитать и понять, что делать дальше.

### Проверка 6: Граф зависимостей соответствует SERVICES.md

```bash
# Проверяем, что ни один детектор не импортирует другого детектора:
grep -r "import.*detector" packages/services/detectors/harmonic-detector/src
# Вывод: пусто или только detector-base, audio-engine-service, @membrana/core
```

**Критерий**: нет горизонтальных зависимостей между детекторами.

---

## Резюме

На горизонте **24–48 часов** мы создаём **инфраструктуру и контракты** для Этапа 1.A (DSP-детекторы), не реализуя саму логику обработки. Три scaffold-сервиса + три документа (DATASET, BENCHMARK, consensu) позволят:

- ✅ Структурщику и Математику независимо разрабатывать каждый детектор.
- ✅ Музыканту собирать и аннотировать тестовый датасет.
- ✅ Teamlead-у и командe честно оценить, когда пройден stage-gate 1→2.
- ✅ Избежать циклических зависимостей и архитектурных нарушений.

**Стратегическая ценность**: заложены основы «Single-Node Detection First» — ключевого принципа WHITE_PAPER § 8, без которого многоузловая сеть (TDOA, трекинг) не имеет смысла.