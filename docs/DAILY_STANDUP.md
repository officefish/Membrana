<!-- Сгенерировано: 2026-06-10T04:32:03.440Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (25), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# Ежедневный стендап виртуальной команды — 2026-06-10

## Резюме дня

Переходной день между инфраструктурой (Media Library + MCP) и первыми детекторами. **Главный фокус:** установить контрактный слой для детекторов (`@membrana/detector-base`), заморозить многоузловую функциональность до stage-gate 1→2 и подготовить полную систему для тестирования harmonic-детектора. **Главный риск:** если ограничение Single-Node Detection First не будет явно зафиксировано в `ARCHITECTURE.md` с PR-чек-листом, кто-то начнёт писать TDOA до прохождения gate. **Критерий успеха:** к вечеру имеем `detector-base` + `benchmark.md` + `dataset.md` + каркас `yarn benchmark:detectors` + синтетический датасет, гармоник-детектор проходит свои unit-тесты (≥70%).

---

## Входные артефакты

| Источник | Статус | Что берём |
|----------|--------|-----------|
| **STRATEGIC_PLAN_DAY.md** | 🟢 актуален | 6 задач на день: detector-base, benchmark.md, dataset.md, harmonic-service, ARCHITECTURE §1e, synthetic-dataset |
| **DAILY_CODE_REVIEW.md** | 🟢 вчерашнее | Media Library: архив OK; MCP фаза A archived; риск: нет ADR на MCP rollout, нет явного grace-degradation без ключей Perplexity |
| **GitHub Issues** | 🟡 25 open | Активные: #54 (MCP acceptance), #53 (MCP phase C), #52 (MCP phase B), #49 (Mic UI), #47 (**main-day-issue**: Single-Node gate), #36–#28 (code-review issues); в скоупе дня: #47 (архитектурная граница), #27–#35 (в очереди, не блокируют) |
| **packages/temp** | ⚫ отсутствует | Нет черновиков; не требуется |

---

## Порядок работы

```
Утро:
  Teamlead (Vesnin) → уточнение скоупа, приоритизация
  ↓
  Структурщик (Ozhegov) → scaffold пакетов, контракты
  ↓
  Математик (Dynin) + Музыкант (параллельно)
    → harmonic-detector алгоритм + тесты
    → benchmark-скрипт, dataset-манифест
  ↓
  Структурщик (обвязка, интеграция)
  ↓
  Teamlead → LGTM на контракты, ARCHITECTURE §1e

Вечер:
  Верстальщик (Rodchenko) → опционально (если будет UI для бенчмарка)
  Teamlead → итоговый review, архив
```

---

## [Teamlead]

### Стратегический фокус

**Находимся между Этапом 0 (завершён) и Этапом 1.A (начинаем сегодня).** WHITE_PAPER §8 требует **stage-gate 1→2** перед многоузловой архитектурой (TDOA, localizer, tracker, transport-service). Сегодня закладываем фундамент: контрактный слой, benchmark-инфраструктура, первый детектор (harmonic).

### LGTM-границы на сегодня

- ✅ **Обязательно принимаем:** `@membrana/detector-base` (типы, контракты), `docs/DETECTOR_BENCHMARK.md`, `docs/DATASET.md`, scaffold harmonic-detector, synthetic-датасет.
- ✅ **Жёсткое требование:** обновление `ARCHITECTURE.md` §1e с явным запретом на пакеты `tdoa-service`, `localizer-service`, `tracker-service`, `transport-service` до stage-gate 1→2.
- ❌ **НЕ делаем сегодня:** реализацию spectral-flux/cepstral детекторов (Этап 1.A, но отдельные task-промпты), нейросети (Этап 1.B), многоузловую функциональность, полевую валидацию.

### Приоритизация GitHub Issues

| Issue | Статус | Решение |
|-------|--------|---------|
| **#47** (Single-Node gate) | 🟢 **в скоупе** | Архитектурное решение + консилиум-memo → `docs/seanses/single-node-detection-first-architecture-{DATE}.md` |
| **#54** (MCP acceptance) | 🟡 **вне скоупа** | Фаза B требует Perplexity-ключа; ждём. Phase A archived → запомнить для PR. |
| **#53** (MCP phase C) | 🟡 **вне скоупа** | Параллельна фазе B; отложена. |
| **#52** (MCP phase B) | 🟡 **вне скоупа** | Зависит от ключа; сегодня grace-degradation в Tier 0 достаточно. |
| **#49** (Mic UI) | 🟡 **в беклоге** | После stage-gate 1→2; сегодня только архитектурное одобрение (если обсуждение требуется). |
| **#27–#35** (code-review issues) | 🟡 **в очереди** | Параллельно гармоник-детектору, не блокируют. |

