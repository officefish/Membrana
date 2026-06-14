import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MediaBridgeService,
  type MediaQuotaResponse,
  type MediaSampleSummary,
} from '../pair/media-bridge.service';
import { TARIFF_DATASET_COLLECTION_ID } from './sample-library.constants';
import type {
  MembraneCatalogDto,
  MembraneCatalogSampleDto,
  MembraneNodeLibraryDto,
  MediaSessionDto,
  NodeQuotaSummaryDto,
} from './sample-library.dto';

function mapQuota(quota: MediaQuotaResponse): NodeQuotaSummaryDto {
  return {
    userStorage: {
      usedBytes: quota.userStorage.usedBytes,
      limitBytes: quota.userStorage.limitBytes,
    },
    buffer: {
      usedBytes: quota.buffer.usedBytes,
      limitBytes: quota.buffer.limitBytes,
    },
    dataset: {
      catalogId: quota.dataset.catalogId,
      sampleCount: quota.dataset.sampleCount,
    },
  };
}

function mapCatalogSample(row: MediaSampleSummary): MembraneCatalogSampleDto {
  return {
    id: row.id,
    title: row.title,
    class: row.class,
    label: row.label,
    durationSec: row.durationSec,
    sampleRate: row.sampleRate,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class SampleLibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaBridge: MediaBridgeService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async listNodes(userId: string, membraneId: string): Promise<{ nodes: MembraneNodeLibraryDto[] }> {
    const membrane = await this.requireOwnedMembrane(userId, membraneId);
    const nodes = await this.prisma.node.findMany({
      where: { membraneId: membrane.id },
      include: { device: true },
      orderBy: { createdAt: 'asc' },
    });

    const mapped = await Promise.all(
      nodes.map(async (node) => {
        const deviceId = node.device?.mediaDeviceId ?? null;
        let quota: NodeQuotaSummaryDto | null = null;
        if (deviceId) {
          const raw = await this.mediaBridge.getQuota(deviceId);
          quota = raw ? mapQuota(raw) : null;
        }
        return {
          id: node.id,
          label: node.label,
          deviceId,
          paired: Boolean(deviceId),
          lastPairedAt: node.device?.pairedAt.toISOString() ?? null,
          lastSeenAt: node.device?.lastSeenAt.toISOString() ?? null,
          quota,
        };
      }),
    );

    return { nodes: mapped };
  }

  async getCatalog(userId: string, membraneId: string): Promise<MembraneCatalogDto> {
    const membrane = await this.requireOwnedMembrane(userId, membraneId, true);
    const catalogId = membrane.tariff.datasetCatalogId;
    const sourceDeviceId = await this.findRepresentativeDeviceId(membrane.id);

    if (!sourceDeviceId) {
      return { catalogId, sampleCount: 0, samples: [], sourceDeviceId: null };
    }

    const rows = await this.mediaBridge.listSamples(sourceDeviceId, TARIFF_DATASET_COLLECTION_ID);
    return {
      catalogId,
      sampleCount: rows.length,
      samples: rows.map(mapCatalogSample),
      sourceDeviceId,
    };
  }

  async getMediaSession(userId: string): Promise<MediaSessionDto> {
    const membrane = await this.prisma.membrane.findUnique({
      where: { userId },
      include: {
        tariff: true,
        nodes: { include: { device: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!membrane) {
      throw new NotFoundException('Membrane not found');
    }

    const devices = membrane.nodes
      .filter((n) => n.device?.mediaDeviceId)
      .map((n) => ({
        nodeId: n.id,
        nodeLabel: n.label,
        deviceId: n.device!.mediaDeviceId,
      }));

    return {
      mediaApiUrl: this.config.MEDIA_PUBLIC_API_URL,
      mediaToken: this.config.MEDIA_API_TOKEN,
      membraneId: membrane.id,
      catalogId: membrane.tariff.datasetCatalogId,
      devices,
    };
  }

  /** Picks first paired device for membrane-level catalog reads (blobs identical per DS5). */
  async findRepresentativeDeviceId(membraneId: string): Promise<string | null> {
    const node = await this.prisma.node.findFirst({
      where: { membraneId, device: { isNot: null } },
      include: { device: true },
      orderBy: { createdAt: 'asc' },
    });
    return node?.device?.mediaDeviceId ?? null;
  }

  private async requireOwnedMembrane(
    userId: string,
    membraneId: string,
    withTariff?: false,
  ): Promise<{ id: string; userId: string; tariffId: string; createdAt: Date }>;
  private async requireOwnedMembrane(
    userId: string,
    membraneId: string,
    withTariff: true,
  ): Promise<{
    id: string;
    userId: string;
    tariffId: string;
    createdAt: Date;
    tariff: { datasetCatalogId: string };
  }>;
  private async requireOwnedMembrane(
    userId: string,
    membraneId: string,
    withTariff = false,
  ) {
    const membrane = await this.prisma.membrane.findUnique({
      where: { id: membraneId },
      include: withTariff ? { tariff: true } : undefined,
    });
    if (!membrane) {
      throw new NotFoundException('Membrane not found');
    }
    if (membrane.userId !== userId) {
      throw new ForbiddenException('Membrane access denied');
    }
    return membrane;
  }
}
