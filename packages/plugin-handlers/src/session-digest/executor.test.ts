/**
 * Зубы разбора сеанса (j2): манифест по контракту, окно из payload, отказы именем,
 * свод с адресами-точками. Звук синтетический — сети и файлов в зубах нет.
 */
import type { PluginContext } from '@membrana/plugin-contracts';
import { describe, expect, it } from 'vitest';

import type { CollectionSampleDescriptor, CollectionSampleReader } from '../sample-reader.js';
import { SESSION_DIGEST_MANIFEST } from './manifest.js';
import { createSessionDigestExecutor, windowOf, type SessionDigestResult } from './executor.js';

/** WAV PCM16 моно 48 кГц: заголовок + сэмплы. Тише/громче задаётся амплитудой. */
function wav(seconds: number, amp: number, hz: number, sr = 48000): Uint8Array {
  const n = Math.floor(seconds * sr);
  const buf = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buf);
  const ascii = (off: number, s: string) => [...s].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)));
  ascii(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); ascii(8, 'WAVE');
  ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  ascii(36, 'data'); view.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const v = amp * Math.sin((2 * Math.PI * hz * i) / sr);
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 32767, true);
  }
  return new Uint8Array(buf);
}

interface Track { id: string; title: string; createdAt?: string; bytes: Uint8Array }

function reader(tracks: readonly Track[]): CollectionSampleReader {
  return {
    listSamples: async () =>
      tracks.map((t): CollectionSampleDescriptor => ({
        id: t.id, title: t.title, sampleRate: 48000, channels: 1, audioFormat: 'wav', sizeBytes: t.bytes.length,
        ...(t.createdAt ? { createdAt: t.createdAt } : {}),
      })),
    readAudio: async (s) => ({ bytes: tracks.find((t) => t.id === s.id)!.bytes, contentHash: `h-${s.id}` }),
  };
}

const ctx = (payload: unknown): PluginContext => ({
  address: {
    pluginId: SESSION_DIGEST_MANIFEST.id, version: '0.1.0', collectionId: 'c-session',
    runId: 'r1', mountTarget: 'background-media/collections',
  },
  fingerprints: { inputHash: 'in', configHash: 'cfg' },
  resumeMode: 'fresh',
  trigger: 'collections.sample_added',
  payload,
});

const run = (tracks: readonly Track[], payload: unknown = {}, tuning = {}) =>
  createSessionDigestExecutor({ reader: reader(tracks), tuning, now: () => new Date('2026-08-21T12:00:00Z') })
    .execute(ctx(payload)) as Promise<SessionDigestResult>;

/** Сеанс: много тихого фона (для оценки фона) + названные громкие события. */
const quiet = (n: number): Track[] =>
  Array.from({ length: n }, (_, i) => ({ id: `q${i}`, title: `фон ${i}`, createdAt: '2026-08-21T10:00:00.000Z', bytes: wav(1, 0.01, 300) }));

describe('манифест — по контракту plugin-contracts', () => {
  it('род report (не handler), дом collections, повод из закрытого словаря, имя <org>.<kind>.<slug>', () => {
    expect(SESSION_DIGEST_MANIFEST.kind).toBe('report');
    expect(SESSION_DIGEST_MANIFEST.mountTarget).toBe('background-media/collections');
    expect(SESSION_DIGEST_MANIFEST.triggers).toEqual(['collections.sample_added']);
    expect(SESSION_DIGEST_MANIFEST.id).toMatch(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*){2}$/u);
    // У рода report поля windowSize нет вовсе — выдумывать ему смысл не пришлось.
    expect('windowSize' in SESSION_DIGEST_MANIFEST).toBe(false);
  });
});

