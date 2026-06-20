import type { JournalAppendPayload } from '@membrana/core';

import {
  LIVE_JOURNAL_CLEAR_TAG,
  LIVE_JOURNAL_DETECTION_TAG,
  LIVE_JOURNAL_MODULE_NAME,
  LIVE_JOURNAL_REPORT_TAGS,
  LIVE_JOURNAL_TRACK_TAGS,
} from '../constants.js';
import type { LiveJournalItem } from '../types.js';
import { TELEMETRY_TRACK_SCHEMA_VERSION } from '../types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function buildReportTags(isDetected: boolean, extra?: readonly string[]): string[] {
  const tags = [...LIVE_JOURNAL_REPORT_TAGS, ...(extra ?? [])];
  tags.push(isDetected ? LIVE_JOURNAL_DETECTION_TAG : LIVE_JOURNAL_CLEAR_TAG);
  return tags;
}

/** Map WS `journal.append` fan-out payload → `LiveJournalItem` for cabinet live UI. */
export function liveJournalItemFromJournalAppendPayload(
  body: JournalAppendPayload & { readonly serverId?: string },
  timestampIso: string,
): LiveJournalItem | null {
  const timestamp = Date.parse(timestampIso);
  if (Number.isNaN(timestamp)) return null;

  const id = body.serverId ?? body.clientEntryId;

  if (body.kind === 'track') {
    const nested = isRecord(body.payload.item) ? body.payload.item : body.payload;
    const trackId = typeof nested.trackId === 'string' ? nested.trackId : null;
    const sampleId = typeof nested.sampleId === 'string' ? nested.sampleId : null;
    const title = typeof nested.title === 'string' ? nested.title : null;
    const createdAtIso = typeof nested.createdAtIso === 'string' ? nested.createdAtIso : body.startedAt;
    const durationSec = typeof nested.durationSec === 'number' ? nested.durationSec : null;
    const sampleRate = typeof nested.sampleRate === 'number' ? nested.sampleRate : null;
    const captureMode =
      nested.captureMode === 'manual' || nested.captureMode === 'auto' ? nested.captureMode : null;

    if (!trackId || !sampleId || !title || !createdAtIso || durationSec === null || sampleRate === null || !captureMode) {
      return null;
    }

    return {
      id,
      kind: 'track',
      timestamp,
      clientEntryId: body.clientEntryId,
      moduleId: body.moduleId,
      moduleName: body.moduleName || LIVE_JOURNAL_MODULE_NAME,
      tags: [...LIVE_JOURNAL_TRACK_TAGS, ...(body.tags ?? [])],
      track: {
        schema: TELEMETRY_TRACK_SCHEMA_VERSION,
        trackId,
        sampleId,
        title,
        durationSec,
        sampleRate,
        captureMode,
        createdAtIso,
        liveSessionId: typeof nested.liveSessionId === 'string' ? nested.liveSessionId : undefined,
      },
    };
  }

  const schema = typeof body.payload.schema === 'string' ? body.payload.schema : body.reportKind;
  const reportId = typeof body.payload.reportId === 'string' ? body.payload.reportId : null;
  const trackId = typeof body.payload.trackId === 'string' ? body.payload.trackId : null;
  const isDetected =
    typeof body.payload.isDetected === 'boolean' ? body.payload.isDetected : null;

  if (!schema || !reportId || !trackId || isDetected === null) {
    return null;
  }

  const innerPayload = isRecord(body.payload.payload) ? body.payload.payload : {};

  return {
    id,
    kind: 'report',
    timestamp,
    clientEntryId: body.clientEntryId,
    moduleId: body.moduleId,
    moduleName: body.moduleName || LIVE_JOURNAL_MODULE_NAME,
    tags: body.tags?.length ? [...body.tags] : buildReportTags(isDetected),
    report: {
      schema,
      reportId,
      trackId,
      isDetected,
      summaryText: typeof body.payload.summaryText === 'string' ? body.payload.summaryText : undefined,
      payload: innerPayload,
    },
  };
}
