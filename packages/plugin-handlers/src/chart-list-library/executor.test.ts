/**
 * Зубы отбора в библиотеке (#2110). Гоняются на числах: порт измерения — фейк, звука нет.
 */
import { describe, expect, it } from 'vitest';

import type { EventFeatures } from '../session-metrics/index.js';
import type { MeasuredCandidate } from '../chart-list-measure/executor.js';
import {
  librarySettingsUsable,
  runLibraryChartList,
  type LibraryMeasurePort,
  type LibrarySampleRef,
} from './executor.js';
import { LIBRARY_CHART_LIST_MANIFEST } from './manifest.js';

const DAY = 86_400_000;
const t0 = 1_755_000_000_000;

const features = (): EventFeatures => ({
  centroidHz: 1000,
  rolloffHz: 4000,
  flatness: 0.1,
  zeroCrossingRate: 0.05,
  flux: 0.2,
});

const measuredOf = (sampleId: string, deltaDb = 15): MeasuredCandidate => ({
  sampleId,
  deltaDb,
  peakDb: -20,
  flatness: 0.1,
  structure: 'tonal',
  durationSec: 1.5,
  features: features(),
});

/** Порт-фейк: помнит, что у него СПРОСИЛИ, — по этому и судится экономия измерения. */
function fakePort(): LibraryMeasurePort & { asked: string[][] } {
  const asked: string[][] = [];
  return {
    asked,
    measure(ids) {
      asked.push([...ids]);
      return Promise.resolve(ids.map((id) => measuredOf(id)));
    },
  };
}

const refs = (n: number, from = t0): LibrarySampleRef[] =>
  Array.from({ length: n }, (_, i) => ({ sampleId: `s${i}`, at: from + i * DAY }));

describe('манифест библиотеки', () => {
  it('второй показ семейства: дом collections, род showcase, журнальный манифест не тронут', () => {
    expect(LIBRARY_CHART_LIST_MANIFEST.mountTarget).toBe('background-media/collections');
    expect(LIBRARY_CHART_LIST_MANIFEST.kind).toBe('showcase');
    expect(LIBRARY_CHART_LIST_MANIFEST.id).toBe('membrana.showcase.library-chart-list');
  });
});

describe('runLibraryChartList', () => {
  it('счастливый путь: окно → измерение → отбор, счётчики честные', async () => {
    const port = fakePort();
    const out = await runLibraryChartList(port, refs(5), { volume: 20, criterion: 'loudness-over-floor' });
    expect(out.selection.refusal).toBeNull();
    expect(out).toMatchObject({ inSet: 5, inWindow: 5, measured: 5 });
    expect(out.selection.picks).toHaveLength(5);
  });

  it('НЕГОДНЫЕ НАСТРОЙКИ — отказ ДО измерения: порт не зовётся вовсе', async () => {
    const port = fakePort();
    const out = await runLibraryChartList(port, refs(5), { volume: 7, criterion: 'loudness-over-floor' });
    expect(out.selection.refusal?.reason).toBe('unknown-volume');
    expect(port.asked).toHaveLength(0);
  });

  it('ОКНО СУЖАЕТ ДО ИЗМЕРЕНИЯ: меряются только попавшие — ради этого окно и заведено (1136 проб)', async () => {
    const port = fakePort();
    const out = await runLibraryChartList(
      port,
      refs(10),
      { volume: 20, criterion: 'loudness-over-floor' },
      { fromMs: t0 + 7 * DAY },
    );
    expect(port.asked).toEqual([['s7', 's8', 's9']]);
    expect(out).toMatchObject({ inSet: 10, inWindow: 3, measured: 3 });
  });

  it('пустое окно — отказ empty-window, измерения нет', async () => {
    const port = fakePort();
    const out = await runLibraryChartList(
      port,
      refs(5),
      { volume: 20, criterion: 'loudness-over-floor' },
      { fromMs: t0 + 100 * DAY },
    );
    expect(out.selection.refusal?.reason).toBe('empty-window');
    expect(port.asked).toHaveLength(0);
  });

  it('перепутанные границы — отказ invalid-window, измерения нет', async () => {
    const port = fakePort();
    const out = await runLibraryChartList(
      port,
      refs(5),
      { volume: 20, criterion: 'loudness-over-floor' },
      { fromMs: t0 + DAY, toMs: t0 - DAY },
    );
    expect(out.selection.refusal?.reason).toBe('invalid-window');
    expect(port.asked).toHaveLength(0);
  });

  it('измерено МЕНЬШЕ, чем в окне, — расхождение видно счётчиками, а не съедено', async () => {
    const port: LibraryMeasurePort = {
      measure: (ids) => Promise.resolve(ids.slice(1).map((id) => measuredOf(id))),
    };
    const out = await runLibraryChartList(port, refs(4), { volume: 20, criterion: 'loudness-over-floor' });
    expect(out.inWindow).toBe(4);
    expect(out.measured).toBe(3);
    expect(out.selection.picks).toHaveLength(3);
  });

  it('строка выборки адресуется пробой: entryId = sampleId, играть и находить — по одному адресу', async () => {
    const out = await runLibraryChartList(fakePort(), refs(2), { volume: 20, criterion: 'loudness-over-floor' });
    for (const p of out.selection.picks) expect(p.entryId).toBe(p.sampleId);
  });

  it('пустой набор — no-candidates из ядра, отличимо от пустого окна', async () => {
    const out = await runLibraryChartList(fakePort(), [], { volume: 20, criterion: 'loudness-over-floor' });
    expect(out.selection.refusal?.reason).toBe('no-candidates');
  });
});

describe('librarySettingsUsable', () => {
  it('то же правило, что у журнальной витрины', () => {
    expect(librarySettingsUsable({ volume: 20, criterion: 'loudness-over-floor' })).toBe(true);
    expect(librarySettingsUsable({ volume: 7, criterion: 'loudness-over-floor' })).toBe(false);
    expect(librarySettingsUsable({ volume: 20, criterion: 'выдуманный' })).toBe(false);
  });
});
