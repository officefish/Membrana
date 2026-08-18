import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPluginId } from '@membrana/plugin-contracts';
import { describe, expect, it } from 'vitest';
import { firstWaveHandlerManifest, firstWavePluginId } from './manifest.js';
import { MFCC_HANDLER_MANIFEST } from './mfcc/manifest.js';
import { mfccConfigFromHash, mfccPipeSpecOf } from './mfcc/preset.js';
import { inputHashOf, type CollectionSampleReader } from './sample-reader.js';
import { decodeWavMono16 } from './wav.js';

const HERE = dirname(fileURLToPath(import.meta.url));

describe('манифест первой волны', () => {
  it('membrana.handler.mfcc проходит формат M1; «mfcc-detector» без org и рода — нет', () => {
    expect(MFCC_HANDLER_MANIFEST.id).toBe('membrana.handler.mfcc');
    expect(isPluginId(MFCC_HANDLER_MANIFEST.id)).toBe(true);
    expect(isPluginId('mfcc-detector')).toBe(false);
    expect(() => firstWavePluginId('Mfcc')).toThrow(/не проходит/);
  });

  it('ровно поля рода handler: пять базовых + windowSize; дом collections, повод sample_added', () => {
    const m = firstWaveHandlerManifest('harmonic', '0.1.0');
    expect(Object.keys(m).sort()).toEqual(['id', 'kind', 'mountTarget', 'triggers', 'version', 'windowSize']);
    expect(m).toEqual({
      id: 'membrana.handler.harmonic', version: '0.1.0', kind: 'handler',
      mountTarget: 'background-media/collections', triggers: ['collections.sample_added'], windowSize: 1,
    });
  });
});

describe('порт чтения и отпечаток входа (норма #1950 / M3)', () => {
  it('у порта два члена, оба читают', () => {
    const port: Record<keyof CollectionSampleReader, true> = { listSamples: true, readAudio: true };
    expect(Object.keys(port).sort()).toEqual(['listSamples', 'readAudio']);
  });

  it('inputHash — SHA-256, не зависит от порядка выдачи сервиса', () => {
    const a = inputHashOf([{ sampleId: 'x', contentHash: '1' }, { sampleId: 'y', contentHash: '2' }]);
    const b = inputHashOf([{ sampleId: 'y', contentHash: '2' }, { sampleId: 'x', contentHash: '1' }]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(inputHashOf([{ sampleId: 'x', contentHash: '3' }])).not.toBe(a);
  });
});

describe('WAV PCM16 → моно', () => {
  it('разбирает заголовок, усредняет каналы; чужую разрядность отвергает с причиной', () => {
    const n = 4;
    const buf = new ArrayBuffer(44 + n * 4);
    const v = new DataView(buf);
    const tag = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    tag(0, 'RIFF'); tag(8, 'WAVE'); tag(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 2, true); v.setUint32(24, 48000, true); v.setUint16(34, 16, true); tag(36, 'data'); v.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, 16384, true); v.setInt16(46 + i * 4, -16384, true); }
    const r = decodeWavMono16(new Uint8Array(buf));
    expect(r.ok && r.audio.sampleRate).toBe(48000);
    expect(r.ok && [...r.audio.samples]).toEqual([0, 0, 0, 0]);
    v.setUint16(34, 24, true);
    expect(decodeWavMono16(new Uint8Array(buf))).toEqual({ ok: false, reason: 'разрядность 24 — декодер только PCM16' });
    expect(decodeWavMono16(new Uint8Array(3))).toEqual({ ok: false, reason: 'не RIFF/WAVE' });
  });
});

describe('пресет ворот → спека судьи', () => {
  it('отпечаток без -sr отвергается; боевой пресет из data/ разворачивается на трёх уровнях', () => {
    expect(mfccConfigFromHash('mel40-c24-buf4096')).toBeNull();
    expect(mfccConfigFromHash('mel40-c24-buf4096-sr48000')).toEqual({ melBands: 40, numberOfCoefficients: 24, bufferSize: 4096, sampleRate: 48000 });
    const report = JSON.parse(readFileSync(join(HERE, '../../../data/detectors-benchmark/v0.2/reports/mfcc-gates-first-cut.json'), 'utf8'));
    for (const level of ['easy', 'normal', 'strict'] as const) {
      const spec = mfccPipeSpecOf(report.preset, level);
      expect(spec.configHash).toBe('mel40-c24-buf4096-sr48000');
      expect(spec.bounds).toHaveLength(24);
      expect(spec.judgedCoefficients).toEqual([0, 1, 2, 3]);
    }
    expect(() => mfccPipeSpecOf({ ...report.preset, bounds: [] }, 'normal')).toThrow(/коридоров 0/);
  });
});
