import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, type Device, type DeviceKind } from '../../prisma/client';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { TARIFF_DATASET_SYSTEM_KEY } from '../../lib/collection-ids';
import { PrismaService } from '../../prisma/prisma.service';
import { NodeKeyService } from '../firebat-node/node-key.service';
import {
  SMART_CLEANUP_UNAVAILABLE_REASON,
  explainBufferPolicy,
  parseBufferPolicy,
  type BufferPolicy,
  type BufferPolicyDenyReason,
} from './buffer-policy';
import { resolveDeviceLimits } from './device-limits';

export interface QuotaBucketDto {
  usedBytes: number;
  limitBytes: number;
  backend: 'server';
}

export interface DatasetQuotaInfoDto {
  catalogId: string;
  sampleCount: number;
}

export interface DeviceQuotaDto {
  userStorage: QuotaBucketDto;
  buffer: QuotaBucketDto;
  dataset: DatasetQuotaInfoDto;
  userWorkspaces: {
    used: number;
    limit: number;
    backend: 'server';
  };
  /**
   * Эффективная политика переполнения (#2308, M1) — канал к прибору. Тот же ход, что квота:
   * отдельного опроса ради политики нет. Уже пропущена через `effectiveBufferPolicy`.
   */
  bufferPolicy: BufferPolicy;
}

export interface DeviceMembraneContext {
  membraneId: string;
  userStorageQuotaBytes: bigint | number | string;
  bufferQuotaBytes: bigint | number | string;
  datasetCatalogId: string;
  maxUserWorkspaces?: number;
  /**
   * Политика переполнения от origin (кабинет). Сырое значение — гейт проверяет ЭТОТ сервер,
   * а не доверяет тому, что кабинет уже проверил (M1: «проверяет сервер — кабинет при записи
   * И сервер записей при разноске»). Отсутствие поля — старый кабинет: политика не трогается.
   */
  bufferPolicy?: unknown;
}

/** Исход разноски контекста: доменный отказ по гейту параметров — не исключение (12.08). */
export type SyncMembraneContextResult =
  | { ok: true; device: Device; bufferPolicy: BufferPolicy }
  | { ok: false; reason: BufferPolicyDenyReason };

