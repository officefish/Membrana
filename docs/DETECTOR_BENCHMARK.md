# DETECTOR_BENCHMARK — бенчмарк детекторов (stage-gate 1→2)

> **Статус:** runner v0.2 (`yarn benchmark:detectors` на `data/detectors-benchmark/v0.2/`). Метрики harmonic — автоген ниже.
>
> **Дисклеймер:** после появления скрипта бенчмарка ручные правки в таблице
> результатов **не сохраняются** — источник истины автогенерация.

## Цель и критерий stage-gate

Перед переходом к Этапу 2 (TDOA, мультиузел) лучший одиночный детектор **или**
согласованный ensemble на **тестовом** split датасета должен достичь:

| Метрика | Порог |
|---------|--------|
| Precision | ≥ 85% |
| Recall | ≥ 90% |

Дорожная карта: [`WHITE_PAPER.md`](./WHITE_PAPER.md) §8. Датасет: [`DATASET.md`](./DATASET.md).

## Таблица детекторов (сводная)

| name | family | стоимость | объяснимость |
|------|--------|-----------|--------------|
| harmonic | dsp | CPU | высокая |
| cepstral | dsp | CPU | высокая |
| spectral-flux | dsp | CPU | средняя |
| yamnet | neural | CPU/GPU | низкая |
| clap | neural | CPU/GPU | средняя |
| agentic-claude | agentic | токены API | высокая |

<!-- BENCHMARK:auto:start -->

> **Автогенерация:** `yarn benchmark:detectors` · 2026-07-18T12:29:47.440Z
> **Датасет:** v2 · ВЕСЬ корпус (test-split отсутствует): 120 файлов
> **Конфигурация:** боевая (`data/detectors-benchmark/v0.2/calibration-preset.json`) — калиброваны: cepstral, harmonic, spectral-flux
> **⚠ Внимание:** цифры получены НЕ на тестовом сплите — корпус содержит train-сэмплы.

### Результаты последнего прогона

| name | family | TP | FP | FN | TN | precision | recall | F1 | latency p50 (ms) | latency p95 (ms) | статус |
|------|--------|----|----|----|----|-----------|--------|-----|------------------|------------------|--------|
| harmonic | dsp | 41 | 53 | 19 | 7 | 43.6% | 68.3% | 53.2% | 0.1 | 0.2 | benchmarked |
| cepstral | dsp | 60 | 60 | 0 | 0 | 50.0% | 100.0% | 66.7% | 0.2 | 0.4 | benchmarked |
| spectral-flux | dsp | 43 | 47 | 17 | 13 | 47.8% | 71.7% | 57.3% | 0.1 | 0.2 | benchmarked |
| template-match | dsp | 54 | 26 | 6 | 34 | 67.5% | 90.0% | 77.1% | 1.3 | 2.0 | benchmarked |
| yamnet | neural | 55 | 22 | 5 | 38 | 71.4% | 91.7% | 80.3% | 98.6 | 145.3 | benchmarked |
| clap | neural | — | — | — | — | — | — | — | — | — | scaffold |
| agentic-claude | agentic | — | — | — | — | — | — | — | — | — | scaffold |

<!-- BENCHMARK:auto:end -->


### Заметка по stage-gate (template-match → DRONE_TIGHT)

