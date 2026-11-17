/**
 * Порча прод-исхода 07.10 (#2587): понижение «Наблюдательный пункт» (4 ГБ) → «Блокпост» (2 ГБ) на
 * мембране september оставило 1 запись из 8360 и заморозило 3.8 ГБ, хотя под новый лимит влезала
 * половина буфера.
 *
 * ЦЕПОЧКА ВОСПРОИЗВЕДЕНА БЕЗ ПРОДА, теми же функциями, что у предпросмотра media
 * (`downgrade-archive.service.ts`): `measureSampleSet` → ранг режима → `selectKeepWithinBytes`.
 * Буфер синтетический, но той же формы, что пишет прибор (`scenarioMicJournalBridge` →
 * `encodeWavPcm16`, 48 кГц, моно, ~5 с ≈ 480 КБ): ровный фон помещения и одна громкая запись.
 *
 * Механизм: фон считается по ВСЕМУ набору (нижние 10 % кадров), событие — ≥ 2 кадров на 12 дБ
 * выше. Ровный фон сам себя выше фона на 12 дБ не бывает → такие записи «неизмеримы»
 * (`modeRank: null`), а контракт v1 отправлял неизмеримых во freeze ДАЖЕ ПРИ СВОБОДНОМ БЮДЖЕТЕ.
 * На буфере, где почти всё — фон, keep сжимался до горстки громких.
 */
import { describe, expect, it } from 'vitest';

import { measureSampleSet } from '../chart-list-measure/executor.js';
import type { CollectionSampleDescriptor, CollectionSampleReader } from '../sample-reader.js';

import { selectKeepWithinBytes, type KeepCandidate } from './select-keep-within-bytes.js';

const SR = 48_000;
const SECONDS = 5;
const T0 = 1_759_800_000_000;

/** Моно wav PCM16 той же формы, что у прибора. `burst` — громкая вставка посередине. */
function wav(ambient: number, burst: number | null): Uint8Array {
  const n = SECONDS * SR;
  const buf = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buf);
  const ascii = (off: number, s: string) => [...s].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)));
  ascii(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); ascii(8, 'WAVE');
  ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, SR, true); view.setUint32(28, SR * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  ascii(36, 'data'); view.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    // Детерминированный «шум» помещения (без Math.random): ровный по уровню на всём треке.
    let v = ambient * ((((i * 2654435761) >>> 0) % 2000) / 1000 - 1);
    if (burst !== null && i >= 2 * SR && i < 3 * SR) v += burst * Math.sin((2 * Math.PI * 440 * i) / SR);
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 32767, true);
  }
  return new Uint8Array(buf);
}

interface Track { readonly id: string; readonly bytes: Uint8Array; readonly createdAt: number }

function reader(tracks: readonly Track[]): CollectionSampleReader {
  return {
    listSamples: async () =>
      tracks.map((t): CollectionSampleDescriptor => ({
        id: t.id, deviceId: 'dev-sept', collectionId: 'buffer',
        title: t.id, sampleRate: SR, channels: 1, audioFormat: 'wav', sizeBytes: t.bytes.length,
      })),
    readAudio: async (s) => ({ bytes: tracks.find((t) => t.id === s.id)!.bytes, contentHash: `h-${s.id}` }),
  };
}

/** N записей буфера: одна громкая (самая старая), остальные — ровный фон. Новее — больше индекс. */
function buffer(n: number): Track[] {
  const ambient = wav(0.02, null);
  return Array.from({ length: n }, (_, i) => ({
    id: `s${String(i).padStart(3, '0')}`,
    bytes: i === 0 ? wav(0.02, 0.5) : ambient,
    createdAt: T0 + i * 5_000,
  }));
}

