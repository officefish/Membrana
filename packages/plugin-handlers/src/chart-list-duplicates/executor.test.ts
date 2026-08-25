/**
 * Зубы исполнителя витрины дублей (#2109, b2). Порт измерения — фикстура: звук здесь не нужен.
 */
import { describe, expect, it } from 'vitest';

import type { MeasuredCandidate } from '../chart-list-measure/executor.js';
import { runLibraryDuplicates } from './executor.js';

function measured(id: string, deltaDb: number, seed: number): MeasuredCandidate {
  return {
    sampleId: id,
    deltaDb,
    peakDb: -20 + deltaDb,
    flatness: 0.1,
    structure: 'tonal',
    durationSec: 5,
    features: { centroidHz: 1000 + seed * 500, rolloffHz: 3000 + seed * 700, flatness: 0.1 + seed * 0.02, zeroCrossingRate: 0.05 + seed * 0.01, flux: 0.2 },
  };
}

const T0 = Date.parse('2026-08-23T00:00:00Z');
const samples = [
  { sampleId: 'a', at: T0 + 1_000 },
  { sampleId: 'a-клон', at: T0 + 2_000 },
  { sampleId: 'b', at: T0 + 3_000 },
  { sampleId: 'вчерашний-клон', at: T0 - 86_400_000 },
];
const portOf = (log: string[][]) => ({
  measure: async (ids: readonly string[]) => {
    log.push([...ids]);
    return ids.map((id) => measured(id, id.startsWith('a') || id.includes('клон') ? 30 : 10, id === 'b' ? 5 : 0));
  },
});

describe('runLibraryDuplicates', () => {
  it('окно судится ДО измерения: меряются только пробы в окне', async () => {
    const log: string[][] = [];
    const out = await runLibraryDuplicates(portOf(log), samples, { fromMs: T0, toMs: T0 + 10_000 });
    expect(log).toEqual([['a', 'a-клон', 'b']]);
    expect(out.inSet).toBe(4);
    expect(out.inWindow).toBe(3);
    expect(out.measured).toBe(3);
    expect(out.report.groups).toHaveLength(1);
    expect(out.report.groups[0]!.duplicates.map((d) => d.sampleId)).toEqual(['a-клон']);
  });

  it('без окна — весь набор, и вчерашний клон входит в пару', async () => {
    const out = await runLibraryDuplicates(portOf([]), samples, null);
    expect(out.inWindow).toBe(4);
    expect(out.report.groups[0]!.duplicates.map((d) => d.sampleId)).toEqual(['вчерашний-клон', 'a-клон']);
  });

  it('перепутанные границы окна — отказ до измерения, порт не тронут', async () => {
    const log: string[][] = [];
    const out = await runLibraryDuplicates(portOf(log), samples, { fromMs: T0 + 10_000, toMs: T0 });
    expect(log).toEqual([]);
    expect(out.report.refusal).not.toBeNull();
    expect(out.measured).toBe(0);
  });

  it('паспорт доезжает до вызывающего: порог назван числом и словом «унаследован»', async () => {
    const out = await runLibraryDuplicates(portOf([]), samples, null);
    expect(out.report.passport).toEqual({ minDistanceRatio: 0.05, inherited: true });
  });

  it('витрина не знает глагола «удалить»: в исходе нет ни поля, ни слова', async () => {
    const out = await runLibraryDuplicates(portOf([]), samples, null);
    expect(JSON.stringify(out)).not.toMatch(/delete|remove|удал/iu);
  });
});
