/**
 * Зубы измерителя чарт-листа. Блок c5b спринта `chart-list-plugin`.
 *
 * Звук синтетический: тон известной громкости на известном фоне. Так проверяется именно то, ради
 * чего измеритель заведён, — что превышение считается ОТ ФОНА НАБОРА, а не от абсолютного порога,
 * и что неизмеренный фон даёт отказ, а не правдоподобное число.
 */
import { describe, expect, it } from 'vitest';

import { CHART_LIST_MEASURE_MANIFEST } from './manifest.js';
import { measureSampleSet, sampleIdsOf, type MeasureDeps } from './executor.js';
import type { CollectionSampleDescriptor, CollectionSampleReader } from '../sample-reader.js';

/** Моно wav PCM16: тон `hz` с амплитудой `amp`, при желании с шумом. */
function wav(seconds: number, amp: number, hz: number, sr = 48000, noise = 0): Uint8Array {
  const n = Math.floor(seconds * sr);
  const buf = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buf);
  const ascii = (off: number, s: string) => [...s].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)));
  ascii(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); ascii(8, 'WAVE');
  ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  ascii(36, 'data'); view.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const v = amp * Math.sin((2 * Math.PI * hz * i) / sr) + (noise === 0 ? 0 : noise * (((i * 2654435761) % 2000) / 1000 - 1));
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 32767, true);
  }
  return new Uint8Array(buf);
}

interface Track { id: string; bytes: Uint8Array }

function reader(tracks: readonly Track[]): CollectionSampleReader {
  return {
    listSamples: async () =>
      tracks.map((t): CollectionSampleDescriptor => ({
        id: t.id, deviceId: 'dev-1', collectionId: 'c1',
        title: t.id, sampleRate: 48000, channels: 1, audioFormat: 'wav', sizeBytes: t.bytes.length,
      })),
    readAudio: async (s) => ({ bytes: tracks.find((t) => t.id === s.id)!.bytes, contentHash: `h-${s.id}` }),
  };
}

const deps = (tracks: readonly Track[]): MeasureDeps => ({ reader: reader(tracks) });

/** Тихий фон: много коротких тихих треков, чтобы фон был ИЗМЕРЕН (кадров ≥ 20). */
const quiet = (n: number): Track[] =>
  Array.from({ length: n }, (_, i) => ({ id: `q${i}`, bytes: wav(1, 0.01, 300) }));

describe('манифест измерителя', () => {
  it('дом — коллекции media, там где лежит звук', () => {
    expect(CHART_LIST_MEASURE_MANIFEST.mountTarget).toBe('background-media/collections');
  });

  it('род report — свод по набору, а не поток по каждой пробе', () => {
    expect(CHART_LIST_MEASURE_MANIFEST.kind).toBe('report');
    expect(CHART_LIST_MEASURE_MANIFEST).not.toHaveProperty('windowSize');
  });

  it('повод из ЗАКРЫТОГО словаря, и это НЕ sample_added: меряется перечень, а не одна проба', () => {
    expect(CHART_LIST_MEASURE_MANIFEST.triggers).toEqual(['collections.collection_created']);
  });

  it('это ДРУГОЙ плагин того же функционала — имя и дом расходятся с чарт-листом', async () => {
    const { CHART_LIST_MANIFEST } = await import('../chart-list/manifest.js');
    expect(CHART_LIST_MEASURE_MANIFEST.id).not.toBe(CHART_LIST_MANIFEST.id);
    expect(CHART_LIST_MEASURE_MANIFEST.mountTarget).not.toBe(CHART_LIST_MANIFEST.mountTarget);
  });
});

describe('набор проб из нагрузки', () => {
  it('читается перечнем строк', () => {
    expect(sampleIdsOf({ sampleIds: ['a', 'b'] })).toEqual(['a', 'b']);
  });

  it('мусор отбрасывается, а не превращается в адреса', () => {
    expect(sampleIdsOf({ sampleIds: ['a', 1, null, '', 'b'] })).toEqual(['a', 'b']);
    expect(sampleIdsOf({})).toEqual([]);
    expect(sampleIdsOf(null)).toEqual([]);
  });
});

