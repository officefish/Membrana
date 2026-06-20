import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  type AnalysisBriefPayload,
} from '@membrana/core';

import { getNodeRealtimeClient } from '@/lib/nodeRealtimeClient';
import {
  micLiveDronePluginState,
} from '@/plugins/mic-live-drone-analysis/micLiveDronePluginState';
import type { MicLiveDroneSnapshot } from '@/plugins/mic-live-drone-analysis/types';

let installed = false;

function isRealtimeEnabled(): boolean {
  const flag = import.meta.env.VITE_NODE_REALTIME_ENABLED;
  return flag !== 'false' && flag !== '0';
}

function pushMicLive(type: string, payload: unknown): void {
  if (!isRealtimeEnabled()) return;
  const client = getNodeRealtimeClient();
  if (client.getState() !== 'connected') return;
  client.send(createNodeRealtimeEnvelope('mic-live', type, payload));
}

function emitSession(snap: MicLiveDroneSnapshot): void {
  pushMicLive(NODE_REALTIME_EVENT_TYPES.micLive.session, {
    sessionId: snap.analyzedSampleId ?? 'mic-live-stream',
    analysisMode: snap.streamLive ? snap.analysisMode : 'idle',
    active: snap.streamLive,
  });
}

function emitBrief(snap: MicLiveDroneSnapshot): void {
  const report = snap.briefReport;
  if (!report) return;

  const isDetected = report.verdicts.some((verdict: { isDrone: boolean }) => verdict.isDrone);
  const payload: AnalysisBriefPayload = {
    schema: report.meta.schemaVersion,
    reportId: report.meta.reportId,
    trackId: snap.lastJournalTrackId ?? report.meta.sampleId,
    isDetected,
    confidence: report.verdicts[0]?.confidence,
  };
  pushMicLive(NODE_REALTIME_EVENT_TYPES.micLive.analysisBrief, payload);
}

/** MP7: mic-live events over WebSocket when paired. */
export function initMicLiveRealtimeBridge(): () => void {
  if (installed) return () => undefined;
  installed = true;

  let prevStreamLive = micLiveDronePluginState.getSnapshot().streamLive;
  let prevBriefId: string | null =
    micLiveDronePluginState.getSnapshot().briefReport?.meta.reportId ?? null;

  const unsub = micLiveDronePluginState.subscribe(() => {
    const snap = micLiveDronePluginState.getSnapshot();
    if (snap.streamLive !== prevStreamLive) {
      prevStreamLive = snap.streamLive;
      emitSession(snap);
    }
    const briefId = snap.briefReport?.meta.reportId ?? null;
    if (briefId && briefId !== prevBriefId && snap.status === 'ready') {
      prevBriefId = briefId;
      emitBrief(snap);
    }
  });

  return () => {
    installed = false;
    unsub();
  };
}

export function resetMicLiveRealtimeBridgeForTests(): void {
  installed = false;
}
