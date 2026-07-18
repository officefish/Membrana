import type { ScoreboardRow } from './types';

/**
 * Измеренные строки витрины — Ф1 показывает ТОЛЬКО их, новых замеров не делает.
 *
 * Источники: живой прогон `yarn benchmark:detectors` 18.07 на боевой
 * конфигурации (ADR-0006) и лабораторные эксперименты того же дня. Разбор —
 * `docs/tasks/research/dads-lab-report-2026-07-18.md`.
 *
 * Числа обязаны совпадать с `data/detectors-benchmark/v0.2/reports/latest.json`.
 * Расхождение означает, что витрина врёт, — это условие приёмки Ф1.
 */
export const SCOREBOARD_MEASURED_AT = '2026-07-18';

export const SCOREBOARD_ROWS: readonly ScoreboardRow[] = [
  {
    detector: 'harmonic',
    family: 'dsp',
    datasetLabel: 'v0.2 (весь корпус)',
    datasetSize: 120,
    detected: 41,
    dronesTotal: 60,
    falseAlarms: 53,
    cleanTotal: 60,
    pdInterval: [0.558, 0.787],
    rocAuc: 0.301,
    source: 'reports/latest.json @ 18.07',
    caveat: 'Ранжирует хуже монетки: уверенность как сигнал непригодна.',
  },
  {
    detector: 'cepstral',
    family: 'dsp',
    datasetLabel: 'v0.2 (весь корпус)',
    datasetSize: 120,
    detected: 60,
    dronesTotal: 60,
    falseAlarms: 60,
    cleanTotal: 60,
    pdInterval: [0.94, 1],
    rocAuc: 0.484,
    source: 'reports/latest.json @ 18.07',
    caveat: 'Кричит на всё: обнаружение полное, но и ложных столько же.',
  },
  {
    detector: 'spectral-flux',
    family: 'dsp',
    datasetLabel: 'v0.2 (весь корпус)',
    datasetSize: 120,
    detected: 43,
    dronesTotal: 60,
    falseAlarms: 47,
    cleanTotal: 60,
    pdInterval: [0.592, 0.815],
    rocAuc: 0.199,
    source: 'reports/latest.json @ 18.07',
    caveat: 'Худшее ранжирование в наборе — уверенность инвертирована.',
  },
  {
    detector: 'template-match',
    family: 'dsp',
    datasetLabel: 'v0.2 (весь корпус)',
    datasetSize: 120,
    detected: 54,
    dronesTotal: 60,
    falseAlarms: 26,
    cleanTotal: 60,
    pdInterval: [0.799, 0.953],
    rocAuc: 0.449,
    source: 'reports/latest.json @ 18.07',
  },
  {
    detector: 'yamnet (готовая, порог наш)',
    family: 'neural',
    datasetLabel: 'v0.2 (весь корпус)',
    datasetSize: 120,
    detected: 55,
    dronesTotal: 60,
    falseAlarms: 22,
    cleanTotal: 60,
    pdInterval: [0.819, 0.964],
    rocAuc: 0.799,
    source: 'reports/latest.json @ 18.07',
    caveat:
      'Модель обучена не нами; наше — одно число порога. Потолок: при обнаружении ≥54 из 60 ни одно из 120 положений порога не даёт меньше 21 ложной.',
  },
  {
    detector: 'yamnet + обучение на наших звуках',
    family: 'neural-trained',
    datasetLabel: 'v0.2 + free-v1',
    datasetSize: 137,
    detected: 62,
    dronesTotal: 63,
    falseAlarms: 6,
    cleanTotal: 74,
    pdInterval: [0.92, 1],
    rocAuc: 0.985,
    source: 'lab-yamnet-embeddings.mjs @ 18.07, leave-one-group-out',
    caveat:
      'Проверка с разведением фрагментов одной записи (106 групп). Баланс 1:1 — в реальном потоке, где дрон редок, ложных на одно верное будет больше.',
  },
  {
    detector: 'trends-fft (спектральный)',
    family: 'dsp',
    datasetLabel: 'v0.2, честный train/val',
    datasetSize: 40,
    detected: 19,
    dronesTotal: 20,
    falseAlarms: 6,
    cleanTotal: 20,
    pdInterval: [0.764, 0.991],
    rocAuc: null,
    source: 'benchmark-fft-trends.mjs @ 18.07, val-сплит',
    caveat:
      'Единственный, мерянный с дисциплиной train/val. Выборка мала — интервал широкий: 76–99 %.',
  },
];
