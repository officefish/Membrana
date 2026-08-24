import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ingestWindowGauge } from '../health-deep/ingest-window.gauge';
import type {
  CreateTelemetryLiveRecordDto,
  CreateTelemetryReportDto,
  UpdateTelemetryLiveRecordDto,
} from './journal.dto';
import { cabinetRowsToLiveJournalItems, type LiveJournalItemRow } from './live-journal-items.mapper';
import {
  LIVE_JOURNAL_PAGE_SIZE,
  countLiveJournalItemRowFilters,
  matchesLiveJournalItemRowFilter,
  paginateLiveJournalItemRows,
  parseLiveJournalFilter,
  type LiveJournalFilterCounts,
} from './live-journal-pagination';

const DEFAULT_LIST_LIMIT = LIVE_JOURNAL_PAGE_SIZE;
const MAX_LIST_LIMIT = LIVE_JOURNAL_PAGE_SIZE;
/** Max DB rows loaded when building merged journal (JS1). Not the UI page size. */
export const JOURNAL_INTERNAL_FETCH_CAP = 5000;
const TELEMETRY_TRACK_SCHEMA_VERSION = 'telemetry-track/v1';
const LIVE_JOURNAL_REPORT_KINDS = [
  'drone-detection-report/v1',
  'drone-detection-brief/v1',
];

/** Parses list query limit for journal endpoints. */
export function parseJournalListLimit(raw: string | undefined): number {
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_LIST_LIMIT;
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIST_LIMIT;
  return Math.min(n, MAX_LIST_LIMIT);
}

function parseLimit(raw: string | undefined): number {
  return parseJournalListLimit(raw);
}

function parseSince(raw: string | undefined): Date | null {
  if (!raw) return null;
  const timestamp = Number(raw);
  if (!Number.isFinite(timestamp) || timestamp < 0) return null;
  return new Date(timestamp);
}

function decodeCursor(raw?: string): { timestamp: number; clientEntryId: string } | null {
  if (!raw) return null;
  const separator = raw.indexOf(':');
  if (separator <= 0) return null;
  const timestamp = Number(raw.slice(0, separator));
  const clientEntryId = decodeURIComponent(raw.slice(separator + 1));
  if (!Number.isFinite(timestamp) || clientEntryId.length === 0) return null;
  return { timestamp, clientEntryId };
}