describe('окно сеанса приезжает в ctx.payload (контракты не тронуты)', () => {
  it('разбирается from/to; мусор — пустое окно, а не бросок', () => {
    expect(windowOf({ from: 'a', to: 'b' })).toEqual({ from: 'a', to: 'b' });
    expect(windowOf({ from: 'a' })).toEqual({ from: 'a' });
    expect(windowOf(null)).toEqual({});
    expect(windowOf('строка')).toEqual({});
    expect(windowOf({ from: 42 })).toEqual({});
  });

  it('окно режет коллекцию по createdAt; проба без отметки в окно НЕ попадает', async () => {
    const tracks: Track[] = [
      ...quiet(30),
      { id: 'in', title: 'в окне', createdAt: '2026-08-21T10:00:30.000Z', bytes: wav(1, 0.5, 440) },
      { id: 'out', title: 'вне окна', createdAt: '2026-08-21T09:00:00.000Z', bytes: wav(1, 0.5, 440) },
      { id: 'no-stamp', title: 'без отметки', bytes: wav(1, 0.5, 440) },
    ];
    const r = await run(tracks, { from: '2026-08-21T09:59:00.000Z', to: '2026-08-21T10:01:00.000Z' });
    expect(r.window.tracksSeen).toBe(33);
    expect(r.window.tracksInWindow).toBe(31);
    expect(r.twenty.map((t) => t.sampleId)).toContain('in');
    expect(r.twenty.map((t) => t.sampleId)).not.toContain('out');
    expect(r.twenty.map((t) => t.sampleId)).not.toContain('no-stamp');
  });
});

describe('свод: адрес — точка, паспорт честен, отсев виден', () => {
  it('громкое событие попадает в двадцать с адресом и превышением над фоном', async () => {
    const r = await run([...quiet(30), { id: 'loud', title: 'сигнал', createdAt: '2026-08-21T10:00:30.000Z', bytes: wav(1, 0.6, 440) }]);
    expect(r.refusal).toBeNull();
    expect(r.floor.measured).toBe(true);
    const found = r.twenty.find((t) => t.sampleId === 'loud');
    expect(found).toBeDefined();
    expect(found!.peakDb).toBeGreaterThan(12);
    expect(found!.endSec).toBeGreaterThan(found!.startSec);
    expect(found!.durationSec).toBeCloseTo(found!.endSec - found!.startSec, 10);
    expect(found!.structure === 'tonal' || found!.structure === 'broadband').toBe(true);
  });

  it('паспорт несёт рабочую точку и признаётся, что пороги ещё не подтверждены слухом', async () => {
    const r = await run([...quiet(30)], {}, { deltaDb: 18 });
    expect(r.passport.deltaDb).toBe(18);
    expect(r.passport.limit).toBe(20);
    expect(r.passport.provisionalThresholds).toBe(true);
  });

  it('двадцать одинаковых хлопков схлопываются, и вытеснение видно числом', async () => {
    const clones = Array.from({ length: 8 }, (_, i) => ({
      id: `clone${i}`, title: `хлопок ${i}`, createdAt: '2026-08-21T10:00:30.000Z', bytes: wav(1, 0.6, 440),
    }));
    const r = await run([...quiet(30), ...clones]);
    const kept = r.twenty.filter((t) => t.sampleId.startsWith('clone'));
    expect(kept).toHaveLength(1);
    expect(kept[0]!.similarDropped).toBeGreaterThan(0);
    expect(r.eventsFound).toBeGreaterThanOrEqual(8);
  });
});

describe('отказы именем, не тихим нулём', () => {
  it('в окне пусто — session-too-short с числами', async () => {
    const r = await run(quiet(30), { from: '2030-01-01T00:00:00.000Z' });
    expect(r.refusal?.reason).toBe('session-too-short');
    expect(r.twenty).toEqual([]);
    expect(r.shortfall).toBe(20);
  });

  it('кадров меньше двадцати — фон НЕ измерен, и прогон это говорит', async () => {
    const r = await run([{ id: 'tiny', title: 'кроха', createdAt: '2026-08-21T10:00:00.000Z', bytes: wav(0.3, 0.2, 440) }]);
    expect(r.refusal?.reason).toBe('floor-not-measured');
    expect(r.floor.measured).toBe(false);
  });

  it('ничего громче фона — no-events-over-floor, а не пустой топ без причины', async () => {
    const r = await run(quiet(40), {}, { deltaDb: 40 });
    expect(r.refusal?.reason).toBe('no-events-over-floor');
    expect(r.twenty).toEqual([]);
  });
});
