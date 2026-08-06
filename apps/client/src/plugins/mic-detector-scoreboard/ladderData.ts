import ladderReport from '../../../../../data/detectors-benchmark/v0.2/reports/spectral-ladder.json';

/**
 * Лестница обучения спектрального детектора — Ф2 эпика detector-scoreboard.
 *
 * Отчёт версионируется в репозитории и приезжает ИМПОРТОМ в сборку: сеть здесь была бы
 * вторым источником правды при том же вопросе (разбор Родченко 06.08). Витрина не считает
 * ничего сама — она показывает измеренное и называет, откуда оно.
 *
 * Дисциплина Ф1 не ослабляется: штуки первичны, интервал обязателен и несёт метод,
 * малая выборка несёт оговорку ИЗ ДАННЫХ отчёта, а не из вкуса вёрстки.
 */

export const LADDER_SCHEMA_MAJOR = 'spectral-ladder-report@1';

export interface LadderStepRow {
  readonly nTrainDrones: number;
  readonly nTrainTotal: number;
  readonly method: 'envelope' | 'percentile';
  readonly threshold: number;
  readonly withCompetitors: boolean;
  readonly detected: number;
  readonly dronesTotal: number;
  readonly falseAlarms: number;
  readonly cleanTotal: number;
  readonly pdInterval: readonly [number, number];
  readonly pfaInterval: readonly [number, number];
  readonly intervalMethod: string;
  readonly rocAuc: number | null;
}

export interface LadderView {
  readonly available: boolean;
  /** Причина отсутствия — вслух: «отчёт не собран» ≠ пустая таблица. */
  readonly unavailableReason: string | null;
  readonly generatedAt: string | null;
  readonly corpusLabel: string | null;
  readonly testLabel: string | null;
  readonly steps: readonly LadderStepRow[];
}

/** Доля обнаружения ступени — производная от штук, никогда не вместо них. */
export function stepPd(step: LadderStepRow): number {
  return step.dronesTotal === 0 ? 0 : step.detected / step.dronesTotal;
}

/**
 * Перекрываются ли интервалы обнаружения соседних ступеней ОДНОГО метода.
 *
 * Ради этого вопроса фаза и делалась: «разваливаются ли цифры с ростом выборки». Если
 * интервалы перекрываются — рост не доказан, сколько бы ни двигалась точка; глаз сам
 * Wilson-интервалы не считает (разбор Родченко), поэтому вывод считается здесь и
 * показывается словами.
 */
export function overlapsPrevious(step: LadderStepRow, previous: LadderStepRow | null): boolean | null {
  if (!previous) return null;
  const [aLow, aHigh] = step.pdInterval;
  const [bLow, bHigh] = previous.pdInterval;
  return aLow <= bHigh && bLow <= aHigh;
}

/**
 * Вырожденная ступень: детектор сработал на ВСЁ (ложных тревог столько же, сколько
 * чистых записей). Вердикт Дынина 06.08: это дефект замера, а не результат — тривиальный
 * предиктор «всегда дрон», у которого precision равен доле дронов в тесте по построению.
 * Рабочая точка такой ступени фиктивна, и витрина обязана сказать это словом: иначе
 * «обнаружено 25 из 25» читается как успех.
 */
export function isDegenerate(step: LadderStepRow): boolean {
  return step.cleanTotal > 0 && step.falseAlarms === step.cleanTotal;
}

/**
 * Вердикт лестницы одной фразой. Если интервалы всех соседних ступеней перекрываются —
 * замер НЕ различает ступени, и говорить о росте или плато одинаково нельзя (вердикт
 * паузы Ф2). Витрина показывает предел замера, а не молчит о нём.
 */
