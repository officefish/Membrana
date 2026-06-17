import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  type NodeRealtimeEnvelope,
} from '../../domain/node-realtime-wire';
import { JournalService } from '../journal/journal.service';
import type { NodeRealtimeSocketMeta } from './node-realtime.service';
import { NodeRealtimeService } from './node-realtime.service';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJournalAppendPayload(payload: unknown): {
  kind: 'report' | 'track';
  clientEntryId: string;
  moduleId: string;
  moduleName: string;
  reportKind: string;
  finishedAt?: string;
  startedAt?: string;
  payload: Record<string, unknown>;
  tags?: string[];
  item?: Record<string, unknown>;
} {
  if (!isRecord(payload)) {
    throw new ForbiddenException('journal.append payload must be an object');
  }

  const kind = payload.kind === 'track' ? 'track' : payload.kind === 'report' ? 'report' : null;
  const clientEntryId = typeof payload.clientEntryId === 'string' ? payload.clientEntryId.trim() : '';
  const moduleId = typeof payload.moduleId === 'string' ? payload.moduleId.trim() : '';
  const moduleName = typeof payload.moduleName === 'string' ? payload.moduleName.trim() : '';
  const reportKind = typeof payload.reportKind === 'string' ? payload.reportKind.trim() : '';

  if (!kind || !clientEntryId || !moduleId || !reportKind) {
    throw new ForbiddenException('Invalid journal.append payload');
  }

  const basePayload = isRecord(payload.payload) ? payload.payload : {};
  const tags = Array.isArray(payload.tags)
    ? payload.tags.filter((tag): tag is string => typeof tag === 'string')
    : undefined;

  return {
    kind,
    clientEntryId,
    moduleId,
    moduleName: moduleName || moduleId,
    reportKind,
    finishedAt: typeof payload.finishedAt === 'string' ? payload.finishedAt : undefined,
    startedAt: typeof payload.startedAt === 'string' ? payload.startedAt : undefined,
    payload: basePayload,
    tags,
    item: isRecord(payload.item) ? payload.item : undefined,
  };
}

function parseJournalLiveSessionPayload(payload: unknown): {
  clientRecordId: string;
  moduleId: string;
  recordKind: string;
  startedAt: string;
  status: 'active' | 'ended';
  payload: Record<string, unknown>;
} {
  if (!isRecord(payload)) {
    throw new ForbiddenException('journal.liveSession payload must be an object');
  }

  const clientRecordId = typeof payload.clientRecordId === 'string' ? payload.clientRecordId.trim() : '';
  const moduleId = typeof payload.moduleId === 'string' ? payload.moduleId.trim() : '';
  const recordKind = typeof payload.recordKind === 'string' ? payload.recordKind.trim() : '';
  const startedAt = typeof payload.startedAt === 'string' ? payload.startedAt : '';
  const status = payload.status === 'ended' ? 'ended' : 'active';
  const inner = isRecord(payload.payload) ? payload.payload : {};

  if (!clientRecordId || !moduleId || !recordKind || !startedAt) {
    throw new ForbiddenException('Invalid journal.liveSession payload');
  }

  return {
    clientRecordId,
    moduleId,
    recordKind,
    startedAt,
    status,
    payload: inner,
  };
}

@Injectable()
export class NodeRealtimeJournalHandler {
  constructor(
    private readonly journalService: JournalService,
    private readonly realtimeService: NodeRealtimeService,
  ) {}

  async handleIncoming(meta: NodeRealtimeSocketMeta, envelope: NodeRealtimeEnvelope): Promise<void> {
    if (meta.role !== 'node' || !meta.mediaDeviceId) return;

    if (
      envelope.channel === 'journal' &&
      envelope.type === NODE_REALTIME_EVENT_TYPES.journal.append
    ) {
      await this.handleJournalAppend(meta, envelope);
      return;
    }

    if (
      envelope.channel === 'journal' &&
      envelope.type === NODE_REALTIME_EVENT_TYPES.journal.liveSession
    ) {
      await this.handleLiveSession(meta, envelope);
      return;
    }

    if (envelope.channel === 'mic-live') {
      this.realtimeService.fanOutToCabinet(meta.membraneId, envelope);
    }
  }

  private async handleJournalAppend(
    meta: NodeRealtimeSocketMeta,
    envelope: NodeRealtimeEnvelope,
  ): Promise<void> {
    const body = parseJournalAppendPayload(envelope.payload);

    if (body.kind === 'report') {
      const finishedAt = body.finishedAt ?? envelope.ts;
      const result = await this.journalService.createReport(meta.userId, {
        reportKind: body.reportKind,
        clientEntryId: body.clientEntryId,
        moduleId: body.moduleId,
        moduleName: body.moduleName,
        finishedAt,
        payload: { ...body.payload },
        tags: body.tags ? [...body.tags] : [],
      });

      const fanOut = createNodeRealtimeEnvelope(
        'journal',
        NODE_REALTIME_EVENT_TYPES.journal.append,
        {
          ...body,
          serverId: result.report.id,
          deduplicated: result.deduplicated,
        },
      );
      this.realtimeService.fanOutToCabinet(meta.membraneId, fanOut);
      this.realtimeService.ackJournalAppend(meta.mediaDeviceId!, body.clientEntryId);
      return;
    }

    const startedAt = body.startedAt ?? envelope.ts;
    const liveResult = await this.journalService.createLiveRecord(meta.userId, {
      recordKind: body.reportKind,
      clientRecordId: body.clientEntryId,
      moduleId: body.moduleId,
      startedAt,
      payload: { ...body.payload },
    });

    const fanOut = createNodeRealtimeEnvelope(
      'journal',
      NODE_REALTIME_EVENT_TYPES.journal.append,
      {
        ...body,
        serverId: liveResult.liveRecord.id,
        deduplicated: liveResult.deduplicated,
      },
    );
    this.realtimeService.fanOutToCabinet(meta.membraneId, fanOut);
    this.realtimeService.ackJournalAppend(meta.mediaDeviceId!, body.clientEntryId);
  }

  private async handleLiveSession(
    meta: NodeRealtimeSocketMeta,
    envelope: NodeRealtimeEnvelope,
  ): Promise<void> {
    const body = parseJournalLiveSessionPayload(envelope.payload);

    if (body.status === 'active') {
      await this.journalService.createLiveRecord(meta.userId, {
        recordKind: body.recordKind,
        clientRecordId: body.clientRecordId,
        moduleId: body.moduleId,
        startedAt: body.startedAt,
        payload: { ...body.payload },
      });
    } else {
      const records = await this.journalService.listLiveRecords(meta.userId, '50', meta.mediaDeviceId ?? undefined);
      const match = records.liveRecords.find((row) => row.clientRecordId === body.clientRecordId);
      if (match) {
        await this.journalService.updateLiveRecord(meta.userId, match.id, {
          status: 'ended',
          endedAt: envelope.ts,
          payload: { ...body.payload },
        });
      }
    }

    this.realtimeService.fanOutToCabinet(
      meta.membraneId,
      createNodeRealtimeEnvelope('journal', NODE_REALTIME_EVENT_TYPES.journal.liveSession, body),
    );
  }
}
