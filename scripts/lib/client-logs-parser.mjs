/**
 * Pure parser for Membrana client device-board console dumps.
 * See docs/actions/device-board/CLIENT_LOGS_PARSING.md
 */

/** @typedef {{ line: number, raw: string, channel: string, message: string, runId: string | null, tick: number | null, payload: string }} LogEvent */

/** Studio packaged / `yarn studio:dev` — paste DevTools here; browser — `logs/apps/client/`. */
export const DEFAULT_CLIENT_LOG_PATHS = [
  'logs/apps/studio/logs.txt',
  'logs/apps/client/logs.txt',
  'logs/apps/client/console-logs.txt',
];

/** Fixed names under `%APPDATA%` — packaged Studio trace download (no repo paste). */
export const STUDIO_APPDATA_LOG_RELATIVE = [
  'Membrana/logs/device-board-trace-latest.txt',
  'Membrana/logs/logs.txt',
];

const RUN_ID_RE = /runId:\s*'([^']+)'/;
const TICK_RE = /tick:\s*(\d+)/;
const TRACK_ID_RE = /trackId:\s*'([^']+)'/;
const REASON_RE = /reason:\s*'([^']+)'/;
const WINDOW_SEC_RE = /windowSec:\s*(\d+)/;
const ELAPSED_MS_RE = /elapsedMs:\s*(\d+)/;
const PROMISE_ID_RE = /promiseId:\s*'([^']+)'/;

/**
 * @param {string} line
 * @param {number} lineNumber
 * @returns {LogEvent | null}
 */
export function parseLogLine(line, lineNumber = 0) {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.includes('[device-board]')) {
    if (trimmed.includes('live-records') && trimmed.includes('500')) {
      return {
        line: lineNumber,
        raw: trimmed,
        channel: 'http',
        message: 'cabinet-live-records-500',
        runId: null,
        tick: null,
        payload: trimmed,
      };
    }
    return null;
  }

  const channelMatch = trimmed.match(/\[device-board\](?:\[([^\]]+)\])?/);
  const channel = channelMatch?.[1] ?? 'core';
  const afterTag = trimmed.split('[device-board]')[1] ?? '';
  const messageMatch = afterTag.match(/(?:\[[^\]]+\])?\s*([a-z0-9][\w-]*)/i);
  const message = messageMatch?.[1] ?? 'unknown';
  const runId = RUN_ID_RE.exec(trimmed)?.[1] ?? null;
  const tickMatch = TICK_RE.exec(trimmed);
  const tick = tickMatch ? Number(tickMatch[1]) : null;

  return {
    line: lineNumber,
    raw: trimmed,
    channel,
    message,
    runId,
    tick,
    payload: trimmed,
  };
}

/**
 * @param {string} text
 * @returns {LogEvent[]}
 */
export function parseLogText(text) {
  const lines = text.split(/\r?\n/);
  /** @type {LogEvent[]} */
  const events = [];
  for (let i = 0; i < lines.length; i++) {
    const event = parseLogLine(lines[i], i + 1);
    if (event) events.push(event);
  }
  return events;
}

/**
 * @param {LogEvent[]} events
 * @returns {string[]}
 */
export function listRunIds(events) {
  const ids = new Set();
  for (const event of events) {
    if (event.runId) ids.add(event.runId);
  }
  return [...ids];
}

/**
 * @param {LogEvent[]} events
 * @param {string} runId
 */
function eventsForRun(events, runId) {
  return events.filter((event) => event.runId === runId);
}

/**
 * @param {LogEvent[]} events
 * @param {string} message
 */
function filterMessage(events, message) {
  return events.filter((event) => event.message === message);
}

/**
 * @param {LogEvent[]} events
 * @param {string} payloadIncludes
 */
function filterPayload(events, payloadIncludes) {
  return events.filter((event) => event.payload.includes(payloadIncludes));
}

/**
 * @param {LogEvent[]} events
 * @returns {number[]}
 */
function uniqueTicks(events) {
  return [...new Set(events.map((event) => event.tick).filter((tick) => tick !== null))].sort(
    (a, b) => a - b,
  );
}

/**
 * @param {LogEvent[]} allEvents
 * @param {string} runId
 */