describe('измерение набора', () => {
  it('пустой набор — отказ, а не пустой список без причины', async () => {
    const r = await measureSampleSet(deps([]), 'dev-1', 'c1', []);
    expect(r.refusal?.reason).toBe('empty-set');
  });

  it('фон НЕ измерен — отказ, а не превышение над подставленным полом', async () => {
    // Один короткий трек: кадров меньше двадцати, фон посчитать не из чего.
    const r = await measureSampleSet(deps([{ id: 'a', bytes: wav(0.05, 0.5, 440) }]), 'dev-1', 'c1', ['a']);
    expect(r.refusal?.reason).toBe('floor-not-measured');
    expect(r.floor.measured).toBe(false);
    expect(r.candidates).toEqual([]);
  });

  it('громкий трек над тихим фоном становится кандидатом с ИЗМЕРЕННЫМ фоном', async () => {
    const tracks = [...quiet(30), { id: 'loud', bytes: wav(1, 0.6, 440) }];
    const r = await measureSampleSet(deps(tracks), 'dev-1', 'c1', tracks.map((t) => t.id));
    expect(r.refusal).toBeNull();
    expect(r.floor.measured).toBe(true);
    expect(r.candidates.map((c) => c.sampleId)).toContain('loud');
    expect(r.candidates.find((c) => c.sampleId === 'loud')!.deltaDb).toBeGreaterThan(12);
  });

  it('превышение считается ОТ ФОНА НАБОРА: тот же трек в шумном наборе даёт меньше дБ', async () => {
    const loud = { id: 'loud', bytes: wav(1, 0.6, 440) };
    const inQuiet = await measureSampleSet(deps([...quiet(30), loud]), 'dev-1', 'c1', [...quiet(30).map((t) => t.id), 'loud']);
    const noisy = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, bytes: wav(1, 0.2, 300) }));
    const inNoisy = await measureSampleSet(deps([...noisy, loud]), 'dev-1', 'c1', [...noisy.map((t) => t.id), 'loud']);

    const a = inQuiet.candidates.find((c) => c.sampleId === 'loud')!.deltaDb;
    const b = inNoisy.candidates.find((c) => c.sampleId === 'loud')?.deltaDb ?? Number.NEGATIVE_INFINITY;
    // Мера ОТНОСИТЕЛЬНАЯ: абсолютный порог дал бы одно и то же число в обоих наборах.
    expect(a).toBeGreaterThan(b);
  });

  it('измеритель НЕ отбирает: отдаёт всех, кого измерил, без порядка и без обрезки', async () => {
    const tracks = [...quiet(30), { id: 'l1', bytes: wav(1, 0.6, 440) }, { id: 'l2', bytes: wav(1, 0.5, 880) }];
    const r = await measureSampleSet(deps(tracks), 'dev-1', 'c1', tracks.map((t) => t.id));
    expect(r.candidates.length).toBeGreaterThanOrEqual(2);
    expect(r).not.toHaveProperty('picks');
    expect(r).not.toHaveProperty('volume');
  });

  it('один кандидат на трек — строка выборки есть строка журнала, у неё один адрес', async () => {
    const tracks = [...quiet(30), { id: 'loud', bytes: wav(2, 0.6, 440) }];
    const r = await measureSampleSet(deps(tracks), 'dev-1', 'c1', tracks.map((t) => t.id));
    const forLoud = r.candidates.filter((c) => c.sampleId === 'loud');
    expect(forLoud).toHaveLength(1);
  });

  it('проба вне коллекции пропускается, но расхождение со спрошенным видно', async () => {
    const tracks = [...quiet(30), { id: 'loud', bytes: wav(1, 0.6, 440) }];
    const r = await measureSampleSet(deps(tracks), 'dev-1', 'c1', [...tracks.map((t) => t.id), 'нет-такой']);
    expect(r.asked).toBe(tracks.length + 1);
    expect(r.candidates.length).toBeLessThan(r.asked);
  });

  it('структура названа ярлыком, а не оставлена числом', async () => {
    const tracks = [...quiet(30), { id: 'loud', bytes: wav(1, 0.6, 440) }];
    const r = await measureSampleSet(deps(tracks), 'dev-1', 'c1', tracks.map((t) => t.id));
    const c = r.candidates.find((x) => x.sampleId === 'loud')!;
    expect(['tonal', 'broadband']).toContain(c.structure);
    expect(typeof c.flatness).toBe('number');
  });
});

