import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { AudioIngestService } from '../../audio/audio-ingest.service';
import { BlobStorageService } from '../../blob/blob-storage.service';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { FREE_V1_CATALOG_ID } from '../../lib/catalog-ids';
import { loadCatalogManifest, type CatalogManifestEntry } from '../../lib/catalog-manifest';
import { resolveCatalogRoot } from '../../lib/catalog-paths';
import {
  TARIFF_DATASET_COLLECTION_ID,
} from '../../lib/collection-ids';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveDeviceLimits } from '../devices/device-limits';
import { CollectionsService } from './collections.service';

export interface CatalogProvisionResult {
  catalogId: string;
  seeded: number;
  skipped: number;
  total: number;
}

@Injectable()
export class CatalogProvisionService {
  private readonly logger = new Logger(CatalogProvisionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly collections: CollectionsService,
    private readonly blobs: BlobStorageService,
    private readonly audio: AudioIngestService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /**
   * Idempotent: seeds missing free-v1 samples into `__tariff_dataset__`.
   * Catalog blobs do not count toward user storage quota.
   */
  async provisionTariffCatalogIfNeeded(deviceId: string): Promise<CatalogProvisionResult> {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    const limits = resolveDeviceLimits(device, this.config);
    if (limits.datasetCatalogId !== FREE_V1_CATALOG_ID) {
      return {
        catalogId: limits.datasetCatalogId,
        seeded: 0,
        skipped: 0,
        total: 0,
      };
    }

    await this.collections.ensureReserved(deviceId);

    const catalogRoot = resolveCatalogRoot(this.config);
    let manifest;
    try {
      manifest = await loadCatalogManifest(catalogRoot);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ServiceUnavailableException(
        `Tariff catalog manifest unavailable at ${catalogRoot}: ${msg}`,
      );
    }

    if (manifest.catalogId !== FREE_V1_CATALOG_ID) {
      throw new ServiceUnavailableException(
        `Catalog root mismatch: expected ${FREE_V1_CATALOG_ID}, got ${manifest.catalogId}`,
      );
    }

    const existing = await this.prisma.sample.findMany({
      where: { deviceId, collectionId: TARIFF_DATASET_COLLECTION_ID },
      select: { title: true },
    });
    const existingIds = new Set(existing.map((row) => row.title));

    let seeded = 0;
    let skipped = 0;
    for (const entry of manifest.samples) {
      if (existingIds.has(entry.id)) {
        skipped += 1;
        continue;
      }
      await this.importCatalogEntry(deviceId, catalogRoot, entry);
      seeded += 1;
      existingIds.add(entry.id);
    }

    if (seeded > 0) {
      this.logger.log(
        `Provisioned ${seeded} catalog samples for device ${deviceId} (${skipped} skipped)`,
      );
    }

    return {
      catalogId: FREE_V1_CATALOG_ID,
      seeded,
      skipped,
      total: manifest.samples.length,
    };
  }

  private async importCatalogEntry(
    deviceId: string,
    catalogRoot: string,
    entry: CatalogManifestEntry,
  ): Promise<void> {
    const filePath = join(catalogRoot, entry.path);
    const fileBuffer = await readFile(filePath);
    const parsed = await this.audio.parseUpload(fileBuffer, 'audio/wav');

    const sampleId = randomUUID();
    const storageRef = this.blobs.buildStorageRef(deviceId, sampleId, parsed.audioFormat);
    await this.blobs.write(storageRef, fileBuffer);

    try {
      await this.prisma.sample.create({
        data: {
          id: sampleId,
          deviceId,
          collectionId: TARIFF_DATASET_COLLECTION_ID,
          title: entry.id,
          class: entry.class,
          label: entry.label,
          source: 'catalog',
          durationSec: entry.durationSec ?? parsed.durationSec,
          sampleRate: entry.sampleRate ?? parsed.sampleRate,
          channels: parsed.channels,
          audioFormat: parsed.audioFormat,
          contentType: parsed.contentType,
          sizeBytes: parsed.sizeBytes,
          storageRef,
          notes: entry.notes ?? undefined,
        },
      });
    } catch (err) {
      await this.blobs.delete(storageRef);
      throw err;
    }
  }
}
