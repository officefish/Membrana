import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Collection, SampleLabel } from '../../prisma/client';
import { randomUUID } from 'node:crypto';
import { AudioIngestService } from '../../audio/audio-ingest.service';
import { decodeWavMono } from '../../audio/decode-wav-mono';
import { BlobStorageService } from '../../blob/blob-storage.service';
import { TARIFF_DATASET_SYSTEM_KEY } from '../../lib/collection-ids';
import {
  sampleSourceFromApi,
  sampleToDto,
  type SampleDto,
} from '../../lib/sample-dto';
import { buildPageMeta, type PageMeta } from '../../lib/pagination';
import { isPrismaUniqueViolation } from '../../lib/prisma-errors';
import { normalizeSampleLabel } from '../../lib/sample-label';
import { PrismaService } from '../../prisma/prisma.service';
import { CollectionsService } from '../collections/collections.service';
import { effectiveBufferPolicy } from '../devices/buffer-policy';
import { DevicesService, type DeviceQuotaDto } from '../devices/devices.service';
import {
  axisRefuses,
  buildBufferOverflowRefusal,
  resolveQuotaSubject,
  type BufferOverflowRefusal,
  type OverflowPolicy,
} from './buffer-overflow-refusal';
import { OverflowEpisodeRegistry } from './overflow-episode-registry';

/**
 * Политика для поля ответа `overflowPolicy` (шов B→A, адаптер A-1 контракта интеграции
 * `cowork-buffer-full-stop`). Источник — строка `Device`, которую `DevicesService.getQuota` уже
 * загрузил для квоты и пропустил через `effectiveBufferPolicy` (поле `bufferPolicy` ответа
 * `/quota` — канал B→C). Второго чтения базы нет; чистая функция B прогоняется ещё раз по тем же
 * данным: `⊥` и порча → `stop`, не падение (требование B), и умная очистка без полного S до
 * ответа не долетает.
 */
function overflowPolicyOf(quota: Pick<DeviceQuotaDto, 'bufferPolicy'>): OverflowPolicy {
  const carried = quota.bufferPolicy as { mode?: unknown; params?: unknown } | null | undefined;
  return effectiveBufferPolicy({ bufferPolicy: carried?.mode, bufferPolicyParams: carried?.params }).mode;
}

/**
 * Исход загрузки пробы: проба лежит ИЛИ доменный отказ «места нет» (вердикт M2, #2307).
 * Отказ — не исключение и не HTTP-ошибка: транспорт 200, клиент читает `reason`.
 */
export type SampleUploadOutcome =
  | { readonly ok: true; readonly sample: SampleDto }
  | BufferOverflowRefusal;

/**
 * Доменный отказ, доставленный исключением — для вызывающих, которые не умеют нести
 * объединение `SampleUploadOutcome` (`firebat-node` зовёт `upload()` и берёт `sample.id`).
 * Статус 200 — по конвенции 12.08: это исход, не поломка транспорта; Nest отдаст то же тело
 * `{ ok:false, reason, … }`, что и основная дверь. Предпочтительный путь — `uploadOrRefuse`.
 */
export class BufferOverflowRefusedException extends HttpException {
  constructor(readonly refusal: BufferOverflowRefusal) {
    super(refusal, HttpStatus.OK);
  }
}

export interface UploadMetaOverride {
  title?: string;
  class?: string;
  label?: SampleLabel;
  source?: string;
  durationSec?: number;
  sampleRate?: number;
  channels?: 1 | 2;
  notes?: string;
}

function assertDeclaredAudioMetaMatchesMeasured(meta: UploadMetaOverride | undefined, parsed: {
  readonly durationSec: number;
  readonly sampleRate: number;
  readonly channels: 1 | 2;
}): void {
  if (meta?.sampleRate !== undefined && meta.sampleRate !== parsed.sampleRate) {
    throw new BadRequestException(
      `Declared audio metadata mismatch: sampleRate ${meta.sampleRate} != measured ${parsed.sampleRate}`,
    );
  }
  if (meta?.channels !== undefined && meta.channels !== parsed.channels) {
    throw new BadRequestException(
      `Declared audio metadata mismatch: channels ${meta.channels} != measured ${parsed.channels}`,
    );
  }
  if (meta?.durationSec !== undefined && Math.abs(meta.durationSec - parsed.durationSec) > 0.05) {
    throw new BadRequestException(
      `Declared audio metadata mismatch: durationSec ${meta.durationSec} != measured ${parsed.durationSec}`,
    );
  }
}

export interface PatchSampleLabelInput {
  label?: string;
  notes?: string | null;
}

export interface UpdateLabelNotesOptions {
  /** Set by cabinet media-bridge when curator has admin role. */
  readonly catalogAdmin?: boolean;
}

export interface PaginatedSamplesDto extends PageMeta {
  items: SampleDto[];
}

