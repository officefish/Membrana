import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCapacityGate,
  evaluateProbeBlob,
  formatGiB,
  MIN_DISK_AVAIL_BYTES,
  MIN_MEM_AVAILABLE_BYTES,
  parseDiskAvailBytes,
  parseMemAvailableBytes,
  renderCapacityReport,
  splitProbeOutput,
} from './affine-capacity-gate.mjs';

const FREE_OK = `              total        used        free      shared  buff/cache   available
Mem:     4089446400   943718400  2097152000           0  1048576000  3019898880
Swap:    2147483648   268435456  1879048192
`;

const DF_OK = `Filesystem     1B-blocks      Used Available Use% Mounted on
/dev/sda1     51539607552 34359738368 17179869184  67% /
`;

const FREE_LOW = `              total        used        free      shared  buff/cache   available
Mem:     4089446400  3000000000   100000000           0   100000000  1073741824
Swap:    2147483648   268435456  1879048192
`;

const DF_LOW = `Filesystem     1B-blocks      Used Available Use% Mounted on
/dev/sda1     51539607552 45000000000  8589934592  87% /
`;

test('parse MemAvailable from free -b', () => {
  assert.equal(parseMemAvailableBytes(FREE_OK), 3019898880);
  assert.equal(parseMemAvailableBytes('garbage'), null);
});

test('parse disk avail from df -B1 /', () => {
  assert.equal(parseDiskAvailBytes(DF_OK), 17179869184);
  assert.equal(parseDiskAvailBytes(DF_LOW), 8589934592);
  assert.equal(parseDiskAvailBytes('Filesystem only'), null);
});

test('splitProbeOutput on --- separator', () => {
  const { freeText, dfText } = splitProbeOutput(`${FREE_OK}---\n${DF_OK}`);
  assert.ok(freeText.includes('Mem:'));
  assert.ok(dfText.includes('/dev/sda1'));
});

test('go: MemAvailable и disk выше порогов (baseline 2026-07-25)', () => {
  const v = evaluateCapacityGate({
    memAvailable: 3019898880,
    diskAvail: 17179869184,
  });
  assert.equal(v.go, true);
  assert.ok(v.reason.includes('достаточен'));
});

test('no-go: MemAvailable < 1.5 GiB', () => {
  const v = evaluateCapacityGate({
    memAvailable: MIN_MEM_AVAILABLE_BYTES - 1,
    diskAvail: MIN_DISK_AVAIL_BYTES + 1,
  });
  assert.equal(v.go, false);
  assert.ok(v.reason.includes('MemAvailable'));
});

test('no-go: disk avail < 12 GiB', () => {
  const v = evaluateCapacityGate({
    memAvailable: MIN_MEM_AVAILABLE_BYTES + 1,
    diskAvail: MIN_DISK_AVAIL_BYTES - 1,
  });
  assert.equal(v.go, false);
  assert.ok(v.reason.includes('disk avail'));
});

test('no-go: parse failure', () => {
  assert.equal(evaluateCapacityGate({ memAvailable: null, diskAvail: 1 }).go, false);
  assert.equal(evaluateCapacityGate({ memAvailable: 1, diskAvail: null }).go, false);
});

test('evaluateProbeBlob end-to-end + report wording', () => {
  const go = evaluateProbeBlob(`${FREE_OK}---\n${DF_OK}`);
  assert.equal(go.go, true);
  const report = renderCapacityReport(go);
  assert.ok(report.includes('[go]'));
  assert.equal(report, renderCapacityReport(go));

  const stop = evaluateProbeBlob(`${FREE_LOW}---\n${DF_LOW}`);
  assert.equal(stop.go, false);
  const stopReport = renderCapacityReport(stop);
  assert.ok(stopReport.includes('[no-go]'));
  assert.ok(stopReport.includes('compose up'));
});

test('formatGiB stable', () => {
  assert.equal(formatGiB(MIN_MEM_AVAILABLE_BYTES), '1.50 GiB');
});
