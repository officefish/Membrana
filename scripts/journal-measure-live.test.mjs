import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseArgs,
  parseServerTiming,
  summarizePages,
} from './journal-measure-live.mjs';

test('journal measure parses explicit live-run options', () => {
  const parsed = parseArgs([
    '--api',
    'https://cabinet.example/',
    '--token',
    'token',
    '--media-device-id',
    'device-1',
    '--sample-window-ms',
    '6000',
    '--min-items',
    '2500',
    '--json',
  ]);

  assert.equal(parsed.api, 'https://cabinet.example');
  assert.equal(parsed.token, 'token');
  assert.equal(parsed.mediaDeviceId, 'device-1');
  assert.equal(parsed.sampleWindowMs, 6000);
  assert.equal(parsed.minItems, 2500);
  assert.equal(parsed.json, true);
});

test('journal measure parses Server-Timing journal-db duration', () => {
  assert.equal(parseServerTiming('cache;desc=hit, journal-db;dur=123.4'), 123.4);
  assert.equal(parseServerTiming('app;dur=5'), null);
});

test('journal measure summarizes per-sample page count and DB latency', () => {
  const watermark = 1000;
  const summary = summarizePages(
    [
      {
        items: [{ timestamp: 1000 }, { timestamp: 1005 }],
        dbDurationMs: 20.4,
        httpDurationMs: 35.1,
      },
      {
        items: [{ timestamp: 1010 }],
        dbDurationMs: 10.2,
        httpDurationMs: 18.9,
      },
    ],
    watermark,
  );

  assert.equal(summary.requests, 2);
  assert.equal(summary.returnedItems, 3);
  assert.equal(summary.newItems, 2);
  assert.deepEqual(summary.dbMs, { min: 10.2, avg: 15.3, max: 20.4 });
});
