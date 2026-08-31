/**
 * Зубы файла разметки (#2237).
 *
 * Порча владельца: подсунуть приёму файл с признаком неполноты — обязан отказать
 * с названной причиной, а не применить частично и промолчать.
 */
import { describe, expect, it } from 'vitest';

import {
  LABEL_MANIFEST_SCHEMA,
  buildLabelManifest,
  readLabelManifest,
} from '../src/label-manifest.js';
import type { MediaSample } from '../src/types.js';

function sample(patch: Partial<MediaSample> = {}): MediaSample {
  return {
    id: 'id-1',
    collectionId: 'col-1',
    title: 'MakeTrack 1',
    class: 'buffer',
    label: 'unlabeled',
    source: 'mic-recording',
    durationSec: 5,
    sampleRate: 48_000,
    channels: 1,
    createdAt: '2026-08-26T19:10:43.144Z',
    storageRef: 'ref.wav',
    sizeBytes: 460_000,
    ...patch,
  };
}

const whole = () =>
  buildLabelManifest({
    collectionName: 'Калитка',
    collectionId: 'col-1',
    exported: [sample({ id: 'a', label: 'drone' }), sample({ id: 'b' })],
    collectionTotal: 2,
  });

describe('выгрузка объявляет свою полноту', () => {
  it('полный набор: partial=false, числа совпадают', () => {
    const m = whole();
    expect(m.schema).toBe(LABEL_MANIFEST_SCHEMA);
    expect(m.partial).toBe(false);
    expect(m.exportedCount).toBe(2);
    expect(m.collectionTotal).toBe(2);
  });

  it('ПОРЧА: выгружена страница из большого набора — файл объявляет себя неполным', () => {
    const m = buildLabelManifest({
      collectionName: 'Buffer',
      collectionId: '__buffer__',
      exported: [sample()],
      collectionTotal: 1747,
    });
    expect(m.partial).toBe(true);
    expect(m.exportedCount).toBe(1);
    expect(m.collectionTotal, 'полное число берётся у набора, а не из длины списка').toBe(1747);
  });

  it('дом не знает полного числа — файл всё равно неполон: «не знаю» ≠ «полон»', () => {
    const m = buildLabelManifest({
      collectionName: 'Калитка',
      collectionId: 'col-1',
      exported: [sample()],
      collectionTotal: null,
    });
    expect(m.partial).toBe(true);
  });

  it('разметка едет как есть: имя, метка, заметка', () => {
    const m = whole();
    expect(m.labels[0]).toEqual({ fileName: 'MakeTrack 1', label: 'drone', notes: null });
  });
});

describe('приём отказывает по названной причине', () => {
  it('ПОРЧА ВЛАДЕЛЬЦА: файл с признаком неполноты — ОТКАЗ, а не частичное применение', () => {
    const partial = buildLabelManifest({
      collectionName: 'Buffer',
      collectionId: '__buffer__',
      exported: [sample()],
      collectionTotal: 1747,
    });
    const res = readLabelManifest(JSON.stringify(partial));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe('partial_export');
    expect(res.why).toContain('1 записей из 1747');
    expect(res.why, 'отказ обязан сказать, что делать').toContain('Выгрузите набор целиком');
  });

  it('неполнота ловится и по числам, даже если признак стёрли руками', () => {
    const forged = { ...whole(), partial: false, exportedCount: 2, collectionTotal: 9 };
    const res = readLabelManifest(JSON.stringify(forged));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('partial_export');
  });

  it('файл старого образца отвергается: он не умел объявлять полноту', () => {
    const old = {
      collection: 'Калитка',
      collectionId: 'col-1',
      exportedAt: '2026-08-29T10:00:00.000Z',
      labels: [{ fileName: 'MakeTrack 1', label: 'drone', notes: null }],
    };
    const res = readLabelManifest(JSON.stringify(old));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe('unknown_schema');
    expect(res.why).toContain('перевыгрузите набор');
  });

  it('не JSON и файл без списка — отдельные причины, а не одна общая', () => {
    expect(readLabelManifest('это не json')).toMatchObject({ ok: false, reason: 'not_json' });
    expect(
      readLabelManifest(JSON.stringify({ schema: LABEL_MANIFEST_SCHEMA })),
    ).toMatchObject({ ok: false, reason: 'no_labels' });
  });

  it('полный файл принимается и отдаёт разметку', () => {
    const res = readLabelManifest(JSON.stringify(whole()));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.manifest.labels).toHaveLength(2);
    expect(res.manifest.partial).toBe(false);
  });

  it('КРУГ ЗАМКНУТ: то, что собрали полным, принимается; неполное — нет', () => {
    expect(readLabelManifest(JSON.stringify(whole())).ok).toBe(true);
    expect(
      readLabelManifest(
        JSON.stringify(
          buildLabelManifest({
            collectionName: 'Buffer',
            collectionId: '__buffer__',
            exported: [sample()],
            collectionTotal: 40,
          }),
        ),
      ).ok,
    ).toBe(false);
  });
});
