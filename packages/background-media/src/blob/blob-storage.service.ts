import { Inject, Injectable } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { AppConfig } from '../config/env.schema';
import { APP_CONFIG } from '../config/config.tokens';

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

  async delete(storageRef: string): Promise<void> {
    const full = this.resolvePath(storageRef);
    await rm(full, { force: true });
  }
}