---

## [Структурщик]

### Пакеты и интеграция

**Создавать сегодня:**

1. **`packages/services/detector-base/`** (foundation)
   - Типы: `DroneDetector`, `DetectionResult`, `AudioWindow`, `DetectionMetrics`.
   - Экспорт из `@membrana/core` для удобства.
   - Unit-тесты с mock-реализацией.
   - **Слабая связанность**: detector-base зависит ТОЛЬКО от `@membrana/core` + типы; без web audio, без React.

2. **`packages/services/detectors/harmonic-detector/`** (analyzer)
   - Зависит от: `detector-base`, `audio-engine-service`, `fft-analyzer-service` (через чистые функции).
   - Экспортирует: функцию анализа + хук `useHarmonicDetector` (если требуется UI).
   - **Нарушение слабой связанности = немедленный return с указанием конкретного импорта.**

3. **`scripts/benchmark-detectors.mjs`** (интеграция)
   - Читает датасет из `datasets/`.
   - Перебирает детекторы из реестра.
   - Выдаёт JSON + таблицу в `docs/DETECTOR_BENCHMARK_RESULTS.json`.

### Граф зависимостей (должен быть ациклическим)

```
@membrana/core
    ↑
    ├── detector-base (типы)
    │
    ├── harmonic-detector-service
    │   ├── detector-base (контракт)
    │   ├── fft-analyzer-service (вызов чистых функций)
    │   └── audio-engine-service (сигнал)
    │
    └── benchmark-detectors (скрипт, читает detector-base)
```

### Контроль (grep-проверки)

```bash
# Убедиться, что harmonic-detector не имеет циклических зависимостей
yarn workspace @membrana/harmonic-detector-service test

# Проверить отсутствие Web Audio в detector-base
rg "AudioContext|AudioBuffer|MediaStream" packages/services/detector-base/src/

# Проверить, что benchmark-детекторы регистрируются через единый реестр (не hardcode)
rg "harmonic|spectral|cepstral" scripts/benchmark-detectors.mjs
```

---

## [Математик]

### Чистые функции в harmonic-detector

**Ожидается паттерн:**

```typescript
// packages/services/detectors/harmonic-detector/src/math/harmonic-analysis.ts

export interface HarmonicAnalysisResult {
  fundamentalFreq: number; // Hz
  harmonicStrength: number; // 0–1
  snr: number; // dB
  isDrone: boolean; // confidence > threshold
}

export function analyzeHarmonic(
  spectrum: Float32Array,  // FFT magnitude (from fft-analyzer)
  sampleRate: number,
  minFreq: number = 80,    // дрон 80–250 Hz
  maxFreq: number = 250
): HarmonicAnalysisResult {
  // Поиск пика в диапазоне minFreq–maxFreq
  // Проверка гармоник (2x, 3x, 4x)
  // Расчёт SNR и confidence
  // Без побочных эффектов, без console.log
}
```

### Тесты

- **Edge cases:** пустой спектр → `undefined` или явная ошибка?
- **Синтетические данные:** sine 120 Hz + гармоники + белый шум → confidence > 0.8?
- **Граничные случаи:** фундаментальная частота ровно на краю диапазона (79 Hz, 251 Hz)?
- **Детерминизм:** одинаковые входные данные → одинаковые результаты (без random)?

### Контакт с FFT-analyzer

```typescript
// Ожидается, что harmonic-detector вызывает:
import { computeFFT } from '@membrana/fft-analyzer-service';

const fftResult = computeFFT(audioBuffer, { windowSize: 2048 });
const harmonicResult = analyzeHarmonic(fftResult.magnitude, sampleRate);
```

**НЕ должно быть:**
```typescript
// ❌ Неправильно: вызов конструктора с состоянием
const analyzer = new FFTAnalyzer({ ... });
analyzer.update(buffer);
const spectrum = analyzer.getSpectrum();
```

---

## [Музыкант]

### Поток audio-engine и синтетический датасет

**Требования для harmonic-detector на входе:**

- Sample rate: **48 kHz** (целевой стандарт из DESIGN.md).
- Формат: **Float32Array** (как выдаёт Web Audio).
- Норм: **16-bit PCM → float, -1.0..+1.0** (пик на уровне -3 dB для headroom).
- Отсутствие клиппинга (проверка на этапе загрузки в Media Library).

**Синтетический датасет v0.1 (6 блоков):**

