/**
 * Зубы BlobStorageService на настоящем диске (временный каталог), #2632 g2.
 *
 * DoD плана: `removeWithProof` различает removed / already_absent / failed по stat до и после;
 * старый `delete` не меняет поведение для живых вызовов (каталог, уборка b5): отсутствие файла —
 * не ошибка, выход из корня — ошибка.
 */
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AppConfig } from '../config/env.schema';
import { BlobStorageService, nodeBlobRemovalFs } from './blob-storage.service';

let root: string;
let svc: BlobStorageService;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'membrana-blob-g2-'));
  svc = new BlobStorageService({ MEDIA_BLOB_DIR: root } as AppConfig);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

describe('BlobStorageService.delete — прежнее поведение', () => {
  it('удаляет существующий файл', async () => {
    await svc.write('d-1/s-1.wav', Buffer.from('abc'));
    await svc.delete('d-1/s-1.wav');
    expect(await exists(join(root, 'd-1', 's-1.wav'))).toBe(false);
  });

  it('отсутствующий файл — без ошибки (force)', async () => {
    await expect(svc.delete('d-1/none.wav')).resolves.toBeUndefined();
  });

  it('выход из корня — ошибка', async () => {
    await expect(svc.delete('../escape.wav')).rejects.toThrow('Invalid storageRef path');
  });
});

describe('BlobStorageService.removeWithProof — настоящий диск', () => {
  it('файл был → removed, размер освобождён, файла нет', async () => {
    await svc.write('d-1/s-1.wav', Buffer.alloc(1234));
    const out = await svc.removeWithProof('d-1/s-1.wav');
    expect(out).toEqual({ storageRef: 'd-1/s-1.wav', beforeExists: true, afterExists: false, action: 'removed', bytesFreed: 1234 });
    expect(await exists(join(root, 'd-1', 's-1.wav'))).toBe(false);
  });

  it('повтор по тому же пути → already_absent (идемпотентно)', async () => {
    await svc.write('d-1/s-1.wav', Buffer.alloc(8));
    await svc.removeWithProof('d-1/s-1.wav');
    const again = await svc.removeWithProof('d-1/s-1.wav');
    expect(again).toEqual({ storageRef: 'd-1/s-1.wav', beforeExists: false, afterExists: false, action: 'already_absent', bytesFreed: 0 });
  });

  it('по пути каталог (rm без recursive не снимет) → failed, каталог цел', async () => {
    await mkdir(join(root, 'd-1', 'dir.wav'), { recursive: true });
    await writeFile(join(root, 'd-1', 'dir.wav', 'inner'), 'x');
    const out = await svc.removeWithProof('d-1/dir.wav');
    expect(out.action).toBe('failed');
    expect(out.beforeExists).toBe(true);
    expect(out.afterExists).toBe(true);
    expect(out.bytesFreed).toBe(0);
    expect(out.error).toMatch(/^rm:/);
    expect(await exists(join(root, 'd-1', 'dir.wav', 'inner'))).toBe(true);
  });

  it('выход из корня — ошибка, как у прочих методов', async () => {
    await expect(svc.removeWithProof('../escape.wav')).rejects.toThrow('Invalid storageRef path');
  });

  it('подставной диск: rm «успешен», файл остался → failed', async () => {
    const stuck = { ...nodeBlobRemovalFs, rm: async () => undefined };
    await svc.write('d-1/s-1.wav', Buffer.alloc(3));
    const out = await svc.removeWithProof('d-1/s-1.wav', stuck);
    expect(out).toMatchObject({ action: 'failed', afterExists: true, error: 'after_exists' });
  });
});

describe('nodeBlobRemovalFs.stat', () => {
  it('ENOENT → null, есть → размер', async () => {
    expect(await nodeBlobRemovalFs.stat(join(root, 'none'))).toBeNull();
    await writeFile(join(root, 'f'), 'hello');
    expect(await nodeBlobRemovalFs.stat(join(root, 'f'))).toEqual({ size: 5 });
  });
});
