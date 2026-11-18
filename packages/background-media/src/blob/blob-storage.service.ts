import { Inject, Injectable } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { AppConfig } from '../config/env.schema';
import { APP_CONFIG } from '../config/config.tokens';
import { type BlobRemovalFs, type BlobRemovalOutcome, removeWithProof } from './blob-removal-proof';

/** Диск для доказательства удаления: ENOENT → null, прочие ошибки наружу (их судит proof). */
export const nodeBlobRemovalFs: BlobRemovalFs = {
  async stat(fullPath) {
    try {
      const st = await stat(fullPath);
      return { size: st.size };
    } catch (err) {
      if ((err as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') return null;
      throw err;
    }
  },
  async rm(fullPath) {
    await rm(fullPath, { force: true });
  },
};

@Injectable()
export class BlobStorageService {
  private readonly rootDir: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.rootDir = resolve(config.MEDIA_BLOB_DIR);
  }

  resolvePath(storageRef: string): string {
    const full = resolve(this.rootDir, storageRef);
    if (!full.startsWith(this.rootDir)) {
      throw new Error('Invalid storageRef path');
    }
    return full;
  }

  buildStorageRef(deviceId: string, sampleId: string, ext: string): string {
    return join(deviceId, `${sampleId}.${ext}`);
  }

  async write(storageRef: string, data: Buffer): Promise<void> {
    const full = this.resolvePath(storageRef);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  createReadStream(storageRef: string): ReturnType<typeof createReadStream> {
    return createReadStream(this.resolvePath(storageRef));
  }

  async readBuffer(storageRef: string): Promise<Buffer> {
    return readFile(this.resolvePath(storageRef));
  }

  /**
   * Прежнее удаление без доказательства — поведение для живых вызовов (каталог, уборка b5) не
   * меняется. Уборщику с журналом — `removeWithProof`.
   */
  async delete(storageRef: string): Promise<void> {
    const full = this.resolvePath(storageRef);
    await rm(full, { force: true });
  }

  /**
   * Удаление с доказательством (#2632 g2): stat до и после, исход removed / already_absent / failed.
   * Не бросает на ошибках диска — они становятся исходом `failed`; бросает только на недопустимом
   * `storageRef` (выход из корня), как и прочие методы.
   */
  async removeWithProof(storageRef: string, fs: BlobRemovalFs = nodeBlobRemovalFs): Promise<BlobRemovalOutcome> {
    return removeWithProof(fs, this.resolvePath(storageRef), storageRef);
  }
}