export function ladderVerdict(steps: readonly LadderStepRow[]): string {
  const comparable = steps
    .map((s, i) => ({ s, prev: previousOfSameMethod(steps, i) }))
    .filter((x) => x.prev !== null);
  if (comparable.length === 0) return 'ступеней для сравнения нет — вывод о росте невозможен';
  const allOverlap = comparable.every((x) => overlapsPrevious(x.s, x.prev) === true);
  return allOverlap
    ? 'замер на этом масштабе не различает ступени: интервалы всех соседних перекрываются — ' +
        'ни рост, ни плато не доказаны. Нужен пул дронов шире (цель ≥60) либо кросс-валидация по группам'
    : 'есть ступени с разошедшимися интервалами — различие видно, смотреть построчно';
}

/** Предыдущая ступень того же метода — сравнивать envelope с percentile бессмысленно. */
export function previousOfSameMethod(steps: readonly LadderStepRow[], index: number): LadderStepRow | null {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (steps[i].method === steps[index].method) return steps[i];
  }
  return null;
}

/**
 * Чтение отчёта. Мажор схемы обязан совпасть: чужая форма — не «немного другая таблица»,
 * а другой предмет, и показывать её как свою значило бы соврать провенансом.
 */
export function readLadder(report: unknown): LadderView {
  const r = report as {
    schema?: string;
    generatedAt?: string;
    corpus?: { droneCount?: number; cleanCount?: number; path?: string };
    test?: { size?: number; drones?: number; groups?: number };
    steps?: LadderStepRow[];
  } | null;

  if (!r || typeof r.schema !== 'string') {
    return { available: false, unavailableReason: 'отчёт лестницы не собран', generatedAt: null, corpusLabel: null, testLabel: null, steps: [] };
  }
  if (!r.schema.startsWith(LADDER_SCHEMA_MAJOR)) {
    return {
      available: false,
      unavailableReason: `схема отчёта «${r.schema}» не та, которую читает витрина (${LADDER_SCHEMA_MAJOR}.x)`,
      generatedAt: null,
      corpusLabel: null,
      testLabel: null,
      steps: [],
    };
  }
  // Отчёт держит метрики во вложенном `test` — там это правильно: у ступени есть и
  // обучающая часть, и тестовая. Витрине нужна плоская строка, и разворот делается ЗДЕСЬ,
  // один раз, а не в вёрстке — иначе каждая колонка знала бы про форму файла.
  const steps: LadderStepRow[] = (Array.isArray(r.steps) ? r.steps : []).map((raw) => {
    const s = raw as unknown as {
      nTrainDrones: number;
      nTrainTotal: number;
      method: 'envelope' | 'percentile';
      params?: { threshold?: number; withCompetitors?: boolean };
      test?: Omit<LadderStepRow, 'nTrainDrones' | 'nTrainTotal' | 'method' | 'threshold' | 'withCompetitors'>;
    };
    return {
      nTrainDrones: s.nTrainDrones,
      nTrainTotal: s.nTrainTotal,
      method: s.method,
      threshold: s.params?.threshold ?? 0,
      withCompetitors: s.params?.withCompetitors ?? false,
      detected: s.test?.detected ?? 0,
      dronesTotal: s.test?.dronesTotal ?? 0,
      falseAlarms: s.test?.falseAlarms ?? 0,
      cleanTotal: s.test?.cleanTotal ?? 0,
      pdInterval: s.test?.pdInterval ?? [0, 0],
      pfaInterval: s.test?.pfaInterval ?? [0, 0],
      intervalMethod: s.test?.intervalMethod ?? 'н/д',
      rocAuc: s.test?.rocAuc ?? null,
    };
  });
  if (steps.length === 0) {
    return { available: false, unavailableReason: 'в отчёте нет ни одной ступени', generatedAt: r.generatedAt ?? null, corpusLabel: null, testLabel: null, steps: [] };
  }
  return {
    available: true,
    unavailableReason: null,
    generatedAt: r.generatedAt ?? null,
    corpusLabel: `${r.corpus?.droneCount ?? '?'} дронов / ${r.corpus?.cleanCount ?? '?'} чистых`,
    testLabel: `${r.test?.drones ?? '?'} дронов из ${r.test?.size ?? '?'} записей, ${r.test?.groups ?? '?'} групп`,
    steps,
  };
}

export const LADDER: LadderView = readLadder(ladderReport);