@Injectable()
export class SamplesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collections: CollectionsService,
    private readonly devices: DevicesService,
    private readonly blobs: BlobStorageService,
    private readonly audio: AudioIngestService,
    private readonly episodes: OverflowEpisodeRegistry,
  ) {}

  async list(
    deviceId: string,
    collectionId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedSamplesDto> {
    await this.collections.getOwned(deviceId, collectionId);
    const where = { deviceId, collectionId };
    const skip = (page - 1) * limit;
    const [total, rows] = await Promise.all([
      this.prisma.sample.count({ where }),
      this.prisma.sample.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    return {
      items: rows.map(sampleToDto),
      ...buildPageMeta(total, page, limit),
    };
  }

  /**
   * Вторая дверь загрузки — совместимая сигнатура для `firebat-node` (результат задания = та же
   * загрузка, ADR-0027). Отказ по квоте — `BufferOverflowRefusedException` (200 + тело M2),
   * не 413: транспортный код квоту больше не описывает.
   */
  async upload(
    deviceId: string,
    collectionId: string,
    fileBuffer: Buffer,
    mimeType: string | undefined,
    meta?: UploadMetaOverride,
  ): Promise<SampleDto> {
    const outcome = await this.uploadOrRefuse(deviceId, collectionId, fileBuffer, mimeType, meta);
    if (outcome.ok) return outcome.sample;
    throw new BufferOverflowRefusedException(outcome);
  }

  /**
   * Основная дверь: проба лежит ИЛИ доменный отказ «места нет» с эпизодом (M2, #2307).
   *
   * Отказ чеканится mapper'ом `buffer-overflow-refusal.ts`; эпизод (`overflowId`/`overflowAt`)
   * открывается идемпотентно в `OverflowEpisodeRegistry` — 100 отказов подряд несут один id и
   * одно время. Успешная запись в ось закрывает её эпизод: сервер увидел место.
   *
   * `overflowPolicy` — эффективная политика прибора из той же строки `Device`, что и квота
   * (поле блока B; см. `overflowPolicyOf`).
   */
  async uploadOrRefuse(
    deviceId: string,
    collectionId: string,
    fileBuffer: Buffer,
    mimeType: string | undefined,
    meta?: UploadMetaOverride,
  ): Promise<SampleUploadOutcome> {
    const collection = await this.collections.getOwned(deviceId, collectionId);
    this.assertUploadAllowed(collection);

    const parsed = await this.audio.parseUpload(fileBuffer, mimeType);
    assertDeclaredAudioMetaMatchesMeasured(meta, parsed);
    const subject = resolveQuotaSubject(collection, TARIFF_DATASET_SYSTEM_KEY);
    if (subject) {
      const quota = await this.devices.getQuota(deviceId);
      if (axisRefuses(quota[subject], parsed.sizeBytes)) {
        return buildBufferOverflowRefusal({
          subject,
          quota,
          overflowPolicy: overflowPolicyOf(quota),
          episode: this.episodes.open(deviceId, subject),
        });
      }
    }

    const sampleId = randomUUID();
    const storageRef = this.blobs.buildStorageRef(
      deviceId,
      sampleId,
      parsed.audioFormat,
    );

    await this.blobs.write(storageRef, fileBuffer);

    try {
      const row = await this.prisma.sample.create({
        data: {
          id: sampleId,
          deviceId,
          collectionId,
          title: meta?.title ?? `Sample ${sampleId.slice(0, 8)}`,
          class: meta?.class ?? 'unclassified',
          label: meta?.label ?? 'unlabeled',
          source: meta?.source ? sampleSourceFromApi(meta.source) : 'disk_import',
          durationSec: parsed.durationSec,
          sampleRate: parsed.sampleRate,
          channels: parsed.channels,
          audioFormat: parsed.audioFormat,
          contentType: parsed.contentType,
          sizeBytes: parsed.sizeBytes,
          storageRef,
          notes: meta?.notes,
        },
      });
      // Проба легла — в оси было место; открытый эпизод переполнения (если был) закрыт.
      if (subject) this.episodes.release(deviceId, subject);
      return { ok: true, sample: sampleToDto(row) };
    } catch (err) {
      await this.blobs.delete(storageRef);
      if (isPrismaUniqueViolation(err)) {
        throw new ConflictException(
          'A sample with this title already exists in the collection',
        );
      }
      throw err;
    }
  }

  async getBlob(deviceId: string, sampleId: string): Promise<{
    stream: ReturnType<BlobStorageService['createReadStream']>;
    contentType: string;
  }> {
    const row = await this.getOwnedSample(deviceId, sampleId);
    return {
      stream: this.blobs.createReadStream(row.storageRef),
      contentType: row.contentType,
    };
  }

  /**
   * Run the full drone-detection-report/v1 (DDR2) for an owned sample (LP1b).
   * WAV-only: the Node decoder handles 16-bit PCM WAV (mic-buffer clips); other
   * formats are rejected with 422 until a Node PCM decoder is added.
   */
  async analyzeDroneDetection(deviceId: string, sampleId: string) {
    const row = await this.getOwnedSample(deviceId, sampleId);
    if (row.audioFormat !== 'wav') {
      throw new UnprocessableEntityException(
        `Server detailed report supports WAV only (got ${row.audioFormat})`,
      );
    }
    const bytes = await this.blobs.readBuffer(row.storageRef);
    const { samples, sampleRate } = decodeWavMono(bytes);
    // ESM-only orchestrator consumed from CJS NestJS via dynamic import.
    const { analyzeDroneDetectionDetailed } = await import(
      '@membrana/drone-detection-orchestrator-service'
    );
    const { report } = await analyzeDroneDetectionDetailed(samples, sampleRate, {
      sampleId: row.id,
      sampleTitle: row.title,
    });
    return report;
  }

  async delete(deviceId: string, sampleId: string): Promise<void> {
    const row = await this.getOwnedSample(deviceId, sampleId);
    if (row.collection.systemKey === TARIFF_DATASET_SYSTEM_KEY) {
      throw new BadRequestException('Cannot delete samples from tariff dataset collection');
    }
    await this.blobs.delete(row.storageRef);
    await this.prisma.sample.delete({ where: { id: sampleId } });
    // Место дали (сюда же приходит buffer-cleanup) — эпизод оси закрыт, следующий отказ = новый.
    this.releaseEpisodeOf(deviceId, row.collection);
  }

  async move(
    deviceId: string,
    sampleId: string,
    toCollectionId: string,
  ): Promise<SampleDto> {
    const toCollection = await this.collections.getOwned(deviceId, toCollectionId);
    const row = await this.getOwnedSample(deviceId, sampleId);
    if (row.collection.systemKey === TARIFF_DATASET_SYSTEM_KEY) {
      throw new BadRequestException('Cannot move samples from tariff dataset collection');
    }
    this.assertUploadAllowed(toCollection);
    if (row.collectionId === toCollectionId) {
      return sampleToDto(row);
    }
    const updated = await this.prisma.sample.update({
      where: { id: sampleId },
      data: {
        collectionId: toCollectionId,
        source: 'move',
      },
    });
    // Проба ушла из оси-источника — там появилось место.
    this.releaseEpisodeOf(deviceId, row.collection);
    return sampleToDto(updated);
  }

  async updateLabelNotes(
    deviceId: string,
    sampleId: string,
    patch: PatchSampleLabelInput,
    options: UpdateLabelNotesOptions = {},
  ): Promise<SampleDto> {
    const row = await this.getOwnedSample(deviceId, sampleId);
    const isTariff = row.collection.systemKey === TARIFF_DATASET_SYSTEM_KEY;

    if (isTariff && !options.catalogAdmin) {
      throw new ForbiddenException(
        'Tariff dataset label/notes require catalog admin (cabinet)',
      );
    }

    const data: { label?: SampleLabel; notes?: string | null } = {};
    if (patch.label !== undefined) {
      data.label = normalizeSampleLabel(patch.label);
    }
    if (patch.notes !== undefined) {
      data.notes = patch.notes;
    }

    if (isTariff && options.catalogAdmin) {
      await this.prisma.sample.updateMany({
        where: {
          collectionId: row.collectionId,
          title: row.title,
          collection: { systemKey: TARIFF_DATASET_SYSTEM_KEY },
        },
        data,
      });
      const refreshed = await this.prisma.sample.findFirst({
        where: { id: sampleId, deviceId },
      });
      if (!refreshed) {
        throw new NotFoundException(`Sample ${sampleId} not found for device`);
      }
      return sampleToDto(refreshed);
    }

    const updated = await this.prisma.sample.update({
      where: { id: sampleId },
      data,
    });
    return sampleToDto(updated);
  }

  private async getOwnedSample(deviceId: string, sampleId: string) {
    const row = await this.prisma.sample.findFirst({
      where: { id: sampleId, deviceId },
      include: { collection: true },
    });
    if (!row) {
      throw new NotFoundException(`Sample ${sampleId} not found for device`);
    }
    return row;
  }

  private releaseEpisodeOf(
    deviceId: string,
    collection: Pick<Collection, 'kind' | 'systemKey'>,
  ): void {
    const subject = resolveQuotaSubject(collection, TARIFF_DATASET_SYSTEM_KEY);
    if (subject) this.episodes.release(deviceId, subject);
  }

  private assertUploadAllowed(collection: Collection): void {
    if (collection.kind === 'system' && collection.systemKey === TARIFF_DATASET_SYSTEM_KEY) {
      throw new BadRequestException('Cannot upload to tariff dataset collection');
    }
  }
}
