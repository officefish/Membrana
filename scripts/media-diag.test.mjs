import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bufferQuotaLevel,
  buildMinimalWavBlob,
  formatDiagLines,
  resolveVerdict,
} from './lib/media-diag-lib.mjs';

test('buildMinimalWavBlob is audio/wav', () => {
  const blob = buildMinimalWavBlob();
  assert.equal(blob.type, 'audio/wav');
  assert.ok(blob.size > 44);
});

test('bufferQuotaLevel detects warning and full', () => {
  assert.equal(
    bufferQuotaLevel({ buffer: { usedBytes: 950, limitBytes: 1000 } }).level,
    'warning',
  );
  assert.equal(
    bufferQuotaLevel({ buffer: { usedBytes: 1000, limitBytes: 1000 } }).level,
    'full',
  );
});

test('resolveVerdict OK when upload passes', () => {
  const verdict = resolveVerdict({
    health: { ok: true },
    quota: { ok: true, buffer: { usedBytes: 1, limitBytes: 1000 } },
    bufferQuota: { level: 'ok' },
    ensureReserved: { ok: true },
    testUpload: { ok: true },
  });
  assert.equal(verdict, 'OK');
});

test('resolveVerdict SERVER_QUOTA on 413 upload', () => {
  const verdict = resolveVerdict({
    health: { ok: true },
    quota: { ok: true, buffer: { usedBytes: 1, limitBytes: 1000 } },
    bufferQuota: { level: 'ok' },
    ensureReserved: { ok: true },
    testUpload: { ok: false, httpStatus: 413 },
  });
  assert.equal(verdict, 'SERVER_QUOTA');
});

test('formatDiagLines includes verdict', () => {
  const lines = formatDiagLines({
    baseUrl: 'http://localhost:3010',
    health: { ok: true, uptime: 10 },
    deviceId: 'dev-1',
    quota: { buffer: { usedBytes: 100, limitBytes: 1000 } },
    bufferQuota: { level: 'ok' },
    ensureReserved: { ok: true },
    testUpload: { ok: true, sampleId: 's1' },
    verdict: 'OK',
  });
  assert.ok(lines.some((l) => l.includes('verdict: OK')));
});
