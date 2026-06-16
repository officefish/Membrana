# FFT-метрики в Membrana: совокупный потенциал, расчёты и достигнутый предел

> **Технический референс-промпт команды** (Cursor IDE / Claude). Пишется «для себя» по итогам консилиума после эпика [`fft-last-chance-calibration`](./FFT_LAST_CHANCE_CALIBRATION_EPIC_PROMPT.md) (#84).
> Назначение: единая точка правды о том, **что мы умеем считать на базе FFT**, **какие 4 инструмента это используют**, **с какими настройками** и **какой предел качества достигнут на текущем датасете free-v1**.
> Читать перед любой задачей, которая трогает пороговый тест, гармонический/кепстральный/spectral-flux детекторы, trends-fft или live-анализ.
> Связано: [`INTEGRATIONS_STRATEGY.md`](../INTEGRATIONS_STRATEGY.md), [`DETECTOR_BENCHMARK.md`](../DETECTOR_BENCHMARK.md), [`ARCHITECTURE.md`](../ARCHITECTURE.md) §1b/§1e, отчёт [`datasets/week-2026-06-14/fft-last-chance-report.md`](../datasets/week-2026-06-14/fft-last-chance-report.md).

---

## 0. TL;DR консилиума

1. **Сырые покадровые FFT-метрики (centroid / flux / RMS) + «коробочное» голосование — это потолок ~75% recall при 40% FPR** на free-v1. Физически не разделяют высокочастотный фон (ESC-50: насекомые, техника, шум) от гула БПЛА. Пороговый тест как самостоятельный детектор — **no-go**.
2. **Временна́я структура (trends) ломает этот потолок.** Узкий шаблон `DRONE_TIGHT` (перцентильный спектральный бокс + требования стабильности во времени) + системные не-дрон конкуренты дают **recall 95% / FPR 30% / F1 0.844** на held-out `val`. Это единственная FFT-конфигурация, прошедшая планку 80%/40%.
3. **Одиночные DSP-детекторы (harmonic / cepstral / spectral-flux) на free-v1 не проходят даже мягкую планку**: их сильная сторона — recall, слабая — FPR (см. §6). OR-консенсус в live-режиме их FPR только усугубляет.
4. **Вывод:** FFT-направление сохраняется **в форме trends-сопоставления с дисциплиной шаблонов**, всё остальное — диагностика и быстрые индикаторы. Дальнейший рост качества — за пределами эшелона 0 (нейро/zero-shot по `INTEGRATIONS_STRATEGY.md`).

---

## 1. Что мы вообще считаем: первичные FFT-индексы

Вся первичная обработка идёт через `@membrana/audio-engine-service` → `@membrana/fft-analyzer-service`. Ядро (`FftCore`) общее для всех детекторов:

- **Окно Хэмминга**: `w[i] = 0.54 − 0.46·cos(2πi/(N−1))`.
- **БПФ** (Cooley–Tukey, radix-2), `N = fftSize` (обычно 2048).
- **Магнитуды**: `|X[k]| = sqrt(re² + im²) / (N/2)`, бины `k = 0…N/2−1`.
- **Ось частот**: `f_k = (k / (N/2)) · (sampleRate/2)`.
- **Частотная маска**: метрики centroid/flux считаются в полосе **50–15 000 Гц**.

На этой базе считаются три первичных индекса (`fft-analyzer/src/math/metrics.ts`):

### 1.1. Спектральный центроид (Гц) — «центр тяжести» спектра
```
centroid = Σ(f_k · |X[k]|) / Σ|X[k]|
```
Физический смысл: средневзвешенная по энергии частота. Гул БПЛА на free-v1 — узкий высокочастотный (centroid ~3000–4200 Гц, см. §3).

### 1.2. Спектральный поток (flux) — изменчивость спектра во времени
```
flux = sqrt( Σ (255·|X_t[k]| − 255·|X_{t−1}[k]|)² / K ) / 10
```
L2-расстояние между соседними спектрами (байт-шкала, делитель 10). Первый кадр = 0. Высокий flux = быстро меняющийся звук (речь, удары); низкий = стационарный гул.

### 1.3. RMS — громкость во временно́й области
```
rms = sqrt( Σ s_i² / M )
```
Считается по сырым сэмплам окна (не по спектру).

> Эти три числа — фундамент. Centroid говорит «где энергия по частоте», flux — «насколько стабилен звук», RMS — «насколько громко». Всё остальное (гармоники, кепстр, тренды) — производные надстройки.

---

## 2. Четыре инструмента: что под капотом, настройки, предел

### Инструмент 1 — FFT пороговый тест (`fft-threshold-test`)

**Что считает.** Берёт `frameCount` кадров с шагом `intervalMs`, в каждом меряет centroid/flux/rms и проверяет попадание в заданные `ThresholdBounds`. Источник: `fft-analyzer/src/math/threshold-test.ts`.

**Логика вердикта (двухуровневая):**
- *Кадр пройден*, если число метрик в диапазоне `≥` порога строгости:
  `easy → 1 из 3`, `normal → 2 из 3`, `strict → 3 из 3`.
- *Серия = дрон* (`isDetected`), если `passRate = passedFrames / frameCount ≥` порога:
  `easy → 0.3`, `normal → 0.6`, `strict → 0.9`.

**Настройки и дефолты:** `frameCount ∈ {3,5,7,10}` (плагин: 3); `intervalMs` (плагин: 500); `strictness` (по умолч. `normal`); пороги centroid/flux/rms. Демо-дефолты порогов (centroid 500–1250 Гц) к нашему датасету **неприменимы** — дрон тут выше.

**Рекомендуемая настройка для free-v1 (data-driven, эпик #84):**
- `strictness: normal`, `frameCount: 5`, `intervalMs: 500`;
- centroid **2900–4300**, flux **0.03–0.16**, rms **0.07–0.28** (бокс p10–p90 train-дронов).

**Предел на val:** recall 85% при FPR 70% (balanced) **или** recall 75% при FPR 40% (precision). **Цель 80%/40% не достигается** — фронтир не пересекает целевую точку. → no-go как детектор, **go как диагностический/обучающий инструмент** (плагин в библиотеке сэмплов, FL1).

---

### Инструмент 2 — Гармонический детектор БПЛА (`@membrana/harmonic-detector-service`)

**Что считает.** Не HPS. Алгоритм — поиск пиков + оценка «гармонической стопки» (`harmonic/src/math/`):
1. **Кандидаты f₀**: локальные максимумы спектра с `mag ≥ 0.1·globalMax` в полосе **80–250 Гц**.
2. **Оценка стопки** для каждого f₀ (`scoreHarmonicStack`): для гармоник `k·f₀`, `k = 1…8` (до `harmonicMaxHz = 5000`):
   - гармоника подтверждена, если пик в ±2 бина имеет `mag/globalMax ≥ 0.18` и является локальным максимумом;
   - вес гармоники `w_k = 1/(k+1)`;
   - при `≥ 3` гармониках: `score = min(1, Σ(ratio_k·w_k)/Σw_k)`, где `ratio_k = mag/globalMax`.
3. **Вердикт**: `isDrone = score ≥ confidenceThreshold(0.55) И harmonicCount ≥ 3`.

Явного HNR (harmonic-to-noise) нет; прокси — взвешенная сумма нормированных магнитуд гармоник.

**Настройки:** `confidenceThreshold` (0.55), `fundamentalMin/MaxHz` (80/250), `harmonicMaxHz` (5000), `fftSize` (2048).

**Предел (free-v1, полный сет, `benchmark:detectors`):** P 43.6% / **recall 68.3%** / F1 53.2% → FPR ≈ **88%**. Хорош как объяснимый индикатор «есть тональная гармоническая структура в НЧ», но фоновые тональные источники дают много ложных. Самостоятельно планку не берёт.

---

### Инструмент 3 — Анализатор тенденций FFT (`@membrana/trends-detector-service`)

**Что считает.** Работает не на одном кадре, а на **серии** `MetricSample[]` (обычно 10 замеров × 500 мс). Считает временны́е признаки (`temporalFeatures.ts`) и сопоставляет с шаблонами `PatternTemplate`.

**Ключевые временны́е признаки и как они получаются:**
| Признак | Как считается |
|---------|---------------|
| `centroidStd/fluxStd/rmsStd` | СКО соответствующего ряда |
| `activityRatio` | доля замеров с `rms > 0.02` |
| `avgSilence/BurstDuration` | средняя длительность тихих / активных сегментов |
| `volumeTrend/frequencyTrend` | отношение средних 2-й и 1-й половин ряда → increasing/decreasing/oscillating/stable |
| `longTermStability` | `1 − (var(rms)+var(centroid)/1000)/2` → бакеты veryLow…veryHigh |
| `frequencyJumps` | число скачков centroid > 50 Гц (+ плотность/сек) |
| `periodicity` | автокорреляция RMS → регулярность интервалов пиков |
| `envelopeShape` | наклоны атаки/спада вокруг пика RMS → impulsive/sustained/… |
| `peakToAverageRatio` | `max(rms)/mean(rms)` |

**Скоринг шаблона (`scoring.ts`):**
- спектральная часть: `membership` центроида/flux/rms (мягкое затухание вне границ) + `frameHitRatio` (доля кадров, где все 3 метрики одновременно в боксе);
- `score = (spectral·0.3 + temporal·0.7)·100` — **временна́я структура весит 70%**;
- победитель = макс. score; уверенность high/medium/low/veryLow по порогу и отрыву от второго места;
- `isDetected = confidence ≥ minConfidence` (по умолч. **35**);
- `isDrone` только если ключ победителя начинается с `DRONE_`.

**Рекомендуемая настройка — шаблон `DRONE_TIGHT` (победитель эпика):**
```
thresholds: centroid 2900–4300, flux 0.03–0.16, rms 0.07–0.28, frameHitRatio 0.6–1.0
temporal:   activityRatio 0.8–1.0, centroidStd 0–400,
            longTermStability [high, veryHigh], volumeTrend [stable], frequencyTrend [stable]
```
+ системные не-дрон шаблоны как конкуренты, `minConfidence ∈ [35,50]`.

**Предел на val:** **recall 95% / FPR 30% / F1 0.844 — ЦЕЛЬ ДОСТИГНУТА.** Это лучший результат всего FFT-стека. Ключ — узость шаблона: объединённый envelope (`DRONE_CURATED`, min/max по 60 сэмплам) переобучается «во всё подряд» (FPR 80–95%), а tight-бокс + требование стабильности во времени отделяет гул от импульсного/нестабильного фона.

---

### Инструмент 4 — Анализ дрона (live) + краткий отчёт в журнал (3 DSP)

**Что считает.** Плагин `mic-live-drone-analysis` собирает окно потока (**3 c** по умолчанию) и прогоняет **три** DSP-детектора через `@membrana/detector-report`:
1. **harmonic** (см. инструмент 2);
2. **cepstral** (`@membrana/cepstral-detector-service`): действительный кепстр `IFFT(log|X[k]|)`, поиск пика в quefrency-полосе `[sr/250, sr/80]`; `peakRatio = peak/meanInRange`, `confidence = min(1,(peakRatio−1)·0.18)`, `fundamentalHz = sr/peakQ`; `isDrone` при `confidence ≥ 0.2 И peakRatio ≥ 1.6 И prominence ≥ 2.4 И f₀∈[80,250]`;
3. **spectral-flux** (`@membrana/spectral-flux-detector-service`): `stability = max(0, 1−flux/2)`, `lowEnergyPercent` (доля энергии в нижних 10% бинов), `confidence = stability·0.35 + lowScore·0.65`; `isDrone` при `lowEnergyPercent ≥ 35% И confidence ≥ 0.45`.

**Агрегация краткого отчёта.** Без взвешенного фьюжна: `isDetected = ИЛИ` по трём (`some(verdict.isDrone)`). Сэмпл-уровень: confidence = **макс** по кадрам; пресеты агрегации — harmonic/cepstral `any-frame`, spectral-flux `majority`.

**Настройки:** длина окна потока (3 с), пороги каждого детектора (см. выше), режимы (manual/auto/last-track).

**Предел (free-v1, по детекторам):** cepstral R100/FPR100, spectral-flux R87/FPR100, harmonic R68/FPR88. OR-консенсус → высокий recall, но **FPR близок к 100%**. Live-режим хорош как **чувствительный сигнализатор присутствия** (что-то тональное/стационарное есть), но не как селективный детектор дрона. Подробный отчёт (DDR по запросу на сервер) добавляет разбор, но не меняет физического потолка.

---

## 3. Распределения метрик на free-v1 (почему именно такой потолок)

Перцентили train-сета (centroid, Гц / flux / rms):

| Класс | centroid p10–p90 | flux p10–p90 | rms p10–p90 |
|-------|------------------|--------------|-------------|
| drone | 2964 – 4185 | 0.00 – 0.123 | 0.067 – 0.222 |
| not-drone | 0 – 4559 | 0.00 – 0.137 | 0.00 – 0.258 |

**Корень проблемы:** по centroid не-дрон занимает почти весь диапазон и **перекрывает дрон на верхнем конце** (насекомые, высокочастотная техника). Любой «коробочный» детектор, ловящий 80%+ дронов, неизбежно ловит и значительную долю фона → FPR ≥ 40%. Разделяющий сигнал лежит **не в мгновенном спектре, а во времени**: дрон — стабильный продолжительный гул (низкий centroidStd, high stability, stable trends), фон — нет. Поэтому только trends с временны́ми признаками пробивает потолок.

---

## 4. Сводная таблица: предел каждого инструмента (free-v1)

| Инструмент | Сигнал | Рекомендуемые настройки | Recall | FPR | Вердикт |
|------------|--------|--------------------------|--------|-----|---------|
| FFT пороговый тест | centroid/flux/rms бокс | normal, 5×500мс, бокс p10–p90 | 75–85% | 40–70% | no-go (диагностика) |
| Гармонический | гармоническая стопка 80–250 Гц | thr 0.55 | 68% | 88% | вспом. индикатор |
| Cepstral (live) | пик кепстра f₀ | thr 0.2 / peakRatio 1.6 | 100% | 100% | сигнализатор |
| Spectral-flux (live) | стабильность + НЧ-энергия | thr 0.45 / low 35% | 87% | 100% | сигнализатор |
| Live-бриф (OR 3 DSP) | ИЛИ по трём | окно 3 c | ~100% | ~100% | присутствие, не селекция |
| **Trends FFT (DRONE_TIGHT)** | временна́я структура | tight-бокс + stable + конкуренты | **95%** | **30%** | **go ✅** |

> Recall/FPR порогового теста и trends — на held-out `val` (эпик #84). DSP-детекторы — на полном сете 120 (`benchmark:detectors`, 2026-06-15).

---

## 5. Рекомендации по использованию

1. **Хочешь реальную детекцию на free-уровне → только Trends FFT с `DRONE_TIGHT` + конкуренты.** Это продакшн-кандидат (см. follow-up `trends-drone-tight-curated-promotion`).
2. **Пороговый тест** — для ручной диагностики/обучения и быстрой прикидки «похоже ли вообще на дрон по спектру». Настройки из §2.1. Не вешать на него решения.
3. **Гармонический** — когда нужна **объяснимость** («видим гармоники f₀≈X Гц»), как дополнительный признак, не как решающий голос.
4. **Live (3 DSP)** — как **чувствительный сигнализатор присутствия** тонального/стационарного источника в реальном времени; ожидать высокий FPR, не использовать для автономных тревог без подтверждения trends.
5. **Никогда не использовать демо-дефолты порогов** (centroid 200–800 / 500–1250 Гц) на этом датасете — дрон тут высокочастотный.

---

## 6. Достигнутый предел и куда дальше

- **Потолок эшелона 0 (чистый DSP/FFT) на free-v1 зафиксирован:** лучший результат — trends `DRONE_TIGHT` 95%/30%. Это покрывает мягкую цель (80%/40%), но **не** исходный stage-gate SLD (P≥85% / R≥90%, см. `DETECTOR_BENCHMARK.md`): precision trends на val ≈ 0.76.
- **Без новых данных/признаков дальше расти на чистом FFT — упёрлись.** Прирост точности — это либо (а) лучше размеченный/больший корпус (validated labels, VDR-эпик), либо (б) переход к эшелону 2: нейро zero-shot (CLAP/YAMNet) и agentic-разбор по `INTEGRATIONS_STRATEGY.md`.
- **Ближайшие шаги (следующий спринт):**
  1. `trends-drone-tight-curated-promotion` — внедрить `DRONE_TIGHT` в curated-каталог template-match и переснять `benchmark:detectors`.
  2. калибровка trends-fft в библиотеке сэмплов под `DRONE_TIGHT` — дать пользователю ручной прогон экспериментов на текущем датасете.

> **Утренний ритуал:** `yarn plan:day`, `yarn standup`, `yarn main-day-issue` читают этот документ и **не** предлагают «Этап 1.A / unified benchmark harmonic+cepstral+flux» как магистраль дня (см. `scripts/lib/detection-planning-priorities.mjs`, `DEVELOPER_RHYTHM.md`).

---

## 7. Карта файлов (для будущих агентов)

| Тема | Путь |
|------|------|
| Первичные метрики | `packages/services/fft-analyzer/src/math/metrics.ts`, `fft.ts` |
| Пороговый тест | `packages/services/fft-analyzer/src/math/threshold-test.ts`; плагины `apps/client/src/plugins/fft-threshold-test/`, `sample-library-fft-threshold-test/` |
| Гармонический | `packages/services/detectors/harmonic/src/math/{harmonics,peaks,classifier}.ts` |
| Cepstral | `packages/services/detectors/cepstral/src/math/cepstrum.ts` |
| Spectral-flux | `packages/services/detectors/spectral-flux/src/math/classifier.ts` |
| Trends | `packages/services/trends-detector/src/{classifyTrends.ts,math/temporalFeatures.ts,math/scoring.ts}` |
| Template-match / шаблоны | `packages/services/detectors/template-match/src/{collect-metric-samples,build-curated-template,run-template-match-analysis}.ts` |
| Live-бриф | `apps/client/src/plugins/mic-live-drone-analysis/`, `packages/libs/detector-report/src/buildBriefDroneDetectionReport.ts` |
| Калибровочный харнесс | `scripts/benchmark-fft-trends.mjs` (`yarn benchmark:fft-trends`) |
| Отчёт эпика | `docs/datasets/week-2026-06-14/fft-last-chance-report.md` |
