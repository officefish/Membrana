import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PluginContext, RunFingerprints } from '@membrana/plugin-contracts';
import { describe, expect, it } from 'vitest';
import { inputHashOf, sha256Hex, type CollectionSampleDescriptor, type CollectionSampleReader } from '../sample-reader.js';
import { MfccRunRefusal, createMfccExecutor, mfccFingerprintsOf, type MfccExecutorDeps, type MfccRunResult } from './executor.js';
import { MFCC_HANDLER_MANIFEST } from './manifest.js';
import type { MfccGatePreset } from './preset.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Синтетический WAV PCM16 моно: синус или тишина. */
function wav(sampleRate: number, seconds: number, hz: number): Uint8Array {
  const n = Math.floor(sampleRate * seconds);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const tag = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  tag(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); tag(8, 'WAVE'); tag(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  tag(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, hz === 0 ? 0 : Math.round(Math.sin((2 * Math.PI * hz * i) / sampleRate) * 12000), true);
  return new Uint8Array(buf);
}

const PRESET: MfccGatePreset = {
  configHash: 'mel40-c24-buf4096-sr48000',
  bounds: Array.from({ length: 24 }, (_, k) => (k < 4 ? { min: 0.05, max: 100 } : { min: -1e9, max: 1e9 })),
  judgedCoefficients: [0, 1, 2, 3],
  minMagnitude: 0.01,
  strictness: { easy: { minInBandRatio: 0.25, minPassRate: 0.3 }, normal: { minInBandRatio: 0.5, minPassRate: 0.6 }, strict: { minInBandRatio: 1, minPassRate: 0.9 } },
};

/** Детерминированная «считалка»: k-й коэффициент — средний модуль кадра × (k+1). Библиотеки в зубе нет. */
const extract = (frame: Float32Array): number[] => {
  let acc = 0;
  for (let i = 0; i < frame.length; i++) acc += Math.abs(frame[i]!);
  const mean = acc / frame.length;
  return Array.from({ length: 24 }, (_, k) => mean * (k + 1));
};

function fakeReader(files: Record<string, { bytes: Uint8Array; sampleRate: number; audioFormat?: string }>): CollectionSampleReader {
  const desc = (id: string): CollectionSampleDescriptor => ({
    id, sampleRate: files[id]!.sampleRate, channels: 1, audioFormat: files[id]!.audioFormat ?? 'wav', sizeBytes: files[id]!.bytes.length, title: id,
  });
  return {
    async listSamples() { return Object.keys(files).reverse().map(desc); },
    async readAudio(s) { const bytes = files[s.id]!.bytes; return { bytes, contentHash: sha256Hex(bytes) }; },
  };
}

const FILES = {
  'b-tone-48k': { bytes: wav(48000, 1.5, 440), sampleRate: 48000 },
  'a-silence-48k': { bytes: wav(48000, 1.0, 0), sampleRate: 48000 },
  'c-tone-44k': { bytes: wav(44100, 1.0, 440), sampleRate: 44100 },
};

const depsOf = (reader: CollectionSampleReader): MfccExecutorDeps =>
  ({ manifest: MFCC_HANDLER_MANIFEST, reader, extract, preset: PRESET, strictness: 'normal', now: () => new Date(0) });

const ctxOf = (fingerprints: RunFingerprints, collectionId = 'col-1'): PluginContext => ({
  address: { pluginId: MFCC_HANDLER_MANIFEST.id, version: MFCC_HANDLER_MANIFEST.version, collectionId, runId: 'run-1', mountTarget: 'background-media/collections' },
  fingerprints, resumeMode: 'fresh', trigger: 'collections.sample_added', payload: {},
});

describe('membrana.handler.mfcc — executor', () => {
  it('детерминизм: два прогона на одном входе — одинаковые отпечатки и одинаковый выход', async () => {
    const deps = depsOf(fakeReader(FILES));
    const fp = await mfccFingerprintsOf(deps, 'col-1');
    const run = async () => (await createMfccExecutor(deps).execute(ctxOf(fp))) as MfccRunResult;
    const [r1, r2] = [await run(), await run()];
    expect(r1).toEqual(r2);
    expect(r1.measured).toEqual(fp);
    expect(r1.kind).toBe('handler');
    expect(r1.samples.map((s) => s.sampleId)).toEqual(['a-silence-48k', 'b-tone-48k', 'c-tone-44k']);
    expect(r1.samples.find((s) => s.sampleId === 'b-tone-48k')).toMatchObject({ outcome: 'detected', frames: 17, reason: null });
    expect(r1.samples.find((s) => s.sampleId === 'a-silence-48k')).toMatchObject({ outcome: 'refused', reason: expect.stringMatching(/немые/) });
    expect(r1.samples.find((s) => s.sampleId === 'c-tone-44k')).toMatchObject({ outcome: 'refused', reason: expect.stringMatching(/44100 ≠ 48000/) });
    expect(r1.summary).toEqual({ total: 3, detected: 1, notDetected: 0, refused: 2 });
    expect(r1.measured.inputHash).toBe(inputHashOf(r1.samples.map((s) => ({ sampleId: s.sampleId, contentHash: s.contentHash }))));
  });

  it('расхождение отпечатков контекста с измеренными — именованный отказ, не тихий результат', async () => {
    const deps = depsOf(fakeReader(FILES));
    const fp = await mfccFingerprintsOf(deps, 'col-1');
    const ex = createMfccExecutor(deps);
    await expect(ex.execute(ctxOf({ ...fp, configHash: 'other' }))).rejects.toBeInstanceOf(MfccRunRefusal);
    await expect(ex.execute(ctxOf({ ...fp, inputHash: 'stale' }))).rejects.toThrow(/срез коллекции изменился/);
  });

  it('не-wav проба — отказ по пробе с причиной, прогон не падает', async () => {
    const deps = depsOf(fakeReader({ 'm.mp3': { bytes: new Uint8Array([1, 2, 3]), sampleRate: 48000, audioFormat: 'mp3' } }));
    const r = (await createMfccExecutor(deps).execute(ctxOf(await mfccFingerprintsOf(deps, 'c')))) as MfccRunResult;
    expect(r.samples[0]).toMatchObject({ outcome: 'refused', reason: expect.stringMatching(/mp3/) });
  });

  it('норма #1950 структурно: у порта чтения два члена, оба читают; граница импортов executor — правило линтера', async () => {
    const port: Record<keyof CollectionSampleReader, true> = { listSamples: true, readAudio: true };
    expect(Object.keys(port).sort()).toEqual(['listSamples', 'readAudio']);
    type Lint = { messages: Array<{ ruleId: string | null; message: string }> };
    type ESLintCtor = new (o: { cwd: string }) => { lintFiles(p: string[]): Promise<Lint[]>; lintText(t: string, o: { filePath: string }): Promise<Lint[]> };
    // @ts-expect-error — @types/eslint в дереве нет; форма названа типом выше
    const { ESLint } = (await import('eslint')) as { ESLint: ESLintCtor };
    const eslint = new ESLint({ cwd: join(HERE, '../..') });
    const clean = await eslint.lintFiles([join(HERE, 'executor.ts')]);
    expect(clean.flatMap((r) => r.messages.map((m) => `${m.ruleId}: ${m.message}`))).toEqual([]);
    // Тот же файл с запрещённым импортом — правило обязано сработать, иначе граница декоративна.
    const dirty = await eslint.lintText(`import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
export const x = [readFileSync, PrismaClient];
`, { filePath: join(HERE, 'executor.ts') });
    const ids = dirty.flatMap((r) => r.messages.filter((m) => m.ruleId === 'no-restricted-imports').map((m) => m.message));
    expect(ids).toHaveLength(2);
    expect(ids.join(' ')).toMatch(/#1950/u);
  }, 60_000); // ESLint + typescript-парсер грузятся секунды; на CI под нагрузкой 5 с по умолчанию не хватило
});
