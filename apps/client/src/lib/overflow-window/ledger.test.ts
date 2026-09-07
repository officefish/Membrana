/**
 * Зубы счёта «что и сколько ушло» (M5 (г), T11, #2310). Предмет — `ledger.ts`.
 *
 * Порчи → красный: «успех» при 0 ушедших (текст без нуля / со словом «успех») — красный;
 * «вывезено» и «удалено» слились в одно число — красный; расхождение обещанного и факта
 * проглочено (mismatch=false при 5≠3) — красный; занижение счёта буфера ниже объявленного
 * сервером — красный.
 */
import { BUFFER_COLLECTION_ID, type MediaLibrarySnapshot, type MediaSample } from '@membrana/media-library-service';
import { describe, expect, it } from 'vitest';

import { deltaSinceStop, describeCleanOutcome, describeSinceStop, readBufferLedger, settleClean } from './ledger';

function sample(id: string, collectionId: string, sizeBytes: number): MediaSample {
  return {
    id,
    collectionId,
    title: id,
    class: 'x',
    label: 'unlabeled' as MediaSample['label'],
    source: 'mic' as MediaSample['source'],
    durationSec: 1,
    sampleRate: 48_000,
    channels: 1,
    createdAt: '2026-09-06T00:00:00.000Z',
    storageRef: id,
    sizeBytes,
  };
}

function snapshot(buffer: MediaSample[], outside: MediaSample[], declared?: number): MediaLibrarySnapshot {
  return {
    collections: [
      { id: BUFFER_COLLECTION_ID, name: 'Буфер', kind: 'system', createdAt: '', updatedAt: '', sampleCount: declared },
      { id: 'set-1', name: 'Набор', kind: 'user', createdAt: '', updatedAt: '' },
    ] as MediaLibrarySnapshot['collections'],
    samplesByCollection: { [BUFFER_COLLECTION_ID]: buffer, 'set-1': outside },
    quota: { usedBytes: 0, limitBytes: 0, backend: 'server', serverReachable: true },
    version: 1,
  };
}

describe('readBufferLedger — из локального снимка', () => {
  it('считает пробы и байты буфера и пробы вне буфера', () => {
    const led = readBufferLedger(
      snapshot([sample('a', BUFFER_COLLECTION_ID, 100), sample('b', BUFFER_COLLECTION_ID, 50)], [sample('c', 'set-1', 7)]),
    );
    expect(led).toEqual({ bufferSamples: 2, bufferBytes: 150, outsideSamples: 1 });
  });

  it('объявленное сервером число больше загруженного → берём большее (не занижать)', () => {
    const led = readBufferLedger(snapshot([sample('a', BUFFER_COLLECTION_ID, 1)], [], 40));
    expect(led.bufferSamples).toBe(40);
  });
});

describe('settleClean / describeCleanOutcome', () => {
  const before = { bufferSamples: 5, bufferBytes: 500, outsideSamples: 0 };

  it('обещано 5, ушло 5 → «Удалено из буфера: 5» без расхождения', () => {
    const o = settleClean(before, { bufferSamples: 0, bufferBytes: 0, outsideSamples: 0 }, { samples: 5, bytes: 500 });
    expect(o).toMatchObject({ kind: 'cleaned', removedSamples: 5, removedBytes: 500, mismatch: false });
    expect(describeCleanOutcome(o)).toBe('Удалено из буфера: 5 проб · 500 B.');
  });

  it('обещано 5, ушло 3 → расхождение показано, не проглочено', () => {
    const o = settleClean(before, { bufferSamples: 2, bufferBytes: 200, outsideSamples: 0 }, { samples: 5, bytes: 500 });
    expect(o.mismatch).toBe(true);
    expect(describeCleanOutcome(o)).toContain('Обещано 5, ушло 3');
    expect(describeCleanOutcome(o)).toContain('расхождение');
  });

  it('пусто = показать пусто: 0 обещано, 0 ушло → «Удалено: 0», не «успех»', () => {
    const empty = { bufferSamples: 0, bufferBytes: 0, outsideSamples: 0 };
    const o = settleClean(empty, empty, { samples: 0, bytes: 0 });
    const text = describeCleanOutcome(o);
    expect(text).toMatch(/Удалено: 0/u);
    expect(text.toLowerCase()).not.toContain('успех');
    expect(o.mismatch).toBe(false);
  });
});

describe('deltaSinceStop / describeSinceStop — «вывезено» ≠ «удалено»', () => {
  const base = { bufferSamples: 10, bufferBytes: 1000, outsideSamples: 3 };

  it('ничего не ушло → нули словами', () => {
    const d = deltaSinceStop(base, base);
    expect(d).toEqual({ gone: 0, exported: 0, deleted: 0 });
    expect(describeSinceStop(d)).toContain('вывезено 0 · удалено 0');
  });

  it('4 ушло из буфера, 3 появились в наборах → вывезено 3, удалено 1', () => {
    const d = deltaSinceStop(base, { bufferSamples: 6, bufferBytes: 600, outsideSamples: 6 });
    expect(d).toEqual({ gone: 4, exported: 3, deleted: 1 });
    expect(describeSinceStop(d)).toBe('С момента остановки: вывезено в наборы 3 · удалено 1.');
  });

  it('рост наборов сверх ушедшего из буфера (импорт извне) не приписывается вывозу', () => {
    const d = deltaSinceStop(base, { bufferSamples: 9, bufferBytes: 900, outsideSamples: 20 });
    expect(d).toEqual({ gone: 1, exported: 1, deleted: 0 });
  });
});
