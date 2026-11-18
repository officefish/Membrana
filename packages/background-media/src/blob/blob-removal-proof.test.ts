/**
 * Зубы доказательства удаления (#2632 g2, DoD плана `docs/sprint/cut/archive-gc-journal-2588.json`):
 * removeWithProof различает removed / already_absent / failed по stat до и после; `afterExists=true`
 * после rm = failed.
 *
 * Диск — подставной (`BlobRemovalFs` на Map), чтобы зубы ловили ровно правило, а не поведение ОС.
 * Порчи: судить по коду возврата rm (не по stat после) → красный «rm молча не удалил»; звать rm,
 * когда файла нет → красный (rm 0 ожидается); считать ошибку stat отсутствием → красный
 * (already_absent вместо failed); отдавать bytesFreed у failed → красный.
 */
import { describe, expect, it, vi } from 'vitest';

import { BLOB_REMOVAL_ACTIONS, type BlobRemovalFs, classifyRemoval, removeWithProof } from './blob-removal-proof';

const PATH = '/blobs/d-1/s-1.wav';
const REF = 'd-1/s-1.wav';

function errno(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(code), { code });
}

/** Диск на Map. `rmEffect`: что rm делает с файлом. `statErrors`: ошибка stat по номеру вызова. */
function fakeFs(opts: {
  files?: Record<string, number>;
  rmEffect?: 'delete' | 'noop' | 'throw' | 'throw-after-delete';
  statErrors?: Record<number, string>;
}) {
  const files = new Map(Object.entries(opts.files ?? {}));
  let statCalls = 0;
  const fs = {
    stat: vi.fn(async (p: string) => {
      statCalls += 1;
      const code = opts.statErrors?.[statCalls];
      if (code) throw errno(code);
      return files.has(p) ? { size: files.get(p)! } : null;
    }),
    rm: vi.fn(async (p: string) => {
      const effect = opts.rmEffect ?? 'delete';
      if (effect === 'delete' || effect === 'throw-after-delete') files.delete(p);
      if (effect === 'throw' || effect === 'throw-after-delete') throw errno('EBUSY');
    }),
  } satisfies BlobRemovalFs;
  return { fs, files };
}

describe('classifyRemoval', () => {
  it('таблица исходов по двум наблюдениям', () => {
    expect(classifyRemoval(true, false)).toBe('removed');
    expect(classifyRemoval(false, false)).toBe('already_absent');
    expect(classifyRemoval(true, true)).toBe('failed');
    expect(classifyRemoval(false, true)).toBe('failed');
  });

  it('литералы исходов совпадают с вердиктом 3 (и PURGE_PATH_ACTIONS g1a)', () => {
    expect([...BLOB_REMOVAL_ACTIONS]).toEqual(['removed', 'already_absent', 'failed']);
  });
});

describe('removeWithProof', () => {
  it('файл был и исчез → removed, bytesFreed = размер до rm', async () => {
    const { fs, files } = fakeFs({ files: { [PATH]: 4096 } });
    const out = await removeWithProof(fs, PATH, REF);
    expect(out).toEqual({ storageRef: REF, beforeExists: true, afterExists: false, action: 'removed', bytesFreed: 4096 });
    expect(fs.rm).toHaveBeenCalledTimes(1);
    expect(fs.stat).toHaveBeenCalledTimes(2);
    expect(files.has(PATH)).toBe(false);
  });

  it('файла не было → already_absent, rm не зовётся', async () => {
    const { fs } = fakeFs({});
    const out = await removeWithProof(fs, PATH, REF);
    expect(out).toEqual({ storageRef: REF, beforeExists: false, afterExists: false, action: 'already_absent', bytesFreed: 0 });
    expect(fs.rm).toHaveBeenCalledTimes(0);
  });

  it('rm вернулся без ошибки, но файл остался → failed (afterExists = true)', async () => {
    const { fs } = fakeFs({ files: { [PATH]: 10 }, rmEffect: 'noop' });
    const out = await removeWithProof(fs, PATH, REF);
    expect(out.action).toBe('failed');
    expect(out.beforeExists).toBe(true);
    expect(out.afterExists).toBe(true);
    expect(out.bytesFreed).toBe(0);
    expect(out.error).toBe('after_exists');
  });

  it('rm бросил и файл остался → failed с кодом rm', async () => {
    const { fs } = fakeFs({ files: { [PATH]: 10 }, rmEffect: 'throw' });
    const out = await removeWithProof(fs, PATH, REF);
    expect(out).toMatchObject({ action: 'failed', afterExists: true, bytesFreed: 0, error: 'rm:EBUSY' });
  });

  it('rm бросил, но файла после нет → removed: исход решает stat, не код rm', async () => {
    const { fs } = fakeFs({ files: { [PATH]: 7 }, rmEffect: 'throw-after-delete' });
    const out = await removeWithProof(fs, PATH, REF);
    expect(out).toEqual({ storageRef: REF, beforeExists: true, afterExists: false, action: 'removed', bytesFreed: 7 });
  });

  it('stat до упал (не ENOENT) → failed, rm не зовётся, «не смог посмотреть» ≠ «нет файла»', async () => {
    const { fs } = fakeFs({ files: { [PATH]: 10 }, statErrors: { 1: 'EACCES' } });
    const out = await removeWithProof(fs, PATH, REF);
    expect(out).toMatchObject({ action: 'failed', beforeExists: true, afterExists: true, error: 'stat_before:EACCES' });
    expect(fs.rm).toHaveBeenCalledTimes(0);
  });

  it('stat после упал → failed, bytesFreed 0', async () => {
    const { fs } = fakeFs({ files: { [PATH]: 10 }, statErrors: { 2: 'EIO' } });
    const out = await removeWithProof(fs, PATH, REF);
    expect(out).toMatchObject({ action: 'failed', beforeExists: true, afterExists: true, bytesFreed: 0, error: 'stat_after:EIO' });
  });

  it('файла не было, но после появился → failed', async () => {
    const { fs, files } = fakeFs({});
    fs.stat.mockImplementationOnce(async () => null).mockImplementationOnce(async () => {
      files.set(PATH, 1);
      return { size: 1 };
    });
    const out = await removeWithProof(fs, PATH, REF);
    expect(out).toMatchObject({ action: 'failed', beforeExists: false, afterExists: true, error: 'after_exists' });
    expect(fs.rm).toHaveBeenCalledTimes(0);
  });

  it('исход не несёт полного пути файла (наружу только storageRef)', async () => {
    const { fs } = fakeFs({ files: { [PATH]: 10 }, rmEffect: 'throw' });
    const out = await removeWithProof(fs, PATH, REF);
    expect(JSON.stringify(out)).not.toContain('/blobs/');
  });
});
