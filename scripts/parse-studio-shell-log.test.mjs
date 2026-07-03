import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseCaptureLifecycle } from './parse-studio-shell-log.mjs';

const SAMPLE = [
  '2026-07-03 12:00:01 info renderer [capture] acquired mode=hard session=sess-1',
  '2026-07-03 12:00:01 info main capture acquired — window focused',
  '2026-07-03 12:02:00 debug renderer [capture] heartbeat session=sess-1',
  '2026-07-03 12:04:00 debug renderer [capture] heartbeat session=sess-1',
  '2026-07-03 12:06:00 info renderer [capture] release reason=operator',
  '2026-07-03 12:10:00 info renderer [capture] acquired mode=soft session=sess-2',
  '2026-07-03 12:20:00 info renderer [capture] release reason=ttl-expired (local TTL)',
  'unrelated line',
].join('\n');

test('parseCaptureLifecycle: счётчики acquired/heartbeat/release/focus по режимам и причинам', () => {
  const summary = parseCaptureLifecycle(SAMPLE);
  assert.equal(summary.acquired, 2);
  assert.deepEqual(summary.acquiredByMode, { soft: 1, hard: 1 });
  assert.equal(summary.heartbeat, 2);
  assert.equal(summary.release, 2);
  assert.deepEqual(summary.releaseByReason, { operator: 1, 'ttl-expired': 1 });
  assert.equal(summary.windowFocused, 1);
  assert.equal(summary.lines.length, 4);
});

test('parseCaptureLifecycle: пустой лог — нули', () => {
  const summary = parseCaptureLifecycle('');
  assert.equal(summary.acquired, 0);
  assert.equal(summary.release, 0);
});
