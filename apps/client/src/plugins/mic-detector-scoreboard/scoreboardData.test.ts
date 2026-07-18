import { describe, expect, it } from 'vitest';

import { SCOREBOARD_ROWS } from './scoreboardData';
import { probabilityOfDetection, probabilityOfFalseAlarm } from './types';

/**
 * Условие приёмки Ф1: числа витрины совпадают с прогоном бенчмарка.
 * Расхождение означает, что витрина врёт — это хуже, чем её отсутствие.
 *
 * Значения ниже переписаны из `data/detectors-benchmark/v0.2/reports/latest.json`
 * (живой прогон 18.07 на боевой конфигурации, ADR-0006). Тест краснеет, если
 * витрина разойдётся с отчётом.
 */
const REPORT_18_07: Record<string, { tp: number; fp: number; fn: number; tn: number }> = {
  harmonic: { tp: 41, fp: 53, fn: 19, tn: 7 },
  cepstral: { tp: 60, fp: 60, fn: 0, tn: 0 },
  'spectral-flux': { tp: 43, fp: 47, fn: 17, tn: 13 },
  'template-match': { tp: 54, fp: 26, fn: 6, tn: 34 },
};

describe('витрина не расходится с прогоном', () => {
  it('строки бенчмарка совпадают с отчётом 18.07', () => {
    for (const [name, m] of Object.entries(REPORT_18_07)) {
      const row = SCOREBOARD_ROWS.find((r) => r.detector === name);
      expect(row, `строка ${name} обязана быть в витрине`).toBeDefined();
      expect(row!.detected, `${name}: обнаружено`).toBe(m.tp);
      expect(row!.dronesTotal, `${name}: дронов всего`).toBe(m.tp + m.fn);
      expect(row!.falseAlarms, `${name}: ложных`).toBe(m.fp);
      expect(row!.cleanTotal, `${name}: чистых всего`).toBe(m.fp + m.tn);
    }
  });

  it('yamnet стоковая — рабочая точка отгружаемого порога', () => {
    const row = SCOREBOARD_ROWS.find((r) => r.detector.startsWith('yamnet (готовая'));
    expect(row!.detected).toBe(55);
    expect(row!.falseAlarms).toBe(22);
    expect(probabilityOfDetection(row!)).toBeCloseTo(0.917, 3);
    expect(probabilityOfFalseAlarm(row!)).toBeCloseTo(0.367, 3);
  });

  it('обученная голова — цифры лабораторного прогона с группировкой', () => {
    const row = SCOREBOARD_ROWS.find((r) => r.family === 'neural-trained');
    expect(row!.detected).toBe(62);
    expect(row!.dronesTotal).toBe(63);
    expect(row!.falseAlarms).toBe(6);
    expect(row!.cleanTotal).toBe(74);
    expect(row!.rocAuc).toBeCloseTo(0.985, 3);
  });
});

describe('дисциплина витрины', () => {
  it('каждая строка несёт провенанс — число без источника не доказательство', () => {
    for (const row of SCOREBOARD_ROWS) {
      expect(row.source, `${row.detector}: источник`).toBeTruthy();
      expect(row.source.length).toBeGreaterThan(8);
    }
  });

  it('интервал не уже точечной оценки и лежит в [0,1]', () => {
    for (const row of SCOREBOARD_ROWS) {
      const [lo, hi] = row.pdInterval;
      expect(lo, `${row.detector}: нижняя`).toBeGreaterThanOrEqual(0);
      expect(hi, `${row.detector}: верхняя`).toBeLessThanOrEqual(1);
      expect(hi).toBeGreaterThan(lo);
      const pd = probabilityOfDetection(row);
      expect(pd, `${row.detector}: оценка внутри интервала`).toBeGreaterThanOrEqual(lo - 1e-9);
      expect(pd).toBeLessThanOrEqual(hi + 1e-9);
    }
  });

  it('малые выборки помечены оговоркой', () => {
    for (const row of SCOREBOARD_ROWS) {
      if (row.datasetSize < 60) {
        expect(row.caveat, `${row.detector}: выборка ${row.datasetSize} требует оговорки`).toBeTruthy();
      }
    }
  });

  it('счётчики не превышают тотал', () => {
    for (const row of SCOREBOARD_ROWS) {
      expect(row.detected).toBeLessThanOrEqual(row.dronesTotal);
      expect(row.falseAlarms).toBeLessThanOrEqual(row.cleanTotal);
    }
  });
});
