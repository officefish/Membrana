/**
 * Зубы «послушать подряд» (#2109, b3) — на фикстурном хабе, без AudioContext.
 */
import { describe, expect, it } from 'vitest';

import { playSequence, type SequencePrimitives } from './sequence';
import type { SamplePlaybackSnapshot, SamplePlaybackStatus } from './types';

/** Фикстурный хаб: статусы переключает тест, подписчики уведомляются как у живого. */
function hub(opts: { failOn?: string } = {}) {
  let snap: SamplePlaybackSnapshot = {
    selectedSampleId: null, selectedTitle: null, selectedCollectionId: null,
    status: 'idle', currentTimeSec: 0, durationSec: 0, waveform: [], errorMessage: null,
  };
  const listeners = new Set<() => void>();
  const set = (patch: Partial<SamplePlaybackSnapshot>) => {
    snap = { ...snap, ...patch };
    for (const l of listeners) l();
  };
  const log: string[] = [];
  const p: SequencePrimitives = {
    select: async (t) => {
      log.push(`select:${t.id}`);
      set({ selectedSampleId: t.id, status: 'loading' });
      // Загрузка «в следующем тике»: последовательность обязана ЖДАТЬ, а не считать сразу.
      await Promise.resolve();
      if (opts.failOn === t.id) set({ status: 'error', errorMessage: `не раскодировалась ${t.id}` });
      else set({ status: 'paused' });
    },
    play: async () => {
      log.push(`play:${snap.selectedSampleId}`);
      set({ status: 'playing' });
    },
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
    snapshot: () => snap,
  };
  return { p, log, set, status: (s: SamplePlaybackStatus) => set({ status: s }) };
}

const T = (id: string) => ({ id, title: id, collectionId: 'c' });

describe('playSequence', () => {
  it('играет пробы одну за другой, дожидаясь «ended» каждой', async () => {
    const h = hub();
    const run = playSequence(h.p, [T('a'), T('b')]);
    // a: select → paused → play → (тест) ended → b …
    await tick(); await tick();
    h.status('ended');
    await tick(); await tick();
    h.status('ended');
    const out = await run;
    expect(out).toEqual({ played: 2, stoppedBy: 'complete', failedSampleId: null, error: null });
    expect(h.log).toEqual(['select:a', 'play:a', 'select:b', 'play:b']);
  });

  it('ошибка на пробе останавливает последовательность С ИМЕНЕМ пробы, а не пропускает её молча', async () => {
    // Молча пропущенный «похожий» — тот, о котором человек решит, не услышав.
    const h = hub({ failOn: 'b' });
    const run = playSequence(h.p, [T('a'), T('b'), T('c')]);
    await tick(); await tick();
    h.status('ended');
    const out = await run;
    expect(out.stoppedBy).toBe('error');
    expect(out.failedSampleId).toBe('b');
    expect(out.error).toMatch(/не раскодировалась b/u);
    expect(out.played).toBe(1);
    expect(h.log).not.toContain('select:c');
  });

  it('отмена между пробами — «cancel», следующая не запускается', async () => {
    const h = hub();
    const ac = new AbortController();
    const run = playSequence(h.p, [T('a'), T('b')], ac.signal);
    await tick(); await tick();
    ac.abort();
    const out = await run;
    expect(out.stoppedBy).toBe('cancel');
    expect(h.log).not.toContain('select:b');
  });

  it('человек перехватил плеер (idle) — это отмена, не ошибка', async () => {
    const h = hub();
    const run = playSequence(h.p, [T('a'), T('b')]);
    await tick(); await tick();
    h.status('idle');
    const out = await run;
    expect(out).toEqual({ played: 0, stoppedBy: 'cancel', failedSampleId: null, error: null });
  });

  it('пустой список — complete с нулём, плеер не тронут', async () => {
    const h = hub();
    expect(await playSequence(h.p, [])).toEqual({ played: 0, stoppedBy: 'complete', failedSampleId: null, error: null });
    expect(h.log).toEqual([]);
  });
});

const tick = () => new Promise<void>((r) => setTimeout(r, 0));
