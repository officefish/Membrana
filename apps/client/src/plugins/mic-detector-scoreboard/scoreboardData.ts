import type { ScoreboardRow } from './types';

/**
 * Строки витрины — Ф1 показывает ТОЛЬКО измеренное, новых замеров не делает.
 *
 * Состав отобран владельцем 18.07: harmonic, cepstral и spectral-flux из витрины
 * ИСКЛЮЧЕНЫ как брак — они ранжируют хуже монетки (AUC 0.199–0.484), их
 * уверенность как сигнал непригодна. Показываем работающее: спектральный
 * trends-fft и нейросеть на ступенях обучения.
 *
 * Все строки приведены к ОДНОМУ знаменателю 60 дронов / 60 чистых — иначе они
 * несравнимы. Приведение сделано ПЕРЕМЕРОМ, а не пересчётом долей.
 *
 * Разбор — `docs/tasks/research/dads-lab-report-2026-07-18.md`.
 */
export const SCOREBOARD_MEASURED_AT = '2026-07-18';

export const SCOREBOARD_ROWS: readonly ScoreboardRow[] = [
  {
    detector: 'trends-fft (спектральный)',
    family: 'dsp',
    datasetLabel: 'v0.2, отгружаемая конфигурация',
    datasetSize: 120,
    detected: 53,
    dronesTotal: 60,
    falseAlarms: 9,
    cleanTotal: 60,
    pdInterval: [0.778, 0.942],
    rocAuc: 0.734,
    source: 'lab-trends-crossval.mjs @ 18.07, шаблон + конкуренты на всех 120',
    caveat:
      'Шаблон захардкожен константами — от объёма данных НЕ зависит. Работает без нейросети, переносится на дешёвое железо.',
  },
  {
    detector: 'yamnet — без обучения',
    family: 'neural',
    datasetLabel: 'v0.2, порог подобран нами',
    datasetSize: 120,
    detected: 55,
    dronesTotal: 60,
    falseAlarms: 22,
    cleanTotal: 60,
    pdInterval: [0.819, 0.964],
    rocAuc: 0.799,
    source: 'reports/latest.json @ 18.07',
    caveat:
      'Модель обучена не нами: дрон опознаётся по восьми похожим звукам чужого справочника. Потолок — при обнаружении ≥54 из 60 ни одно из 120 положений порога не даёт меньше 21 ложной.',
  },
  {
    detector: 'yamnet — обучен на 120',
    family: 'neural-trained',
    datasetLabel: 'наш корпус v0.2',
    datasetSize: 120,
    detected: 59,
    dronesTotal: 60,
    falseAlarms: 6,
    cleanTotal: 60,
    pdInterval: [0.911, 0.997],
    rocAuc: 0.984,
    source: 'lab-yamnet-embeddings.mjs @ 18.07, leave-one-group-out',
    caveat:
      'Фрагменты одной записи разведены (89 групп). Баланс 1:1 — в реальном потоке, где дрон редок, ложных на одно верное будет больше.',
  },
];

/**
 * Ступени лестницы обучения, которых ЕЩЁ НЕТ.
 *
 * Показываются пустыми намеренно: витрина обязана отличать «не измерено» от
 * «измерено плохо». Собственный набор упирается раньше первой ступени — при
 * неподвижном тесте в 60 записей на обучение остаётся около 190 из 253.
 * Поэтому лестница начинается за пределами нашего корпуса.
 */
export interface PendingLadderStep {
  readonly trainSize: number;
  readonly blockedBy: string;
}

export const PENDING_LADDER: readonly PendingLadderStep[] = [
  { trainSize: 250, blockedBy: 'нужен тест вне обучения — у нас 253 всего' },
  { trainSize: 1000, blockedBy: 'внешний массив, ~90 МБ' },
  { trainSize: 3000, blockedBy: 'внешний массив, ~260 МБ' },
  { trainSize: 10000, blockedBy: 'внешний массив, ~900 МБ' },
];
