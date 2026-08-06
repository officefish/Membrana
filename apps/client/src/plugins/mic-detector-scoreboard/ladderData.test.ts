import { describe, expect, it } from 'vitest';

import {
  LADDER,
  LADDER_SCHEMA_MAJOR,
  overlapsPrevious,
  previousOfSameMethod,
  isDegenerate,
  ladderVerdict,
  readLadder,
  stepPd,
  type LadderStepRow,
} from './ladderData';

// Зубы лестницы (блок g2, Ф2). Витрина обязана честно молчать, когда отчёта нет, и
// честно говорить «рост не доказан», когда интервалы соседних ступеней перекрываются.

const step = (over: Partial<LadderStepRow> = {}): LadderStepRow => ({
  nTrainDrones: 20,
  nTrainTotal: 34,
  method: 'percentile',
  threshold: 50,
  withCompetitors: false,
  detected: 24,
  dronesTotal: 25,
  falseAlarms: 10,
  cleanTotal: 23,
  pdInterval: [0.78, 0.99],
  pfaInterval: [0.25, 0.63],
  intervalMethod: 'wilson@0.95',
  rocAuc: 0.82,
  ...over,
});

describe('чтение отчёта лестницы', () => {
  it('отчёта нет — витрина говорит это вслух, а не показывает пустую таблицу', () => {
    const v = readLadder(null);
    expect(v.available).toBe(false);
    expect(v.unavailableReason).toMatch(/не собран/);
    expect(v.steps).toHaveLength(0);
  });

  it('чужая схема — отказ с названной причиной, а не «немного другая таблица»', () => {
    const v = readLadder({ schema: 'spectral-ladder-report@2.0.0', steps: [step()] });
    expect(v.available).toBe(false);
    expect(v.unavailableReason).toContain('spectral-ladder-report@2.0.0');
  });

  it('пустые ступени — тоже отказ: «отчёт есть» не значит «есть что показать»', () => {
    const v = readLadder({ schema: 'spectral-ladder-report@1.0.0', steps: [] });
    expect(v.available).toBe(false);
    expect(v.unavailableReason).toMatch(/ни одной ступени/);
  });

  it('живой отчёт репозитория читается и несёт провенанс', () => {
    expect(LADDER.available).toBe(true);
    expect(LADDER.generatedAt).toBeTruthy();
    expect(LADDER.corpusLabel).toMatch(/дронов/);
    expect(LADDER.testLabel).toMatch(/групп/);
    expect(LADDER.steps.length).toBeGreaterThan(0);
    for (const s of LADDER.steps) {
      expect(s.dronesTotal).toBeGreaterThan(0);
      expect(s.pdInterval).toHaveLength(2);
      expect(s.intervalMethod).toBe('wilson@0.95');
    }
  });

  it('знаменатели теста одинаковы на всех ступенях — тест неподвижен', () => {
    const denominators = new Set(LADDER.steps.map((s) => `${s.dronesTotal}/${s.cleanTotal}`));
    expect(denominators.size).toBe(1);
  });
});

describe('ответ на вопрос стабильности', () => {
  it('перекрытие интервалов считается, а не оставляется глазу', () => {
    const low = step({ nTrainDrones: 10, pdInterval: [0.70, 0.95] });
    const high = step({ nTrainDrones: 20, pdInterval: [0.90, 1.0] });
    expect(overlapsPrevious(high, low)).toBe(true);
    expect(overlapsPrevious(step({ pdInterval: [0.10, 0.30] }), low)).toBe(false);
  });

  it('первая ступень сравнивать не с чем — null, а не «нет перекрытия»', () => {
    expect(overlapsPrevious(step(), null)).toBeNull();
  });

  it('сравнивается ступень с ТЕМ ЖЕ методом — envelope с percentile несравнимы', () => {
    const steps = [
      step({ nTrainDrones: 10, method: 'envelope' }),
      step({ nTrainDrones: 10, method: 'percentile' }),
      step({ nTrainDrones: 20, method: 'envelope' }),
    ];
    expect(previousOfSameMethod(steps, 2)?.method).toBe('envelope');
    expect(previousOfSameMethod(steps, 0)).toBeNull();
  });

  it('доля — производная от штук', () => {
    expect(stepPd(step({ detected: 24, dronesTotal: 25 }))).toBeCloseTo(0.96);
    expect(stepPd(step({ detected: 0, dronesTotal: 0 }))).toBe(0);
  });

  it('мажор схемы объявлен витриной явно', () => {
    expect(LADDER_SCHEMA_MAJOR).toBe('spectral-ladder-report@1');
  });
});

describe('пределы замера названы витриной', () => {
  it('вырожденная ступень «сработал на всё» опознаётся как дефект замера', () => {
    expect(isDegenerate(step({ falseAlarms: 23, cleanTotal: 23 }))).toBe(true);
    expect(isDegenerate(step({ falseAlarms: 10, cleanTotal: 23 }))).toBe(false);
  });

  it('все интервалы перекрываются — вердикт говорит «не различает», а не «плато»', () => {
    const steps = [
      step({ nTrainDrones: 10, pdInterval: [0.7, 1.0] }),
      step({ nTrainDrones: 20, pdInterval: [0.75, 0.99] }),
    ];
    expect(ladderVerdict(steps)).toMatch(/не различает ступени/);
    expect(ladderVerdict(steps)).not.toMatch(/плато\b(?!.*не)/);
  });

  it('разошедшиеся интервалы — вердикт зовёт смотреть построчно', () => {
    const steps = [
      step({ nTrainDrones: 10, pdInterval: [0.1, 0.3] }),
      step({ nTrainDrones: 20, pdInterval: [0.8, 1.0] }),
    ];
    expect(ladderVerdict(steps)).toMatch(/разошедшимися/);
  });

  it('живой отчёт: вердикт вынесен и не обещает большего', () => {
    expect(ladderVerdict(LADDER.steps)).toBeTruthy();
  });
});

describe('контракт схемы отчёта проверяется в сборке (P1 ревью PR #1749)', () => {
  it('мажор ЖИВОГО отчёта совпадает с тем, что читает витрина', async () => {
    // Косвенной проверки `available === true` мало: она объясняет симптом, но не
    // называет причину. Здесь сверяется сам контракт — иначе рассинхрон схемы даст
    // зелёный UI при мёртвой функции (замечание тимлида 06.08).
    const report = (await import('../../../../../data/detectors-benchmark/v0.2/reports/spectral-ladder.json')).default as {
      schema?: string;
    };
    expect(report.schema).toBeTruthy();
    expect(report.schema?.startsWith(LADDER_SCHEMA_MAJOR)).toBe(true);
  });

  it('живой отчёт не оказывается «недоступным» молча', () => {
    expect(LADDER.unavailableReason).toBeNull();
    expect(LADDER.available).toBe(true);
  });
});