interface MembraneContext {
  membraneId: string;
  nodeId: string | null;
  mediaDeviceId: string | null;
  deviceIds: readonly string[];
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
    // Write-path датчик /health/deep: запись доехала (кусок D #2121, M2).
    ingestWindowGauge.recordArrived();
    return { report: serializeReport(created), deduplicated: false as const };
  }

  async listReports(userId: string, limitRaw?: string, mediaDeviceId?: string) {
    const ctx = await this.requireMembraneContext(userId);
    const deviceFilter = this.resolveMediaDeviceFilter(ctx, mediaDeviceId);
    const rows = await this.prisma.telemetryReport.findMany({
      where: {
        membraneId: ctx.membraneId,
        ...(deviceFilter ? { mediaDeviceId: deviceFilter } : {}),
      },
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
    // Write-path датчик /health/deep: запись доехала (кусок D #2121, M2).
    ingestWindowGauge.recordArrived();
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

  async listLiveRecords(userId: string, limitRaw?: string, mediaDeviceId?: string) {
    const ctx = await this.requireMembraneContext(userId);
    const deviceFilter = this.resolveMediaDeviceFilter(ctx, mediaDeviceId);
    const rows = await this.prisma.telemetryLiveRecord.findMany({
      where: {
        membraneId: ctx.membraneId,
        ...(deviceFilter ? { mediaDeviceId: deviceFilter } : {}),
      },
      orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
      take: parseLimit(limitRaw),
    });
    return { liveRecords: rows.map(serializeLiveRecord) };
  }

  /** Unified live journal items: TelemetryTrack rows + drone reports (TJ6, TJ9). */
  async listJournalItems(
    userId: string,
    limitRaw?: string,
    mediaDeviceId?: string,
    cursor?: string,
    filterRaw?: string,
    sinceRaw?: string,
  ): Promise<{
    items: ReturnType<typeof paginateLiveJournalItemRows>['items'];
    nextCursor: string | null;
    counts: LiveJournalFilterCounts;
  }> {
    const ctx = await this.requireMembraneContext(userId);
    const pageSize = parseLimit(limitRaw);
    const filter = parseLiveJournalFilter(filterRaw);
    const deviceFilter = this.resolveMediaDeviceFilter(ctx, mediaDeviceId);
    const decodedCursor = decodeCursor(cursor);
    const since = parseSince(sinceRaw);
    const take = pageSize + 1;

    const [counts, reportRows, liveRows] = await Promise.all([
      this.countJournalFilters(ctx, deviceFilter),
      filter === 'tracks'
        ? Promise.resolve([])
        : this.prisma.telemetryReport.findMany({
            where: this.buildReportJournalWhere(ctx, deviceFilter, {
              cursor: decodedCursor,
              since,
              detectionsOnly: filter === 'detections',
            }),
            orderBy: [{ finishedAt: 'desc' }, { clientEntryId: 'desc' }],
            take,
          }),
      filter === 'reports' || filter === 'detections'
        ? Promise.resolve([])
        : this.prisma.telemetryLiveRecord.findMany({
            where: this.buildLiveJournalWhere(ctx, deviceFilter, {
              cursor: decodedCursor,
              since,
            }),
            orderBy: [{ startedAt: 'desc' }, { clientRecordId: 'desc' }],
            take,
          }),
    ]);

    const merged = cabinetRowsToLiveJournalItems(
      reportRows.map(serializeReport),
      liveRows.map(serializeLiveRecord),
    );
    const page = paginateLiveJournalItemRows(merged, {
      limit: pageSize,
      filter,
    });
    return { items: page.items, nextCursor: page.nextCursor, counts };
  }

  /**
   * Лента пользователя ЦЕЛИКОМ, без пагинации.
   *
   * ЗАЧЕМ ОТДЕЛЬНЫЙ ВХОД. `listJournalItems` — вход ПОКАЗА: он режет ленту страницей, потому что
   * человек смотрит по одной. Проверке задания плагина нужна обратная вещь — вся лента разом,
   * чтобы сказать, существует ли присланный адрес. Через страничный вход это выражается только
   * обходом курсором, а обход перечитывал бы ленту заново на каждой странице: склейка происходит
   * ЗДЕСЬ, в памяти, и пагинация применяется к уже готовому списку.
   *
   * Вещдок 22.08: читатель проверки просил страницу на `'500'`, `parseLimit` молча срезал до 50
   * (`MAX_LIST_LIMIT = LIVE_JOURNAL_PAGE_SIZE`), дом видел 50 записей из 1301 и трижды отказал
   * боевому прогону причиной `entry-not-found`. Отказ был ПРАВИЛЬНЫМ — врал вызывающий.
   *
   * ПОТОЛОК ОСТАЁТСЯ И НАЗВАН: `JOURNAL_INTERNAL_FETCH_CAP` строк на таблицу. Он честный —
   * объявлен константой и не подменяется на лету, — но однажды упрётся, и тогда проверка снова
   * начнёт врать. Поэтому он объявлен и в `plugin-host/MODULE_INTERFACE.md`, а не только тут.
   */
  async listAllJournalItems(
    userId: string,
    mediaDeviceId?: string,
  ): Promise<{ items: LiveJournalItemRow[]; counts: LiveJournalFilterCounts }> {
    const [reportsResult, liveResult] = await Promise.all([
      this.fetchReportsForMerge(userId, mediaDeviceId),
      this.fetchLiveRecordsForMerge(userId, mediaDeviceId),
    ]);
    const merged = cabinetRowsToLiveJournalItems(reportsResult.reports, liveResult.liveRecords);
    return { items: merged, counts: countLiveJournalItemRowFilters(merged) };
  }

  private async countJournalFilters(
    ctx: MembraneContext,
    deviceFilter: string | undefined,
  ): Promise<LiveJournalFilterCounts> {
    const [tracks, reports, detections] = await Promise.all([
      this.prisma.telemetryLiveRecord.count({
        where: this.buildLiveJournalWhere(ctx, deviceFilter),
      }),
      this.prisma.telemetryReport.count({
        where: this.buildReportJournalWhere(ctx, deviceFilter),
      }),
      this.prisma.telemetryReport.count({
        where: this.buildReportJournalWhere(ctx, deviceFilter, { detectionsOnly: true }),
      }),
    ]);
    return {
      all: tracks + reports,
      tracks,
      reports,
      detections,
    };
  }

  private buildReportJournalWhere(
    ctx: MembraneContext,
    deviceFilter: string | undefined,
    options: {
      cursor?: { timestamp: number; clientEntryId: string } | null;
      since?: Date | null;
      detectionsOnly?: boolean;
    } = {},
  ): Prisma.TelemetryReportWhereInput {
    const and: Prisma.TelemetryReportWhereInput[] = [];
    if (options.since) {
      and.push({ finishedAt: { gte: options.since } });
    }
    if (options.cursor) {
      const cursorDate = new Date(options.cursor.timestamp);
      and.push({
        OR: [
          { finishedAt: { lt: cursorDate } },
          {
            finishedAt: cursorDate,
            clientEntryId: { lt: options.cursor.clientEntryId },
          },
        ],
      });
    }
    return {
      membraneId: ctx.membraneId,
      reportKind: { in: LIVE_JOURNAL_REPORT_KINDS },
      ...(deviceFilter ? { mediaDeviceId: deviceFilter } : {}),
      ...(options.detectionsOnly ? { tags: { has: 'detection' } } : {}),
      ...(and.length > 0 ? { AND: and } : {}),
    };
  }

  private buildLiveJournalWhere(
    ctx: MembraneContext,
    deviceFilter: string | undefined,
    options: {
      cursor?: { timestamp: number; clientEntryId: string } | null;
      since?: Date | null;
    } = {},
  ): Prisma.TelemetryLiveRecordWhereInput {
    const and: Prisma.TelemetryLiveRecordWhereInput[] = [];
    if (options.since) {
      and.push({ startedAt: { gte: options.since } });
    }
    if (options.cursor) {
      const cursorDate = new Date(options.cursor.timestamp);
      and.push({
        OR: [
          { startedAt: { lt: cursorDate } },
          {
            startedAt: cursorDate,
            clientRecordId: { lt: options.cursor.clientEntryId },
          },
        ],
      });
    }
    return {
      membraneId: ctx.membraneId,
      recordKind: TELEMETRY_TRACK_SCHEMA_VERSION,
      ...(deviceFilter ? { mediaDeviceId: deviceFilter } : {}),
      ...(and.length > 0 ? { AND: and } : {}),
    };
  }

  private async fetchReportsForMerge(userId: string, mediaDeviceId?: string) {
    const ctx = await this.requireMembraneContext(userId);
    const deviceFilter = this.resolveMediaDeviceFilter(ctx, mediaDeviceId);
    const rows = await this.prisma.telemetryReport.findMany({
      where: {
        membraneId: ctx.membraneId,
        ...(deviceFilter ? { mediaDeviceId: deviceFilter } : {}),
      },
      orderBy: { finishedAt: 'desc' },
      take: JOURNAL_INTERNAL_FETCH_CAP,
    });
    return { reports: rows.map(serializeReport) };
  }

  private async fetchLiveRecordsForMerge(userId: string, mediaDeviceId?: string) {
    const ctx = await this.requireMembraneContext(userId);
    const deviceFilter = this.resolveMediaDeviceFilter(ctx, mediaDeviceId);
    const rows = await this.prisma.telemetryLiveRecord.findMany({
      where: {
        membraneId: ctx.membraneId,
        ...(deviceFilter ? { mediaDeviceId: deviceFilter } : {}),
      },
      orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
      take: JOURNAL_INTERNAL_FETCH_CAP,
    });
    return { liveRecords: rows.map(serializeLiveRecord) };
  }

  /** Contextual bulk delete by live journal filter (JE5). */
  async deleteJournalItems(
    userId: string,
    filterRaw?: string,
    mediaDeviceId?: string,
  ): Promise<{ deleted: number }> {
    const filter = parseLiveJournalFilter(filterRaw);
    const ctx = await this.requireMembraneContext(userId);
    const deviceFilter = this.resolveMediaDeviceFilter(ctx, mediaDeviceId);

    const reportWhere = {
      membraneId: ctx.membraneId,
      ...(deviceFilter ? { mediaDeviceId: deviceFilter } : {}),
    };
    const recordWhere = {
      membraneId: ctx.membraneId,
      ...(deviceFilter ? { mediaDeviceId: deviceFilter } : {}),
    };

    const [reportRows, liveRows] = await Promise.all([
      this.prisma.telemetryReport.findMany({ where: reportWhere }),
      this.prisma.telemetryLiveRecord.findMany({ where: recordWhere }),
    ]);

    const merged = cabinetRowsToLiveJournalItems(
      reportRows.map(serializeReport),
      liveRows.map(serializeLiveRecord),
    );
    const targets = merged.filter((item) => matchesLiveJournalItemRowFilter(item, filter));
    const reportIds = targets.filter((item) => item.kind === 'report').map((item) => item.id);
    const recordIds = targets.filter((item) => item.kind === 'track').map((item) => item.id);

    let deleted = 0;
    if (reportIds.length > 0) {
      const result = await this.prisma.telemetryReport.deleteMany({
        where: { id: { in: reportIds }, membraneId: ctx.membraneId },
      });
      deleted += result.count;
    }
    if (recordIds.length > 0) {
      const result = await this.prisma.telemetryLiveRecord.deleteMany({
        where: { id: { in: recordIds }, membraneId: ctx.membraneId },
      });
      deleted += result.count;
    }

    return { deleted };
  }

  private resolveMediaDeviceFilter(
    ctx: MembraneContext,
    mediaDeviceId?: string,
  ): string | undefined {
    const trimmed = mediaDeviceId?.trim();
    if (!trimmed) return undefined;
    if (!ctx.deviceIds.includes(trimmed)) {
      throw new ForbiddenException('Unknown mediaDeviceId for this membrane');
    }
    return trimmed;
  }

  private async requireMembraneContext(userId: string): Promise<MembraneContext> {
    const membrane = await this.prisma.membrane.findUnique({
      where: { userId },
      include: { nodes: { include: { device: true } } },
    });
    if (!membrane) {
      throw new NotFoundException('Membrane not found');
    }
    const node = membrane.nodes[0];
    const deviceIds = membrane.nodes
      .map((entry) => entry.device?.mediaDeviceId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    return {
      membraneId: membrane.id,
      nodeId: node?.id ?? null,
      mediaDeviceId: node?.device?.mediaDeviceId ?? null,
      deviceIds,
    };
  }
}