export function summarizeRun(allEvents, runId) {
  const events = eventsForRun(allEvents, runId);
  const gateTrue = events.filter(
    (event) =>
      event.payload.includes('[recording] recording-window-full') ||
      (event.message === 'is-recording-window-full' && /full:\s*true/.test(event.payload)),
  );
  const gateTicks = uniqueTicks(gateTrue);
  const publishDone = filterPayload(events, '[journal] publish-done');
  const uploadOk = filterPayload(events, '[media] upload-ok');
  const droneSkip = filterPayload(events, '[report] drone-skip');
  const trendsDone = filterPayload(events, '[report] trends-report-done');
  const sliceStart = filterPayload(events, '[track] slice-start');
  const stopRecording = filterMessage(events, 'stop-recording').filter((event) =>
    event.payload.includes('[recording] stop-recording'),
  );
  const mainInfinity = filterMessage(events, 'loop-repeat').filter((event) =>
    event.payload.includes('main-infinity'),
  );
  const mainTickDone = filterMessage(events, 'main-tick-done');
  const mainTickBlocked = filterMessage(events, 'main-tick-blocked-ms');
  const maxTickFromDone = mainTickDone.reduce((max, event) => Math.max(max, event.tick ?? 0), 0);
  const maxTick = events.reduce((max, event) => Math.max(max, event.tick ?? 0), maxTickFromDone);

  const asyncJobStart = filterMessage(events, 'async-job-start');
  const asyncJobResolved = filterPayload(events, '[async-job] resolved');
  const asyncJobRejected = filterPayload(events, '[async-job] rejected');
  const asyncJobCancelled = filterMessage(events, 'async-job-cancelled');
  const sequenceLatentThenStart = filterMessage(events, 'sequence-latent-then-start');
  const eventDispatchDetachedStart = filterMessage(events, 'event-dispatch-detached-start');
  const asyncResolvedDispatch = filterMessage(events, 'async-resolved-dispatch');

  const mainTickElapsedMs = [...mainTickDone, ...mainTickBlocked]
    .map((event) => Number(ELAPSED_MS_RE.exec(event.payload)?.[1] ?? NaN))
    .filter((value) => !Number.isNaN(value));
  const maxMainTickBlockedMs =
    mainTickElapsedMs.length > 0 ? Math.max(...mainTickElapsedMs) : null;

  const gateUploadSameTick = gateTicks.filter((tick) =>
    events.some(
      (event) => event.tick === tick && event.payload.includes('[media] upload-ok'),
    ),
  );

  const hasAsyncPipeline =
    asyncJobStart.length > 0 ||
    asyncJobResolved.length > 0 ||
    sequenceLatentThenStart.length > 0;

  const hasFn1Block = allEvents.some(
    (event) =>
      event.payload.includes('fn-1-block') &&
      (event.runId === runId || event.runId === null),
  );
  const hasBootstrapRecording = allEvents.some(
    (event) =>
      event.payload.includes('[recording] start-recording') &&
      event.payload.includes('windowSec') &&
      (event.runId === runId || event.runId === null),
  );
  const onStartFn1 = hasFn1Block && hasBootstrapRecording;
  const bootstrapLine = allEvents.find(
    (event) =>
      event.payload.includes('[recording] start-recording') &&
      event.payload.includes('windowSec') &&
      (event.runId === runId || event.runId === null),
  );
  const windowSec = bootstrapLine ? Number(WINDOW_SEC_RE.exec(bootstrapLine.payload)?.[1] ?? 0) : null;

  const uploadItems = uploadOk.map((event) => ({
    tick: event.tick,
    trackId: TRACK_ID_RE.exec(event.payload)?.[1] ?? null,
    line: event.line,
  }));

  const droneReasons = [
    ...new Set(
      droneSkip
        .map((event) => REASON_RE.exec(event.payload)?.[1])
        .filter((reason) => reason !== undefined),
    ),
  ];

  const cabinetErrors = allEvents.filter(
    (event) => event.message === 'cabinet-live-records-500' || event.payload.includes('live-records'),
  );

  /** @type {string[]} */
  const anomalies = [];
  if (publishDone.length > uploadOk.length + 2) {
    anomalies.push(
      `reports-ahead-of-tracks: publish-done=${publishDone.length} upload-ok=${uploadOk.length} (async upload lag expected)`,
    );
  }
  if (droneSkip.length > 0 && droneReasons.includes('track-not-in-journal')) {
    if (hasAsyncPipeline) {
      anomalies.push(
        `drone-skip-regression-v20: ${droneSkip.length} (v2.0-async happy path expects 0)`,
      );
    } else {
      anomalies.push(
        `drone-skip-track-not-in-journal: ${droneSkip.length} (MakeReportFromTrack before upload-ok; see P7)`,
      );
    }
  }
  if (gateUploadSameTick.length > 0) {
    anomalies.push(
      `main-tick-blocked-on-upload: gate ticks with upload-ok=${gateUploadSameTick.join(',')}`,
    );
  }
  if (cabinetErrors.length > 0) {
    anomalies.push(`cabinet-telemetry-errors: ${cabinetErrors.length}`);
  }

  const gatePerTick = gateTicks.map((tick) => {
    const atTick = (predicate) =>
      events.filter((event) => event.tick === tick && predicate(event));
    return {
      tick,
      publishDone: atTick((event) => event.payload.includes('[journal] publish-done')).length,
      trendsDone: atTick((event) => event.payload.includes('[report] trends-report-done')).length,
      droneSkip: atTick((event) => event.payload.includes('[report] drone-skip')).length,
      uploadOk: atTick((event) => event.payload.includes('[media] upload-ok')).length,
      sliceStart: atTick((event) => event.payload.includes('[track] slice-start')).length,
    };
  });

  return {
    runId,
    onStart: {
      fn1BlockBootstrap: onStartFn1,
      windowSec,
    },
    main: {
      maxTick,
      mainTickDoneCount: mainTickDone.length,
      gateFalseInfinityLoops: mainInfinity.length,
    },
    gateTrue: {
      count: gateTicks.length,
      ticks: gateTicks,
    },
    recording: {
      stopRecording: stopRecording.length,
      sliceStart: sliceStart.length,
    },
    media: {
      uploadOk: uploadOk.length,
      uploadItems,
    },
    journal: {
      publishDone: publishDone.length,
      publishTicks: uniqueTicks(publishDone),
    },
    analysis: {
      trendsReportDone: trendsDone.length,
      droneSkip: droneSkip.length,
      droneReasons,
    },
    asyncJobs: {
      start: asyncJobStart.length,
      resolved: asyncJobResolved.length,
      rejected: asyncJobRejected.length,
      cancelled: asyncJobCancelled.length,
      promiseIds: [
        ...new Set(
          [...asyncJobStart, ...asyncJobResolved, ...asyncJobRejected]
            .map((event) => PROMISE_ID_RE.exec(event.payload)?.[1])
            .filter((id) => id !== undefined),
        ),
      ],
      sequenceLatentThenStart: sequenceLatentThenStart.length,
      eventDispatchDetachedStart: eventDispatchDetachedStart.length,
      asyncResolvedDispatch: asyncResolvedDispatch.length,
    },
    mainTick: {
      blockedMsMax: maxMainTickBlockedMs,
      blockedMsSamples: mainTickElapsedMs.length,
      gateTicksWithUploadOk: gateUploadSameTick,
    },
    gatePerTick,
    anomalies,
    smokeMvpMicrophone: {
      fn1Bootstrap: onStartFn1,
      gateWindowsGte2: gateTicks.length >= 2,
      gateWindowsGte10: gateTicks.length >= 10,
      trendsPublishMatchesGate: trendsDone.length === gateTicks.length && gateTicks.length > 0,
      maxTickGte60: maxTick >= 60,
      uploadOkGte2: uploadOk.length >= 2,
      passOperatorSmoke:
        onStartFn1 &&
        gateTicks.length >= 2 &&
        trendsDone.length >= 2 &&
        publishDone.length >= 2 &&
        maxTick >= 60,
    },
    smokeV20Async: {
      hasAsyncPipeline,
      asyncMarkersPresent:
        asyncJobStart.length > 0 &&
        (asyncJobResolved.length > 0 || asyncJobRejected.length > 0),
      latentSequenceSeen: sequenceLatentThenStart.length > 0,
      detachedDispatchSeen: eventDispatchDetachedStart.length > 0,
      droneSkipZero: droneSkip.length === 0,
      gateTicksNoUploadOk: gateUploadSameTick.length === 0,
      mainTickBlockedMsTracked: mainTickElapsedMs.length > 0,
      passV20HappyPath:
        hasAsyncPipeline &&
        asyncJobStart.length > 0 &&
        asyncJobResolved.length > 0 &&
        droneSkip.length === 0 &&
        gateUploadSameTick.length === 0 &&
        trendsDone.length === gateTicks.length &&
        gateTicks.length >= 2,
    },
  };
}