describe('понижение тарифа на буфере «почти всё — фон» (прод 07.10, #2587)', () => {
  it('под лимит в половину буфера остаётся ~половина, а не горстка громких', async () => {
    const tracks = buffer(40);
    const measured = await measureSampleSet({ reader: reader(tracks) }, 'dev-sept', 'buffer', tracks.map((t) => t.id));
    expect(measured.refusal).toBeNull();
    // Посылка порчи — сама форма прод-исхода: измерена одна запись из сорока.
    expect(measured.candidates.map((c) => c.sampleId)).toEqual(['s000']);

    const rankOf = new Map(measured.candidates.map((c, i) => [c.sampleId, i] as const));
    const candidates: KeepCandidate[] = tracks.map((t) => ({
      sampleId: t.id,
      bytes: t.bytes.length,
      createdAt: t.createdAt,
      pinned: false,
      modeRank: rankOf.get(t.id) ?? null,
    }));
    const total = candidates.reduce((s, c) => s + c.bytes, 0);
    const limit = Math.floor(total / 2);
    const record = tracks[0]!.bytes.length;

    const out = selectKeepWithinBytes(candidates, limit);
    expect(out.refusal).toBeNull();
    // Инвариант байт — не тронут.
    expect(out.keepBytes).toBeLessThanOrEqual(limit);
    // Прод-исход: keep = 1 запись. Ожидание: бюджет заполнен с точностью до одной записи.
    expect(out.keepBytes).toBeGreaterThan(limit - record);
    expect(out.keep.length).toBe(20);
    // Порядок keep: измеренная первой, затем неизмеримые — НОВЕЕ остаются (решение 3 ADR-0031).
    expect(out.keep[0]!.sampleId).toBe('s000');
    expect(out.keep.slice(1).map((c) => c.sampleId)).toEqual(
      Array.from({ length: 19 }, (_, i) => `s${String(39 - i).padStart(3, '0')}`),
    );
  }, 60_000);

  /**
   * Уточнение #2629 (приёмка 07.10): на september измерены ВСЕ записи (`unmeasured = 0`), а без
   * ранга остались почти все. Отбору всё равно, почему ранга нет: запись без ранга — после
   * ранжированных, пока хватает байт. Здесь измерены все сорок, ранг — только у первых пяти
   * (как если бы очередь режима отдала лишь часть); старый отбор (v1) морозил бы 35 при любом лимите.
   */
  it('измерены все, ранжирована часть: записи без ранга остаются под лимитом, новее — первыми (#2629)', async () => {
    const tracks = Array.from({ length: 40 }, (_, i) => ({
      id: `m${String(i).padStart(3, '0')}`,
      bytes: wav(0.02, 0.5),
      createdAt: T0 + i * 5_000,
    }));
    const measured = await measureSampleSet({ reader: reader(tracks) }, 'dev-sept', 'buffer', tracks.map((t) => t.id));
    expect(measured.refusal).toBeNull();
    // Посылка уточнения: измерены все — «неизмеримых» нет.
    expect(measured.candidates).toHaveLength(40);

    const ranked = new Set(tracks.slice(0, 5).map((t) => t.id));
    const candidates: KeepCandidate[] = tracks.map((t, i) => ({
      sampleId: t.id,
      bytes: t.bytes.length,
      createdAt: t.createdAt,
      pinned: false,
      modeRank: ranked.has(t.id) ? i : null,
    }));
    const unranked = candidates.filter((c) => c.modeRank === null).length;
    expect(unranked).toBe(35);

    const record = tracks[0]!.bytes.length;
    const limit = record * 20;
    const out = selectKeepWithinBytes(candidates, limit);
    expect(out.refusal).toBeNull();
    expect(out.keepBytes).toBeLessThanOrEqual(limit);
    expect(out.keep).toHaveLength(20);
    // Ранжированные — первыми, затем без ранга: новее остаются.
    expect(out.keep.slice(0, 5).map((c) => c.sampleId)).toEqual([...ranked]);
    expect(out.keep.slice(5).map((c) => c.sampleId)).toEqual(
      Array.from({ length: 15 }, (_, i) => `m${String(39 - i).padStart(3, '0')}`),
    );
    expect(out.freeze.every((c) => c.modeRank === null)).toBe(true);
  }, 60_000);
});
