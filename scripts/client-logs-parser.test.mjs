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
});

test('analyzeClientLogs selects last run by default with multiple runs', () => {
  const multi = `${FIXTURE}
index.ts:35 [INFO] [device-board] scenario-run-start {runId: 'zzzz9999', branch: 'main'}
index.ts:35 [INFO] [device-board] main-tick-done {runId: 'zzzz9999', tick: 3, branch: 'main'}
`;
  const analysis = analyzeClientLogs(parseLogText(multi));
  assert.equal(analysis.selectedRunId, 'zzzz9999');
});