/**
 * @param {LogEvent[]} events
 * @param {{ runId?: string }} [options]
 */
export function analyzeClientLogs(events, options = {}) {
  const runIds = listRunIds(events);
  if (runIds.length === 0) {
    return { runs: [], runIds: [], error: 'no-run-id-found' };
  }

  const selected =
    options.runId !== undefined
      ? runIds.includes(options.runId)
        ? [options.runId]
        : []
      : [runIds[runIds.length - 1]];

  if (selected.length === 0) {
    return {
      runs: [],
      runIds,
      error: `run-id-not-found:${options.runId}`,
    };
  }

  return {
    runIds,
    selectedRunId: selected[0],
    runs: selected.map((runId) => summarizeRun(events, runId)),
  };
}

/**
 * @param {ReturnType<typeof analyzeClientLogs>} analysis
 */
export function formatAnalysisReport(analysis) {
  if (analysis.error) {
    return `client-logs parse error: ${analysis.error}`;
  }

  const lines = [];
  lines.push(`runIds in file: ${analysis.runIds.join(', ')}`);
  lines.push(`selected: ${analysis.selectedRunId}`);
  lines.push('');

  for (const run of analysis.runs) {
    lines.push(`=== run ${run.runId} ===`);
    lines.push(
      `onStart fn-1 bootstrap: ${run.onStart.fn1BlockBootstrap ? 'yes' : 'no'} · windowSec=${run.onStart.windowSec ?? '?'}`,
    );
    lines.push(
      `main ticks: max=${run.main.maxTick} · gate-false (∞): ${run.main.gateFalseInfinityLoops}`,
    );
    lines.push(
      `gate-true: ${run.gateTrue.count} · ticks: ${run.gateTrue.ticks.join(', ') || '—'}`,
    );
    lines.push(
      `publish-done: ${run.journal.publishDone} · trends: ${run.analysis.trendsReportDone} · upload-ok: ${run.media.uploadOk} · drone-skip: ${run.analysis.droneSkip}`,
    );
    lines.push(
      `async-jobs: start=${run.asyncJobs.start} resolved=${run.asyncJobs.resolved} rejected=${run.asyncJobs.rejected} · latent-then=${run.asyncJobs.sequenceLatentThenStart} · detached=${run.asyncJobs.eventDispatchDetachedStart}`,
    );
    if (run.mainTick.blockedMsMax !== null) {
      lines.push(
        `main-tick-blocked-ms: max=${run.mainTick.blockedMsMax} · samples=${run.mainTick.blockedMsSamples}`,
      );
    }
    if (run.media.uploadItems.length > 0) {
      lines.push(
        `upload-ok (async ticks): ${run.media.uploadItems.map((item) => `${item.tick}:${item.trackId ?? '?'}`).join(', ')}`,
      );
    }
    if (run.anomalies.length > 0) {
      lines.push(`anomalies: ${run.anomalies.join(' · ')}`);
    }
    lines.push('');
    lines.push('smoke MVP microphone:');
    const smoke = run.smokeMvpMicrophone;
    lines.push(`  fn-1 bootstrap: ${smoke.fn1Bootstrap ? 'PASS' : 'FAIL'}`);
    lines.push(`  gate windows ≥2: ${smoke.gateWindowsGte2 ? 'PASS' : 'FAIL'} (${run.gateTrue.count})`);
    lines.push(`  max tick ≥60: ${smoke.maxTickGte60 ? 'PASS' : 'FAIL'} (${run.main.maxTick})`);
    lines.push(
      `  trends publish = gate: ${smoke.trendsPublishMatchesGate ? 'PASS' : 'FAIL'} (${run.analysis.trendsReportDone}/${run.gateTrue.count})`,
    );
    lines.push(
      `  upload-ok ≥2: ${smoke.uploadOkGte2 ? 'PASS' : 'WARN'} (${run.media.uploadOk}) — async lag if FAIL`,
    );
    lines.push(
      `  operator smoke (no upload wait): ${smoke.passOperatorSmoke ? 'PASS' : 'FAIL'}`,
    );
    if (run.smokeV20Async.hasAsyncPipeline) {
      lines.push('');
      lines.push('smoke v2.0-async:');
      const v20 = run.smokeV20Async;
      lines.push(`  async markers: ${v20.asyncMarkersPresent ? 'PASS' : 'FAIL'}`);
      lines.push(`  drone-skip = 0: ${v20.droneSkipZero ? 'PASS' : 'FAIL'} (${run.analysis.droneSkip})`);
      lines.push(
        `  gate tick no upload-ok: ${v20.gateTicksNoUploadOk ? 'PASS' : 'FAIL'}`,
      );
      lines.push(
        `  trends = gate: ${run.smokeMvpMicrophone.trendsPublishMatchesGate ? 'PASS' : 'FAIL'}`,
      );
      lines.push(`  v20 happy path: ${v20.passV20HappyPath ? 'PASS' : 'FAIL'}`);
    }
  }

  return lines.join('\n');
}
