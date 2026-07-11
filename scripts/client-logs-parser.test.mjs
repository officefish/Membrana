import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyzeClientLogs,
  formatAnalysisReport,
  listRunIds,
  parseLogText,
} from './lib/client-logs-parser.mjs';

const FIXTURE = `
index.ts:35 [INFO] [device-board] node-enter {branch: 'initial', tick: null, nodeId: 'fn-1-block', nodeKind: 'subgraph'}
index.ts:35 [INFO] [device-board][recording] start-recording {deviceHandle: 'dev-1', windowSec: 5, captureFormat: 'wav'}
index.ts:35 [INFO] [device-board] scenario-run-start {runId: 'abcd1234', branch: 'main', linked: true}
index.ts:35 [INFO] [device-board] main-tick-start {runId: 'abcd1234', tick: 1, branch: 'main'}
index.ts:35 [INFO] [device-board] node-enter {runId: 'abcd1234', tick: 1, branch: 'main', nodeId: 'node-is-recording-window-full', nodeKind: 'is-recording-window-full'}
index.ts:35 [INFO] [device-board] is-recording-window-full {runId: 'abcd1234', tick: 1, branch: 'main'}
index.ts:35 [INFO] [device-board] loop-repeat {runId: 'abcd1234', tick: 1, branch: 'main', nodeId: 'main-infinity'}
index.ts:35 [INFO] [device-board] main-tick-done {runId: 'abcd1234', tick: 1, branch: 'main'}
index.ts:35 [INFO] [device-board][recording] recording-window-full {runId: 'abcd1234', tick: 44, branch: 'main', windowSec: 5}
index.ts:35 [INFO] [device-board][recording] stop-recording {runId: 'abcd1234', tick: 44, branch: 'main'}
index.ts:35 [INFO] [device-board][track] slice-start {runId: 'abcd1234', tick: 44, branch: 'main'}
index.ts:35 [INFO] [device-board][media] upload-start {runId: 'abcd1234', tick: 44, branch: 'main', trackId: 'track-aaa'}
index.ts:35 [INFO] [device-board][report] trends-report-done {runId: 'abcd1234', tick: 44, branch: 'main'}
index.ts:35 [INFO] [device-board][journal] publish-done {runId: 'abcd1234', tick: 44, branch: 'main'}
index.ts:35 [INFO] [device-board][report] drone-skip {runId: 'abcd1234', tick: 44, branch: 'main', reason: 'track-not-in-journal'}
index.ts:35 [INFO] [device-board][recording] recording-window-full {runId: 'abcd1234', tick: 85, branch: 'main', windowSec: 5}
index.ts:35 [INFO] [device-board][journal] publish-done {runId: 'abcd1234', tick: 85, branch: 'main'}
index.ts:35 [INFO] [device-board][media] upload-ok {runId: 'abcd1234', tick: 90, branch: 'main', trackId: 'track-aaa'}
index.ts:35 [INFO] [device-board] main-tick-done {runId: 'abcd1234', tick: 90, branch: 'main'}
`;

test('parseLogText extracts runId and gate ticks', () => {
  const events = parseLogText(FIXTURE);
  assert.deepEqual(listRunIds(events), ['abcd1234']);
  const analysis = analyzeClientLogs(events);
  const run = analysis.runs[0];
  assert.equal(run.runId, 'abcd1234');
  assert.equal(run.onStart.fn1BlockBootstrap, true);
  assert.equal(run.onStart.windowSec, 5);
  assert.deepEqual(run.gateTrue.ticks, [44, 85]);
  assert.equal(run.journal.publishDone, 2);
  assert.equal(run.media.uploadOk, 1);
  assert.equal(run.analysis.droneSkip, 1);
});

test('formatAnalysisReport includes smoke lines', () => {
  const analysis = analyzeClientLogs(parseLogText(FIXTURE));
  const report = formatAnalysisReport(analysis);
  assert.match(report, /gate-true: 2/);
  assert.match(report, /operator smoke/);
  assert.doesNotMatch(report, /smoke v2\.0-async/);
});

const FIXTURE_V20_ASYNC = `
index.ts:35 [INFO] [device-board] scenario-run-start {runId: 'v20async', branch: 'main', linked: true}
index.ts:35 [INFO] [device-board] main-tick-start {runId: 'v20async', tick: 44, branch: 'main'}
index.ts:35 [INFO] [device-board] sequence-latent-then-start {runId: 'v20async', tick: 44, branch: 'main', nodeId: 'node-sequence-gate-v20-async'}
index.ts:35 [INFO] [device-board] async-job-start {runId: 'v20async', tick: 44, branch: 'main', promiseId: 'p-44', kind: 'track-upload'}
index.ts:35 [INFO] [device-board][recording] recording-window-full {runId: 'v20async', tick: 44, branch: 'main', windowSec: 5}
index.ts:35 [INFO] [device-board][recording] stop-recording {runId: 'v20async', tick: 44, branch: 'main'}
index.ts:35 [INFO] [device-board][report] trends-report-done {runId: 'v20async', tick: 44, branch: 'main'}
index.ts:35 [INFO] [device-board][journal] publish-done {runId: 'v20async', tick: 44, branch: 'main'}
index.ts:35 [INFO] [device-board] event-dispatch-detached-start {runId: 'v20async', tick: 44, branch: 'main'}
index.ts:35 [INFO] [device-board] main-tick-blocked-ms {runId: 'v20async', tick: 44, branch: 'main', elapsedMs: 120}
index.ts:35 [INFO] [device-board] main-tick-done {runId: 'v20async', tick: 44, branch: 'main', elapsedMs: 120}
index.ts:35 [INFO] [device-board][async-job] resolved {runId: 'v20async', tick: 50, branch: 'main', promiseId: 'p-44'}
index.ts:35 [INFO] [device-board][media] upload-ok {runId: 'v20async', tick: 50, branch: 'main', trackId: 'track-aaa'}
index.ts:35 [INFO] [device-board][report] drone-analysis-done {runId: 'v20async', tick: 51, branch: 'main'}
index.ts:35 [INFO] [device-board][journal] publish-done {runId: 'v20async', tick: 51, branch: 'main'}
index.ts:35 [INFO] [device-board][recording] recording-window-full {runId: 'v20async', tick: 85, branch: 'main', windowSec: 5}
index.ts:35 [INFO] [device-board][journal] publish-done {runId: 'v20async', tick: 85, branch: 'main'}
index.ts:35 [INFO] [device-board][report] trends-report-done {runId: 'v20async', tick: 85, branch: 'main'}
`;