1. **Чистые дроны** (3 сэмпла):
   - DJI Phantom 4: 110 Hz (основная мода винтов) + гармоники.
   - Parrot Bebop: 95 Hz.
   - Собственный синтез: 150 Hz + гармоники до 5 кГц.
   - Каждый: 48 kHz, mono, длина 2–5 сек.

2. **Дроны + фон** (3 сэмпла):
   - Дроны выше + ветер, шум города, птицы.
   - SNR варьируется: 15 dB, 10 dB, 5 dB (трудные случаи).

3. **Фоновые звуки** (3 сэмпла):
   - Только город, природа, молчание — no drones.

4. **Скрипт генерации**:
   ```bash
   node datasets/generate-synthetic.mjs --output datasets/v0.1 --dry-run
   ```

**Качество проверяем:**

```bash
# Убедиться, что wav-файлы имеют правильный sample rate
ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of default=noprint_wrappers=1:nokey=1:noprint_section=0 datasets/v0.1/*.wav

# Проверить отсутствие клиппинга
ffmpeg -i datasets/v0.1/drone-dji.wav -af "volumedetect" -f null - 2>&1 | grep "max_volume"
```

---

## [Верстальщик]

### UI и DESIGN.md

**Сегодня ничего нового в UI:**

- Benchmark-результаты → JSON/markdown, не требуется срочно визуализировать.
- Media Library UI уже интегрирована (вчера), соответствует DESIGN.md.

**Если потребуется UI для бенчмарка (опционально):**

- Таблица с метриками (precision, recall, F1, p95-latency).
- Синяя кнопка "Запустить бенчмарк", зелёный badge "✓ Пройден" при gate успехе.
- ARIA: `role="table"`, `aria-live="polite"` на результатах.

**packages/temp: принцип non-interference**

- Если есть черновики в temp — не трогаем до явного запроса.
- Сегодня packages/temp пусто → не применимо.

---

## План на сегодня

| Блок | Размер | Задача | DoD | GitHub Issues |
|------|--------|--------|-----|---------------|
| **1. Создать @membrana/detector-base** | S | Типы, контракты, mock-тесты | `yarn test` зелёный; типы экспортируются из core | #47 |
| **2. DETECTOR_BENCHMARK.md + yarn benchmark:detectors** | M | Регламент, скрипт, интеграция turbo | Скрипт запускается, выдаёт JSON; описание в README | #47 |
| **3. DATASET.md + синтетический датасет** | M | Манифест, 9 wav-файлов, metadata.json, генератор | 9 сэмплов в datasets/v0.1; metadata для каждого; ffprobe OK | #47 |
| **4. Scaffold @membrana/harmonic-detector-service** | L | Полный сервис (math, core, hooks, тесты) | Unit-тесты ≥70%; TP/FP на synthetic; гармоник-детектор регистрируется в реестре | #47 |
| **5. Обновить ARCHITECTURE.md §1e — Single-Node freeze** | S | Явный запрет на TDOA/localizer/tracker до gate; PR-чек-лист | Раздел обновлён; ссылка на DETECTOR_BENCHMARK.md; консилиум-memo | #47 |
| **6. Консилиум + архив дня** | S | Обсуждение результатов гармоник-детектора, gate-решение (опционально) | Консилиум-отчёт в docs/seanses/; MAIN_DAY_ISSUE переиндексирован | #47 |

---

## Матрица Issues ↔ задачи дня

| Задача дня | GitHub Issues |
|------------|---------------|
| detector-base (1) | #47 (Single-Node gate) |
| benchmark.md + скрипт (2) | #47 |
| dataset.md + synthetic (3) | #47 |
| harmonic-detector (4) | #47; вспомогательно: #10 (unit-тесты чистых функций), #32 (FFT edge cases) |
| ARCHITECTURE §1e (5) | #47; вспомогательно: #36 (code-review accuracy) |

---

## Итоговый артефакт

**Новые/обновлённые файлы:**