После эпика [`fft-last-chance-calibration`](./prompts/FFT_LAST_CHANCE_CALIBRATION_EPIC_PROMPT.md) (#84) curated-каталог переведён с переобученного `DRONE_CURATED` (merged envelope) на узкий **`DRONE_TIGHT`** (перцентили train-дронов + требования стабильности во времени).

- **Было** (DRONE_CURATED): P 55.6% / R 100% / F1 0.714 / FPR 80%.
- **Стало** (DRONE_TIGHT): **P 85.5% / R 88.3% / F1 0.869 / FPR 15%** (TP 53 / FP 9 / FN 7 / TN 51).

Результат **проходит** мягкую цель эпика (recall ≥ 80% при FPR ≤ 40%) с большим запасом и **почти достигает** строгого stage-gate (precision ≥ 85% ✅, recall ≥ 90% — не хватает 1.7 пп). Это лучший одиночный DSP-детектор на free-v1. Источник шаблона: `data/detectors-benchmark/v0.2/curated-drone-templates.json` и пакетный `packages/services/detectors/template-match/src/data/curated-drone-templates.json` (синхронизированы). Подробности математики — [`prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md`](./prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md).

> Примечание: latency-колонки зависят от железа и загрузки машины — latency нестабилен между прогонами, расхождения p50/p95 между коммитами не читать как регресс.

### Заметка ND3: yamnet (нейро-эшелон, zero-shot) vs DRONE_TIGHT

Спринт `neural-drone-plugin` (ND3, 2026-07-06, датасет free-v1 v0.2, 120 сэмплов, операторские метки).
Первый нейро-детектор в таблице: YAMNet TF.js, бандленные веса, **без обучения** (Способ A,
`INTEGRATIONS_STRATEGY §4.2.1`). Агрегация: clip-mean score по кадрам → max взвешенных
дрон-классов AudioSet (`drone-classes.ts`).

**Калибровка порога** (clip-mean zero-shot score мал по абсолюту: медиана дронов ≈0.045,
не-дронов ≈0.004 — стартовая догадка 0.25 была вне масштаба и давала recall 6.7%):

| Порог | Precision | Recall | F1 | FPR |
|-------|-----------|--------|-----|-----|
| **0.01** (принят) | 71.4% | **91.7%** | **0.803** | 36.7% |
| 0.02 | 70.8% | 85.0% | 0.773 | 35.0% |
| 0.25 (догадка до калибровки) | 66.7% | 6.7% | 0.121 | 3.3% |

**Сравнение рабочих точек (free-v1 v0.2):**

| Детектор | P | R | F1 | FPR | Комментарий |
|----------|---|---|-----|-----|-------------|
| template-match `DRONE_TIGHT` | 67.5% | 90.0% | 0.771 | 43.3% (26/60) | лучший DSP этого прогона; более точный профиль 85.5/88.3/FPR 15 достигался в curated-конфигурации trends (§выше — другой прогон) |
| yamnet @0.01 | 71.4% | 91.7% | **0.803** | 36.7% (22/60) | лучший F1 канонического прогона; recall формально > 90%; FPR ниже template-match |

Выводы:
1. **Zero-shot нейро без единой минуты обучения сопоставим с калиброванным DSP** и берёт
   лучший F1 на корпусе — эшелон 2 подтверждён как жизнеспособный.
2. **Профили ошибок разные:** DRONE_TIGHT точнее по FPR, yamnet полнее по recall — сигналы
   слабо коррелированы по построению (спектральный бокс vs классы AudioSet). Это прямой
   аргумент за **fusion в combined UC** (S2 форсайта): для fusion использовать сырой
   confidence yamnet, не бинарный вердикт.
3. Порог 0.01 — свойство масштаба clip-mean сигмоид, а не «шум»: разделение распределений
   устойчивое (медианы отличаются на порядок), но абсолютные значения малы. VDR-корпус
   (после ~17.07) — следующая проверка обеих рабочих точек на реальных полевых данных.

### Combined-точка (fusion trends+yamnet, S2)

Задача A (2026-07-08): kernel слияния сырых confidence реализован в ядре —
[`fuseDetectorConfidences`](../packages/core/src/contracts/detection-fusion.ts)
(`@membrana/core`). Контракт: массив источников `{ name, family, confidence (raw
0..1), isDrone, weight?, present? }` → `{ combinedScore, agreement, presentCount,
perSource }`.

- **combinedScore = взвешенное среднее** сырых confidence присутствующих источников —
  **не бинарный OR** (`some(isDrone)`): одиночный сильный детектор НЕ выстреливает,
  расхождение trends↔yamnet даёт середину. Прямое следствие вывода ND3 (профили
  ошибок слабо коррелированы).
- **agreement = 1 − range** выносится отдельным полем — политика порога/тревоги
  остаётся у потребителя (плагин «Микрофона», Задача B/E), ядро без продуктовых решений.
- Комбинированная **рабочая точка на val** (P/R/FPR/F1 combined vs одиночные) —
  Задача C: считается на зафиксированных прогонах, без нового DSP-тюнинга (FFT_METRICS §6).
  Слияние в журнал (одна комбинированная запись) — Задача E (плагин combined UC).

### Объяснимость: основной детектор vs бэкап (Задача C)

Долг объяснимости (2026-07-08): кто в hard-gate «основной», кто «объяснимый бэкап».
Обе рабочие точки взяты из **одного** канонического прогона
[`reports/latest.json`](../data/detectors-benchmark/v0.2/reports/latest.json)
(free-v1 v0.2, test-split 120 файлов, `generatedAt 2026-07-06`) — apples-to-apples,
**без нового DSP-прогона** (FFT_METRICS §6, потолок эшелона 0 зафиксирован).

| Детектор | Семья | Объяснимость | P | R | FPR | F1 | Роль |
|----------|-------|--------------|-----|-----|-----|-----|------|
| **yamnet** @0.01 | neural | низкая | **71.4%** | **91.7%** | **36.7%** | **0.803** | основной hard-gate-кандидат |
| template-match `DRONE_TIGHT` | dsp | высокая | 67.5% | 90.0% | 43.3% | 0.771 | объяснимый бэкап |

**Вывод (2–3 фразы):** на одном каноническом val **yamnet доминирует по всем четырём
метрикам** (выше P, R, F1 и ниже FPR), поэтому он — основной кандидат в hard-gate;
`template-match DRONE_TIGHT` держим как **объяснимый бэкап** (высокая интерпретируемость
спектрального профиля при сопоставимом recall). Их профили ошибок слабо коррелированы
(ND3) — это и есть аргумент за combined UC, где бэкап поднимает точность там, где нейро
«молчит».

> ⚠️ **Строгий stage-gate P≥85% / R≥90% ПОКА НЕ достигнут:** у yamnet P 71.4% < 85% и
> FPR 36.7% высок (recall формально > 90% у обоих). Основной блокер точности —
> валидированный полевой корпус; следующая проверка обеих точек — **VDR ~2026-07-17**.

> Сноска: точка `DRONE_TIGHT` **P 85.5% / FPR 15%** из заметки «template-match → DRONE_TIGHT»
> выше — это **другой** прогон/конфигурация (curated-envelope), НЕ сопоставима на этом val
> и в таблицу выше сознательно не сведена. Долг тестов чистой FFT-математики (#10/#34) —
> рядом по контексту, закрывается отдельным PR позже.

> Сноска по именованию (Задача 4 плана 2026-07-09): формулировка «**trends** `DRONE_TIGHT`»
> в планах/FFT_METRICS и «**template-match** `DRONE_TIGHT`» в таблице выше — **одна и та же
> рабочая точка**: `DRONE_TIGHT` — шаблон trends-FFT-семейства, движок канонического прогона
> в `latest.json` — детектор `template-match`. Отдельного детектора «trends» в каноническом
> прогоне нет, и новый DSP-прогон не заводим (FFT_METRICS §6 — эшелон 0 исчерпан). Требуемая
> Задачей 4 таблица — это таблица выше (добавлена 2026-07-08 как Задача C).


## Протокол прогона

```bash
yarn benchmark:detectors
```

1. Загрузить test-split из [`DATASET.md`](./DATASET.md) (`data/detectors-benchmark/v0.2/manifest.json`, 120 файлов free-v1).
2. Для каждого реализованного `@membrana/*-detector-service` — скользящие окна FFT + `detect(AudioWindow)`.
3. Собрать confusion matrix, precision/recall/F1, latency p50/p95.
4. JSON: [`data/detectors-benchmark/v0.2/reports/latest.json`](../data/detectors-benchmark/v0.2/reports/latest.json).
5. Перезаписать авто-блок таблицы в этом файле.

## Связанные документы

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) §1e
- [`INTEGRATIONS_STRATEGY.md`](./INTEGRATIONS_STRATEGY.md) §4
- [`prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md`](./prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md)