test('v2.0-async fixture: asyncJobs, zero drone-skip, no upload on gate tick', () => {
  const analysis = analyzeClientLogs(parseLogText(FIXTURE_V20_ASYNC));
  const run = analysis.runs[0];
  assert.equal(run.asyncJobs.start, 1);
  assert.equal(run.asyncJobs.resolved, 1);
  assert.equal(run.asyncJobs.sequenceLatentThenStart, 1);
  assert.equal(run.asyncJobs.eventDispatchDetachedStart, 1);
  assert.equal(run.analysis.droneSkip, 0);
  assert.equal(run.mainTick.blockedMsMax, 120);
  assert.equal(run.smokeV20Async.passV20HappyPath, true);
  assert.equal(
    run.anomalies.some((item) => item.includes('drone-skip-regression-v20')),
    false,
  );
});

test('legacy fixture flags drone-skip anomaly without async pipeline', () => {
  const analysis = analyzeClientLogs(parseLogText(FIXTURE));
  const run = analysis.runs[0];
  assert.equal(run.smokeV20Async.hasAsyncPipeline, false);
  assert.match(run.anomalies.join(' '), /drone-skip-track-not-in-journal/);
});

test('analyzeClientLogs selects last run by default with multiple runs', () => {
  const multi = `${FIXTURE}
index.ts:35 [INFO] [device-board] scenario-run-start {runId: 'zzzz9999', branch: 'main'}
index.ts:35 [INFO] [device-board] main-tick-done {runId: 'zzzz9999', tick: 3, branch: 'main'}
`;
  const analysis = analyzeClientLogs(parseLogText(multi));
  assert.equal(analysis.selectedRunId, 'zzzz9999');
});

// NB1 (tooling-retro): detection-alarm (basn) — живой прогон с дроном.
const FIXTURE_DETECTION_ALARM = `
index.ts:35 [INFO] [device-board] scenario-run-start {runId: 'basn0001', branch: 'main', linked: true}
index.ts:35 [INFO] [device-board] main-tick-start {runId: 'basn0001', tick: 1, branch: 'main'}
index.ts:35 [INFO] [device-board] main-tick-done {runId: 'basn0001', tick: 1, branch: 'main', detected: false, confidence: null}
index.ts:35 [INFO] [device-board] main-tick-start {runId: 'basn0001', tick: 30, branch: 'main'}
index.ts:35 [INFO] [device-board][report] combined-built {runId: 'basn0001', tick: 30, branch: 'main', reportId: 'c-1'}
index.ts:35 [INFO] [device-board] make-detection-fusion {runId: 'basn0001', tick: 30, branch: 'main', presentCount: 2, combinedScore: 0.71}
index.ts:35 [INFO] [device-board] node-enter {runId: 'basn0001', tick: 30, branch: 'main', nodeId: 'beta-main-print-detected', nodeKind: 'print'}
index.ts:35 [INFO] [device-board] main-tick-done {runId: 'basn0001', tick: 30, branch: 'main', detected: true, confidence: 0.71}
index.ts:35 [INFO] [device-board] main → alarm (loop-transition-policy) {runId: 'basn0001', combinedScore: 0.71}
index.ts:35 [INFO] [device-board] main-tick-done {runId: 'basn0001', tick: 31, branch: 'alarm', detected: true, confidence: 0.68}
index.ts:35 [INFO] [device-board] alarm → main (quiet enough) {runId: 'basn0001', rawLevel: 0.01}
`;

test('detection-alarm section: combinedScore>0, detected, alarm by score', () => {
  const analysis = analyzeClientLogs(parseLogText(FIXTURE_DETECTION_ALARM));
  const run = analysis.runs[0];
  const da = run.detectionAlarm;
  assert.equal(da.present, true);
  assert.equal(da.confidencePositive, true);
  assert.equal(da.maxConfidence, 0.71);
  assert.equal(da.detectedTicks >= 1, true);
  assert.equal(da.combinedBuilt, 1);
  assert.equal(da.alarmEnterPolicy, 1);
  assert.equal(da.alarmTicks, 1);
  assert.equal(da.alarmExit, 1);
  assert.equal(da.alarmByScore, true);
});

test('detection-alarm section absent on non-basn (MVP) fixture', () => {
  const analysis = analyzeClientLogs(parseLogText(FIXTURE));
  assert.equal(analysis.runs[0].detectionAlarm.present, false);
  const report = formatAnalysisReport(analysis);
  assert.doesNotMatch(report, /detection-alarm \(basn\)/);
});

test('detection-alarm report renders PASS lines', () => {
  const report = formatAnalysisReport(analyzeClientLogs(parseLogText(FIXTURE_DETECTION_ALARM)));
  assert.match(report, /detection-alarm \(basn\)/);
  assert.match(report, /confidence>0.*PASS/);
  assert.match(report, /alarm по combinedScore>=0\.5: PASS/);
});
