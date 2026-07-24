import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  DreamsLog,
  classifyDreamDigestState,
  dayLogPath,
  dreamMasterVersion,
  reduceOutcomes,
  validateDreamEvent,
  DREAM_MASTER_AUTHOR,
} from './lib/dreams-log.mjs';

const PROMPT = `## DREAM_MASTER_VERSION\n\n\`1.0.0\`\n\nbody`;

test('dreamMasterVersion: читает метку из промпта', () => {
  assert.equal(dreamMasterVersion(PROMPT), '1.0.0');
});

test('validateDreamEvent: нет пары → отказ (анти-молчун)', () => {
  const v = validateDreamEvent({
    day: '2026-07-20',
    hour: 3,
    status: 'synthesized',
    version: '1.0.0',
    attempts: [],
  });
  assert.equal(v.ok, false);
});

test('DreamsLog: append-only + дедуп слота', () => {
  const log = new DreamsLog();
  const base = {
    day: '2026-07-20',
    hour: 1,
    status: 'synthesized',
    author: DREAM_MASTER_AUTHOR,
    version: '1.0.0',
    pair: ['t1', 't2'],
    provider: 'perplexity',
    seed: 's',
    attempts: [{ provider: 'perplexity', attempt: 0, outcome: 'ok' }],
    score: 0.8,
    text: 'сон',
  };
  assert.equal(log.append(base).ok, true);
  assert.equal(log.append({ ...base, text: 'другой' }).ok, false);
  assert.equal(log.readDay('2026-07-20').length, 1);
});

test('projectDay: digest ≤6, no-winner явен; reduceOutcomes тотален', () => {
  const log = new DreamsLog();
  for (let h = 0; h < 24; h += 1) {
    const ok = h % 4 !== 3; // каждый 4-й час пустой заезд-кандидат failed
    log.append({
      day: '2026-07-20',
      hour: h,
      status: ok ? 'synthesized' : 'synthesisFailed',
      version: '1.0.0',
      pair: ['a', 'b'],
      provider: 'grok',
      seed: `s${h}`,
      attempts: [{ provider: 'grok', attempt: 0, outcome: ok ? 'ok' : 'balance' }],
      score: ok ? h / 24 : undefined,
      text: ok ? `dream-${h}` : undefined,
    });
  }
  const proj = log.projectDay('2026-07-20');
  assert.ok(proj.winnerCount <= 6);
  assert.ok(proj.noWinnerHeats.length >= 0);
  const outcomes = reduceOutcomes(proj.dreams);
  assert.equal(outcomes.length, 24);
  assert.ok(outcomes.every((o) => ['won', 'lost', 'failed', 'skipped', 'no-winner-slot'].includes(o.outcome)));
});

test('classifyDreamDigestState: tri-state never-ran / ran-empty / has-winners', () => {
  assert.deepEqual(
    classifyDreamDigestState({
      dreams: [],
      winners: [],
      logPath: '/x/dreams/d.jsonl',
      logExists: false,
      volumeRoot: '/x',
      volumeExists: true,
    }),
    { status: 'never-ran', reason: 'day-log-missing' },
  );
  assert.deepEqual(
    classifyDreamDigestState({
      dreams: [],
      winners: [],
      volumeRoot: '/missing',
      volumeExists: false,
    }),
    { status: 'never-ran', reason: 'volume-missing' },
  );
  assert.equal(
    classifyDreamDigestState({
      dreams: [{ status: 'skipped' }, { status: 'synthesisFailed' }],
      winners: [],
    }).status,
    'ran-empty',
  );
  assert.deepEqual(
    classifyDreamDigestState({
      dreams: [{ status: 'synthesized' }],
      winners: [{ id: 'w1' }],
    }),
    { status: 'has-winners', reason: null },
  );
});

test('projectDay: never-ran когда лога суток нет на томе', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dreams-proj-'));
  try {
    const path = dayLogPath(dir, '2026-07-21');
    const log = new DreamsLog({ path });
    const proj = log.projectDay('2026-07-21', { volumeRoot: dir });
    assert.equal(proj.status, 'never-ran');
    assert.equal(proj.reason, 'day-log-missing');
    assert.equal(proj.eventCount, 0);
    assert.equal(proj.winnerCount, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('DreamsLog file backend: append переживает reopen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dreams-log-'));
  const path = join(dir, '2026-07-20.jsonl');
  try {
    const a = new DreamsLog({ path });
    a.append({
      day: '2026-07-20',
      hour: 5,
      status: 'skipped',
      version: '1.0.0',
      reason: 'no-pair',
      attempts: [],
    });
    const b = new DreamsLog({ path });
    assert.equal(b.readDay('2026-07-20').length, 1);
    assert.equal(b.readDay('2026-07-20')[0].status, 'skipped');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
