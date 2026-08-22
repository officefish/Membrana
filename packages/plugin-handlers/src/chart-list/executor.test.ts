/**
 * Зубы манифеста и исполнителя чарт-листа. Блок c3 спринта `chart-list-plugin`.
 *
 * Порт измерения подменён стабом: исполнитель обязан проверяться без поднятого media, иначе он
 * знает о транспорте больше, чем должен.
 */
import { describe, expect, it } from 'vitest';

import { CHART_LIST_MANIFEST } from './manifest.js';
import {
  createChartListExecutor,
  settingsOf,
  settingsUsable,
  type ChartListMeasurePort,
  type ChartListTask,
} from './executor.js';
import type { ChartListCandidate } from './selection.js';
import type { PluginContext } from '@membrana/plugin-contracts';
import type { EventFeatures } from '../session-metrics/index.js';

const features = (over: Partial<EventFeatures> = {}): EventFeatures => ({
  centroidHz: 1000,
  rolloffHz: 4000,
  flatness: 0.1,
  zeroCrossingRate: 0.05,
  flux: 0.2,
  ...over,
});

const cand = (i: number): ChartListCandidate => ({
  entryId: `e${i}`,
  sampleId: `s${i}`,
  at: 1_755_000_000_000 + i,
  deltaDb: 30 - i,
  peakDb: -20,
  flatness: 0.05 + i * 0.02,
  structure: i < 2 ? 'tonal' : 'broadband',
  durationSec: 1 + i,
  features: features({ centroidHz: 500 + i * 800, flux: i * 0.4 }),
});

/** Стаб порта: считает вызовы — так видно, что негодная настройка измерение НЕ запускала. */
function stubPort(n: number): ChartListMeasurePort & { calls: number } {
  const box = {
    calls: 0,
    async measure(_task: ChartListTask): Promise<readonly ChartListCandidate[]> {
      box.calls += 1;
      return Array.from({ length: n }, (_, i) => cand(i));
    },
  };
  return box;
}

const ctx = (payload: unknown): PluginContext => ({
  address: {
    pluginId: CHART_LIST_MANIFEST.id,
    version: '0.1.0',
    collectionId: 'journal',
    runId: 'run-1',
    mountTarget: 'background-cabinet/journal',
  },
  fingerprints: { inputHash: 'состав-задания', configHash: 'пресет-плагина' },
  resumeMode: 'fresh',
  trigger: 'journal.entry_created',
  payload,
});

const task = (n: number): ChartListTask => ({
  userId: 'u1',
  entryIds: Array.from({ length: n }, (_, i) => `e${i}`),
});

describe('манифест', () => {
  it('род showcase — единственный, который страница показывает', () => {
    expect(CHART_LIST_MANIFEST.kind).toBe('showcase');
  });

  it('дом — журнал кабинета, а не коллекции media', () => {
    expect(CHART_LIST_MANIFEST.mountTarget).toBe('background-cabinet/journal');
  });

  it('повод из ЗАКРЫТОГО словаря — своего не заведено', () => {
    expect(CHART_LIST_MANIFEST.triggers).toEqual(['journal.entry_created']);
  });

  it('форма показа — список, и страница её умеет', () => {
    expect(CHART_LIST_MANIFEST.displayForm).toBe('table');
  });

  it('имя по форме словаря <org>.<kind>.<slug>', () => {
    expect(CHART_LIST_MANIFEST.id).toMatch(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*){2}$/u);
  });

  it('поля манифеста ровно контрактные — шестого своего нет', () => {
    expect(Object.keys(CHART_LIST_MANIFEST).sort()).toEqual(
      ['description', 'displayForm', 'id', 'kind', 'mountTarget', 'triggers', 'version'].sort(),
    );
  });
});

describe('настройки человека', () => {
  it('читаются из payload, а не из отпечатков', () => {
    expect(settingsOf({ volume: 60, criterion: 'drone-likeness' })).toEqual({
      volume: 60,
      criterion: 'drone-likeness',
    });
  });

  it('негодные значения НЕ подставляются молча', () => {
    expect(settingsUsable(settingsOf({ volume: 50, criterion: 'drone-likeness' }))).toBe(false);
    expect(settingsUsable(settingsOf({ volume: 20, criterion: 'rare' }))).toBe(false);
    expect(settingsUsable(settingsOf({}))).toBe(false);
    expect(settingsUsable(settingsOf({ volume: 20, criterion: 'spectral-variety' }))).toBe(true);
  });
});

describe('исполнитель', () => {
  it('негодная настройка отказывает БЕЗ измерения — двести треков зря не мерим', async () => {
    const port = stubPort(5);
    const exec = createChartListExecutor({ port });
    const r = await exec.runWithTask(ctx({ volume: 50, criterion: 'rare' }), task(5));
    expect(port.calls).toBe(0);
    expect(r.selection.refusal?.reason).toBe('unknown-criterion');
    expect(r.measured).toBe(0);
  });

  it('годная настройка запускает измерение и отдаёт выборку', async () => {
    const port = stubPort(5);
    const exec = createChartListExecutor({ port });
    const r = await exec.runWithTask(ctx({ volume: 20, criterion: 'loudness-over-floor' }), task(5));
    expect(port.calls).toBe(1);
    expect(r.selection.refusal).toBeNull();
    expect(r.selection.picks).toHaveLength(5);
  });

  it('расхождение «спросили / измерили» видно, а не сглажено', async () => {
    const port = stubPort(3);
    const exec = createChartListExecutor({ port });
    const r = await exec.runWithTask(ctx({ volume: 20, criterion: 'loudness-over-floor' }), task(10));
    expect(r.asked).toBe(10);
    expect(r.measured).toBe(3);
  });

  it('род результата — showcase, как объявлено манифестом', async () => {
    const exec = createChartListExecutor({ port: stubPort(2) });
    const r = await exec.runWithTask(ctx({ volume: 20, criterion: 'spectral-variety' }), task(2));
    expect(r.kind).toBe('showcase');
  });

  it('настройки в ОТПЕЧАТКИ не протекают — цена M3′ принята, а не «починена»', async () => {
    const exec = createChartListExecutor({ port: stubPort(2) });
    const a = ctx({ volume: 20, criterion: 'loudness-over-floor' });
    const b = ctx({ volume: 200, criterion: 'drone-likeness' });
    // Два прогона с РАЗНЫМИ ручками несут ОДИН отпечаток: так и задумано.
    expect(a.fingerprints).toEqual(b.fingerprints);
    const ra = await exec.runWithTask(a, task(2));
    const rb = await exec.runWithTask(b, task(2));
    expect(ra.selection.criterion).not.toBe(rb.selection.criterion);
  });

  it('исполнитель отпечатков не считает — он их получает готовыми', async () => {
    const exec = createChartListExecutor({ port: stubPort(2) });
    const r = await exec.runWithTask(ctx({ volume: 20, criterion: 'spectral-variety' }), task(2));
    expect(r).not.toHaveProperty('fingerprints');
  });

  it('общий вход контракта задания НЕ выдумывает — бросает, а не возвращает правдоподобную пустоту', async () => {
    const port = stubPort(5);
    const exec = createChartListExecutor({ port });
    await expect(exec.execute(ctx({ volume: 20, criterion: 'loudness-over-floor' }))).rejects.toThrow(
      /без задания не исполним/,
    );
    // Порт не звали: измерение впустую — трата чужого ресурса ради пустого ответа.
    expect(port.calls).toBe(0);
  });
});