```
packages/services/detector-base/
  ├── package.json
  ├── tsconfig.json
  ├── src/
  │   ├── types.ts (DroneDetector, DetectionResult, AudioWindow, DetectionMetrics)
  │   ├── mock-detector.ts (тестовая реализация)
  │   └── index.ts (экспорт)
  └── test/
      └── detector-base.test.ts

packages/services/detectors/harmonic-detector/
  ├── package.json
  ├── tsconfig.json
  ├── src/
  │   ├── math/
  │   │   └── harmonic-analysis.ts
  │   ├── core/
  │   │   └── harmonic-detector.ts
  │   ├── types.ts
  │   ├── hooks/
  │   │   └── use-harmonic-detector.ts (если требуется React)
  │   └── index.ts
  ├── test/
  │   └── harmonic-detector.test.ts
  └── README.md

docs/
  ├── DETECTOR_BENCHMARK.md (регламент, примеры)
  ├── DATASET.md (схема, требования, источники)
  ├── ARCHITECTURE.md (обновлено §1e: Single-Node freeze)
  └── seanses/
      └── single-node-detection-first-architecture-2026-06-10.md

datasets/
  ├── v0.1/
  │   ├── drone-dji-110hz.wav
  │   ├── drone-parrot-95hz.wav
  │   ├── drone-synthetic-150hz.wav
  │   ├── drone+wind-snr15db.wav
  │   ├── drone+city-snr10db.wav
  │   ├── drone+bird-snr5db.wav
  │   ├── background-wind.wav
  │   ├── background-city.wav
  │   ├── background-silence.wav
  │   └── metadata.json
  └── generate-synthetic.mjs

scripts/
  └── benchmark-detectors.mjs (интеграция с turbo)

packages/core/
  └── src/types.ts (переэкспорт из detector-base)
```

---

## Definition of Done (день)

- [ ] `@membrana/detector-base` создан, типы экспортируются, unit-тесты ≥50% покрытия, `yarn test` зелёный.
- [ ] `docs/DETECTOR_BENCHMARK.md` написана (регламент, примеры, как добавить детектор).
- [ ] `docs/DATASET.md` написана (требования, схема папок, источники, минимальная квота).
- [ ] `yarn benchmark:detectors` запускается без ошибок на дефолтном датасете, выдаёт JSON + markdown-таблицу.
- [ ] Синтетический датасет v0.1 собран (≥9 wav-файлов + metadata.json), `ffprobe` подтверждает 48 kHz.
- [ ] `@membrana/harmonic-detector-service` полностью реализован (math + core + тесты ≥70%), регистрируется в benchmark-реестре.
- [ ] `ARCHITECTURE.md` §1e обновлена: явный запрет на TDOA/localizer/tracker до stage-gate; ссылка на DETECTOR_BENCHMARK.md; PR-чек-лист (if applicable).
- [ ] `yarn lint` и `yarn type-check` проходят без ошибок во всех затронутых пакетах; нет циклических зависимостей.

---

## Риски

1. **⚠️ Harmonic-детектор может показать низкие метрики на synthetic-датасете**  
   *Действие:* если precision < 85% или recall < 90%, 1-часовая дельта на отладку алгоритма (пороги, оконная функция FFT, диапазоны частот); если не помогает → консилиум-решение (может быть, датасет нужно уточнить или детектор нужен другой порядок). Не затягивать > 2 часов, gate может быть отложен.

2. **⚠️ Синтез синтетического датасета может быть сложнее, чем ожидается**  
   *Действие:* если генератор берёт слишком много времени, использовать готовые сэмплы (скачать 3–5 реальных дронов с публичных источников) + добавить синтез позже. Минимум: 9 файлов разных классов к концу дня.

3. **⚠️ Структурщик и Математик могут конфликтовать на граница между чистой функцией и контрактом**  
   *Действие:* явно обсудить (5 мин) до начала реализации: что передаётся в `analyzeHarmonic()` и что возвращается. Контракт фиксируется в типах `detector-base`.

4. **⚠️ ARCHITECTURE.md §1e требует явного консилиума на гаранты Single-Node freeze**  
   *Действие:* если есть разногласия по формулировке запрета на TDOA, вызвать мини-консилиум (15 мин, все роли), заключение в мемо. Не перфекционист — главное, чтобы граница была понятна и соблюдалась в PR.

---

## Примечания

### О коммитах сегодня

Рабочая ветка: **techies68** (по TASKS_MANAGEMENT.md). Все коммиты идут в этой ветке; PR в `main` — в конце дня перед `yarn archive:daily-day`.

### О вечерних ритуалах

```bash
yarn archive:daily-day      # Снимок STRATEGIC_PLAN_DAY, DAILY_STANDUP, MAIN_DAY_ISSUE
yarn code-review            # Ревью текущих коммитов
yarn save-code-review       # Сохранение в git
```

### О периодичности

Это DAILY_STANDUP. Полный **недельный план** — в `STRATEGIC_PLAN_WEEK.md` (обновляется в пятницу после `yarn plan:week`).

---

**Хранитель дня:** Teamlead (Vesnin).  
**Консилиум:** по необходимости → [`docs/seanses/single-node-detection-first-*.md`](docs/seanses/).  
**Архив:** [`docs/archive/daily-day/{DATE}/`](docs/archive/daily-day/).