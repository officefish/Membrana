import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateTelemetryLiveRecordDto,
  CreateTelemetryReportDto,
  UpdateTelemetryLiveRecordDto,
} from './journal.dto';

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

/** Parses list query limit for journal endpoints. */
export function parseJournalListLimit(raw: string | undefined): number {
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_LIST_LIMIT;
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIST_LIMIT;
  return Math.min(n, MAX_LIST_LIMIT);
}

function parseLimit(raw: string | undefined): number {
  return parseJournalListLimit(raw);
}

interface MembraneContext {
  membraneId: string;
  nodeId: string | null;
  mediaDeviceId: string | null;
}

function serializeReport(row: {
  id: string;
  reportKind: string;
  moduleId: string | null;
  moduleName: string | null;
  clientEntryId: string | null;
  finishedAt: Date;
  payload: Prisma.JsonValue;
  tags: string[];
  nodeId: string | null;
  mediaDeviceId: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    reportKind: row.reportKind,
    moduleId: row.moduleId,
    moduleName: row.moduleName,
    clientEntryId: row.clientEntryId,
    finishedAt: row.finishedAt.toISOString(),
    payload: row.payload,
    tags: row.tags,
    nodeId: row.nodeId,
    mediaDeviceId: row.mediaDeviceId,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeLiveRecord(row: {
  id: string;
  recordKind: string;
  moduleId: string | null;
  clientRecordId: string | null;
  status: 'active' | 'ended';
  startedAt: Date;
  endedAt: Date | null;
  payload: Prisma.JsonValue;
  nodeId: string | null;
  mediaDeviceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    recordKind: row.recordKind,
    moduleId: row.moduleId,
    clientRecordId: row.clientRecordId,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    payload: row.payload,
    nodeId: row.nodeId,
    mediaDeviceId: row.mediaDeviceId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(userId: string, body: CreateTelemetryReportDto) {
    const ctx = await this.requireMembraneContext(userId);
    const finishedAt = new Date(body.finishedAt);
    if (Number.isNaN(finishedAt.getTime())) {
      throw new ForbiddenException('Invalid finishedAt');
    }

    const data = {
      membraneId: ctx.membraneId,
      nodeId: ctx.nodeId,
      mediaDeviceId: ctx.mediaDeviceId,
      reportKind: body.reportKind.trim(),
      moduleId: body.moduleId?.trim() || null,
      moduleName: body.moduleName?.trim() || null,
      clientEntryId: body.clientEntryId?.trim() || null,
      finishedAt,
      payload: body.payload as Prisma.InputJsonValue,
      tags: body.tags ?? [],
    };

    if (data.clientEntryId) {
      const existing = await this.prisma.telemetryReport.findUnique({
        where: {
          membraneId_clientEntryId: {
            membraneId: ctx.membraneId,
            clientEntryId: data.clientEntryId,
          },
        },
      });
      if (existing) {
        return { report: serializeReport(existing), deduplicated: true as const };
      }
    }

    const created = await this.prisma.telemetryReport.create({ data });
    return { report: serializeReport(created), deduplicated: false as const };
  }

  async listReports(userId: string, limitRaw?: string) {
    const ctx = await this.requireMembraneContext(userId);
    const rows = await this.prisma.telemetryReport.findMany({
      where: { membraneId: ctx.membraneId },
      orderBy: { finishedAt: 'desc' },
      take: parseLimit(limitRaw),
    });
    return { reports: rows.map(serializeReport) };
  }

  async createLiveRecord(userId: string, body: CreateTelemetryLiveRecordDto) {
    const ctx = await this.requireMembraneContext(userId);
    const startedAt = new Date(body.startedAt);
    if (Number.isNaN(startedAt.getTime())) {
      throw new ForbiddenException('Invalid startedAt');
    }

    const clientRecordId = body.clientRecordId?.trim() || null;
    if (clientRecordId) {
      const existing = await this.prisma.telemetryLiveRecord.findUnique({
        where: {
          membraneId_clientRecordId: {
            membraneId: ctx.membraneId,
            clientRecordId,
          },
        },
      });
      if (existing) {
        return { liveRecord: serializeLiveRecord(existing), deduplicated: true as const };
      }
    }

    const created = await this.prisma.telemetryLiveRecord.create({
      data: {
        membraneId: ctx.membraneId,
        nodeId: ctx.nodeId,
        mediaDeviceId: ctx.mediaDeviceId,
        recordKind: body.recordKind.trim(),
        moduleId: body.moduleId?.trim() || null,
        clientRecordId,
        startedAt,
        payload: body.payload as Prisma.InputJsonValue,
      },
    });
    return { liveRecord: serializeLiveRecord(created), deduplicated: false as const };
  }

  async updateLiveRecord(
    userId: string,
    recordId: string,
    body: UpdateTelemetryLiveRecordDto,
  ) {
    const ctx = await this.requireMembraneContext(userId);
    const existing = await this.prisma.telemetryLiveRecord.findUnique({
      where: { id: recordId },
    });
    if (!existing || existing.membraneId !== ctx.membraneId) {
      throw new NotFoundException('Live record not found');
    }

    let endedAt: Date | null | undefined;
    if (body.endedAt !== undefined) {
      const parsed = new Date(body.endedAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new ForbiddenException('Invalid endedAt');
      }
      endedAt = parsed;
    }

    const updated = await this.prisma.telemetryLiveRecord.update({
      where: { id: recordId },
      data: {
        ...(body.payload !== undefined
          ? { payload: body.payload as Prisma.InputJsonValue }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(endedAt !== undefined ? { endedAt } : {}),
        ...(body.status === 'ended' && endedAt === undefined && !existing.endedAt
          ? { endedAt: new Date() }
          : {}),
      },
    });
    return { liveRecord: serializeLiveRecord(updated) };
  }

  async listLiveRecords(userId: string, limitRaw?: string) {
    const ctx = await this.requireMembraneContext(userId);
    const rows = await this.prisma.telemetryLiveRecord.findMany({
      where: { membraneId: ctx.membraneId },
      orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
      take: parseLimit(limitRaw),
    });
    return { liveRecords: rows.map(serializeLiveRecord) };
  }

  private async requireMembraneContext(userId: string): Promise<MembraneContext> {
    const membrane = await this.prisma.membrane.findUnique({
      where: { userId },
      include: { nodes: { include: { device: true }, take: 1 } },
    });
    if (!membrane) {
      throw new NotFoundException('Membrane not found');
    }
    const node = membrane.nodes[0];
    return {
      membraneId: membrane.id,
      nodeId: node?.id ?? null,
      mediaDeviceId: node?.device?.mediaDeviceId ?? null,
    };
  }
}
