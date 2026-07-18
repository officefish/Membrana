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

describe('витрина не расходится с прогоном', () => {
  it('yamnet без обучения — рабочая точка отгружаемого порога', () => {
    const row = SCOREBOARD_ROWS.find((r) => r.detector.includes('без обучения'));
    expect(row!.detected).toBe(55);
    expect(row!.falseAlarms).toBe(22);
    expect(probabilityOfDetection(row!)).toBeCloseTo(0.917, 3);
    expect(probabilityOfFalseAlarm(row!)).toBeCloseTo(0.367, 3);
  });

  it('обученная голова — прогон с группировкой по записи', () => {
    const row = SCOREBOARD_ROWS.find((r) => r.family === 'neural-trained');
    expect(row!.detected).toBe(59);
    expect(row!.falseAlarms).toBe(6);
    expect(row!.rocAuc).toBeCloseTo(0.984, 3);
  });

  it('спектральный — отгружаемый шаблон на всех 120', () => {
    const row = SCOREBOARD_ROWS.find((r) => r.family === 'dsp');
    expect(row!.detected).toBe(53);
    expect(row!.falseAlarms).toBe(9);
  });

  it('все строки приведены к одному знаменателю 60/60 — иначе несравнимы', () => {
    for (const row of SCOREBOARD_ROWS) {
      expect(row.dronesTotal, row.detector).toBe(60);
      expect(row.cleanTotal, row.detector).toBe(60);
    }
  });

  it('бракованные детекторы в витрину не попадают', () => {
    for (const bad of ['harmonic', 'cepstral', 'spectral-flux']) {
      expect(SCOREBOARD_ROWS.some((r) => r.detector === bad), bad).toBe(false);
    }
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