/** Как политика ложится в строку прибора. `stop` — параметры в DB NULL, ничего не протекает. */
function bufferPolicyColumns(policy: BufferPolicy) {
  return {
    bufferPolicy: policy.mode,
    bufferPolicyParams: policy.params === null ? Prisma.DbNull : { ...policy.params },
  };
}

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly nodeKeys: NodeKeyService,
  ) {}

  private readonly logger = new Logger(DevicesService.name);

  /**
   * Приборы, о которых warn «умная очистка в базе при выключенном гейте» уже сказан (#2318).
   * Память процесса, ключ — id прибора: `/quota` прибор читает ≥ 1/мин при удержании, и
   * warn на каждое чтение был бы не журналом, а шумом; один раз на прибор за жизнь процесса
   * — достаточно, чтобы оператор увидел строку, которой после backfill быть не должно.
   * Рестарт media повторит warn один раз — это законно: журнал новый.
   */
  private readonly smartCleanupGateWarned = new Set<string>();

  /**
   * Единственная дорога чтения политики в этом сервисе: fail-closed (`smart_cleanup` при
   * выключенном гейте → `stop`) делает чистая функция, здесь — только журнал с id прибора и
   * мембраны. Блок A (`samples.service.ts`) прогоняет ту же чистую функцию по уже эффективной
   * политике из `/quota` — второго журнала там нет намеренно: строка одна, warn один.
   */
  private effectivePolicyOf(device: Pick<Device, 'id' | 'membraneId' | 'bufferPolicy' | 'bufferPolicyParams'>): BufferPolicy {
    const { policy, fallback } = explainBufferPolicy(device);
    if (fallback === SMART_CLEANUP_UNAVAILABLE_REASON && !this.smartCleanupGateWarned.has(device.id)) {
      this.smartCleanupGateWarned.add(device.id);
      this.logger.warn(
        `прибор ${device.id} (мембрана ${device.membraneId ?? '—'}) хранит режим умной очистки, а алгоритма T12 нет — прибору уезжает stop (#2318, fail-closed)`,
      );
    }
    return policy;
  }

  async register(
    name: string,
    kind: DeviceKind,
    membraneContext?: DeviceMembraneContext,
  ): Promise<{ device: Device; clientKey: { raw: string; keyId: string; createdAt: Date } }> {
    // Регистрация — внутренний вход кабинета (ApiTokenGuard): неизвестная политика здесь —
    // нарушение контракта звонящим, а не доменный отказ, и уезжает 400. Без поля — DEFAULT
    // колонки (`stop`), а не догадка.
    let policyColumns = {};
    if (membraneContext && membraneContext.bufferPolicy !== undefined) {
      const parsed = parseBufferPolicy(membraneContext.bufferPolicy);
      if (!parsed.ok) {
        throw new BadRequestException(`buffer policy rejected: ${parsed.reason}`);
      }
      policyColumns = bufferPolicyColumns(parsed.policy);
    }
    const device = await this.prisma.device.create({
      data: {
        name,
        kind,
        ...(membraneContext
          ? {
              membraneId: membraneContext.membraneId,
              userStorageQuotaBytes: BigInt(membraneContext.userStorageQuotaBytes),
              bufferQuotaBytes: BigInt(membraneContext.bufferQuotaBytes),
              datasetCatalogId: membraneContext.datasetCatalogId,
              ...(membraneContext.maxUserWorkspaces !== undefined
                ? { maxUserWorkspaces: membraneContext.maxUserWorkspaces }
                : {}),
              ...policyColumns,
            }
          : {}),
      },
    });
    const issued = await this.nodeKeys.issue(device.id, { audience: 'client' });
    if (issued.outcome !== 'issued') {
      throw new Error(`Client media key was not issued for new device ${device.id}`);
    }
    return { device, clientKey: issued.key };
  }

  async issueClientKey(deviceId: string): Promise<{
    raw: string;
    keyId: string;
    createdAt: Date;
    rotatedFrom: string | null;
  }> {
    const issued = await this.nodeKeys.issue(deviceId, { audience: 'client', rotate: true });
    if (issued.outcome !== 'issued') {
      throw new Error(`Client media key was not issued for device ${deviceId}`);
    }
    return issued.key;
  }

  async revokeClientKey(deviceId: string) {
    return this.nodeKeys.revoke(deviceId, { audience: 'client' });
  }

  /**
   * Разноска контекста мембраны (квоты + политика переполнения, #2308).
   *
   * ГЕЙТ ПАРАМЕТРОВ ПРОВЕРЯЕТСЯ ЗДЕСЬ ВТОРОЙ РАЗ. Кабинет проверил при записи; сервер записей
   * проверяет при разноске, потому что именно ОН отдаёт политику прибору, и доверять чужой
   * проверке значило бы отдать прибору «умную очистку» с дырой по одной ошибке кабинета.
   * Отказ — доменный (`ok:false`), контекст квот при отказе НЕ пишется: половинная разноска
   * («квоты доехали, политика нет») нечитаема счётом `{updated, failed}` кабинета.
   */
  async syncMembraneContext(
    deviceId: string,
    membraneContext: DeviceMembraneContext,
  ): Promise<SyncMembraneContextResult> {
    const existing = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!existing) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    let policyColumns = {};
    if (membraneContext.bufferPolicy !== undefined) {
      const parsed = parseBufferPolicy(membraneContext.bufferPolicy);
      if (!parsed.ok) return { ok: false, reason: parsed.reason };
      policyColumns = bufferPolicyColumns(parsed.policy);
    }

    const device = await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        membraneId: membraneContext.membraneId,
        userStorageQuotaBytes: BigInt(membraneContext.userStorageQuotaBytes),
        bufferQuotaBytes: BigInt(membraneContext.bufferQuotaBytes),
        datasetCatalogId: membraneContext.datasetCatalogId,
        ...(membraneContext.maxUserWorkspaces !== undefined
          ? { maxUserWorkspaces: membraneContext.maxUserWorkspaces }
          : {}),
        ...policyColumns,
      },
    });
    return { ok: true, device, bufferPolicy: this.effectivePolicyOf(device) };
  }

  async getById(deviceId: string): Promise<Device | null> {
    return this.prisma.device.findUnique({ where: { id: deviceId } });
  }

  /**
   * Эффективная политика прибора — вход для блока A (`overflowPolicy` в ответе отказа).
   * Строка читается ЗАНОВО на каждый вызов: кеша нет по тому же свойству, что у квоты (#2281) —
   * разноска кабинета обязана быть видна прибору без перепривязки.
   */
  async getEffectiveBufferPolicy(deviceId: string): Promise<BufferPolicy> {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }
    return this.effectivePolicyOf(device);
  }

  async getQuota(deviceId: string): Promise<DeviceQuotaDto> {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    const limits = resolveDeviceLimits(device, this.config);

    const [rows, workspaceCount] = await Promise.all([
      this.prisma.sample.findMany({
        where: { deviceId },
        select: {
          sizeBytes: true,
          collection: { select: { kind: true, systemKey: true } },
        },
      }),
      this.prisma.deviceWorkspace.count({ where: { deviceId } }),
    ]);

    let userStorageUsed = 0;
    let bufferUsed = 0;
    let datasetSampleCount = 0;

    for (const row of rows) {
      const { kind, systemKey } = row.collection;
      if (kind === 'buffer') {
        bufferUsed += row.sizeBytes;
      } else if (kind === 'user' || (kind === 'system' && systemKey !== TARIFF_DATASET_SYSTEM_KEY)) {
        userStorageUsed += row.sizeBytes;
      } else if (kind === 'system' && systemKey === TARIFF_DATASET_SYSTEM_KEY) {
        datasetSampleCount += 1;
      }
    }

    return {
      userStorage: {
        usedBytes: userStorageUsed,
        limitBytes: limits.userStorageQuotaBytes,
        backend: 'server',
      },
      buffer: {
        usedBytes: bufferUsed,
        limitBytes: limits.bufferQuotaBytes,
        backend: 'server',
      },
      dataset: {
        catalogId: limits.datasetCatalogId,
        sampleCount: datasetSampleCount,
      },
      userWorkspaces: {
        used: workspaceCount,
        limit: limits.maxUserWorkspaces,
        backend: 'server',
      },
      bufferPolicy: this.effectivePolicyOf(device),
    };
  }
}