describe('пик и превышение — РАЗНЫЕ величины (находка приёмки 22.08)', () => {
  it('на реальном фоне два числа расходятся — иначе строка врёт о трёх измерениях', async () => {
    const tracks = [...quiet(30), { id: 'loud', bytes: wav(1, 0.6, 440) }];
    const r = await measureSampleSet(deps(tracks), 'dev-1', 'c1', tracks.map((t) => t.id));
    const c = r.candidates.find((x) => x.sampleId === 'loud')!;
    // До починки оба несли dbOverFloor(peak, floor) и совпадали до десятой доли.
    expect(c.deltaDb).not.toBeCloseTo(c.peakDb, 1);
  });

  it('пик АБСОЛЮТНЫЙ: у сигнала тише полной шкалы он отрицательный', async () => {
    const tracks = [...quiet(30), { id: 'loud', bytes: wav(1, 0.6, 440) }];
    const r = await measureSampleSet(deps(tracks), 'dev-1', 'c1', tracks.map((t) => t.id));
    const c = r.candidates.find((x) => x.sampleId === 'loud')!;
    expect(c.peakDb).toBeLessThan(0);
    // 0.6 полной шкалы ≈ −4.4 dBFS: величина материала, а не выборки.
    expect(c.peakDb).toBeCloseTo(20 * Math.log10(0.6), 0);
  });

  it('превышение ЗАВИСИТ от набора, абсолютный пик — НЕТ', async () => {
    const loud = { id: 'loud', bytes: wav(1, 0.6, 440) };
    const inQuiet = await measureSampleSet(deps([...quiet(30), loud]), 'dev-1', 'c1', [...quiet(30).map((t) => t.id), 'loud']);
    const noisy = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, bytes: wav(1, 0.2, 300) }));
    const inNoisy = await measureSampleSet(deps([...noisy, loud]), 'dev-1', 'c1', [...noisy.map((t) => t.id), 'loud']);

    const a = inQuiet.candidates.find((c) => c.sampleId === 'loud')!;
    const b = inNoisy.candidates.find((c) => c.sampleId === 'loud');
    if (b) {
      // Один трек, два набора: превышение поехало, пик остался — в этом и весь смысл разделения.
      expect(a.deltaDb).not.toBeCloseTo(b.deltaDb, 1);
      expect(a.peakDb).toBeCloseTo(b.peakDb, 1);
    }
  });

  it('клиппованный сигнал виден: пик прижат к нулю dBFS', async () => {
    // Амплитуда 1.0 — упор в потолок. Именно это подозревалось у четырёх треков с +39.1.
    const tracks = [...quiet(30), { id: 'clipped', bytes: wav(1, 1.0, 440) }];
    const r = await measureSampleSet(deps(tracks), 'dev-1', 'c1', tracks.map((t) => t.id));
    const c = r.candidates.find((x) => x.sampleId === 'clipped')!;
    expect(c.peakDb).toBeGreaterThan(-0.5);
  });

  it('тишина не даёт ложного нуля: пика нет — не кандидат', async () => {
    const { peakDbFs } = await import('./executor.js');
    expect(peakDbFs(0)).toBe(Number.NEGATIVE_INFINITY);
    expect(peakDbFs(-1)).toBe(Number.NEGATIVE_INFINITY);
  });
});
