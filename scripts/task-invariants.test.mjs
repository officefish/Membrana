import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  checkCardIntegrity,
  checkRegistryIntegrity,
  colorFromViolations,
  isInvariantsCacheFresh,
  maxInvariantLevel,
  normalizeLinearLiveState,
  planLinkageRepair,
  formatInvariantsReport,
} from './lib/task-invariants.mjs';
import { parseInvariantsArgs, runTaskInvariants } from './task-invariants.mjs';
import { parseRepairArgs, runInvariantsRepair } from './task-invariants-repair.mjs';

/** @param {Partial<object> & { id: string }} t */
function card(t) {
  return {
    title: t.title ?? t.id,
    status: t.status ?? 'active',
    size: t.size ?? 'M',
    githubIssue: t.githubIssue ?? null,
    linearId: t.linearId ?? null,
    githubIssueClosedAt: t.githubIssueClosedAt ?? null,
    ...t,
  };
}

test('maxInvariantLevel / colorFromViolations', () => {
  assert.equal(maxInvariantLevel('DATALOSS', 'WARNING'), 'WARNING');
  assert.equal(maxInvariantLevel('HARD_BLOCK', 'WARNING'), 'HARD_BLOCK');
  assert.equal(colorFromViolations([]), 'green');
  assert.equal(
    colorFromViolations([{ level: 'WARNING', invariant: 'x', cardId: 'a', field: 'f', message: 'm', code: 'c' }]),
    'yellow',
  );
  assert.equal(
    colorFromViolations([{ level: 'HARD_BLOCK', invariant: 'x', cardId: 'a', field: 'f', message: 'm', code: 'c' }]),
    'red',
  );
});

test('normalizeLinearLiveState: open vs closed', () => {
  assert.equal(normalizeLinearLiveState('backlog'), 'open');
  assert.equal(normalizeLinearLiveState('started'), 'open');
  assert.equal(normalizeLinearLiveState('completed'), 'closed');
  assert.equal(normalizeLinearLiveState('canceled'), 'closed');
});

test('green: active + live linear + open issue', () => {
  const r = checkCardIntegrity(card({ id: 'ok', linearId: 'DRU-1', githubIssue: 10 }), {
    linear: { 'DRU-1': 'open' },
    github: { '10': 'open' },
    fetchedAt: '2026-07-24T12:00:00.000Z',
  });
  assert.equal(r.status, 'green');
  assert.equal(r.violations.length, 0);
});

test('red HARD_BLOCK: active + missing linear', () => {
  const r = checkCardIntegrity(card({ id: 'bad', linearId: 'DRU-gone' }), {
    linear: { 'DRU-gone': 'missing' },
    github: {},
    fetchedAt: '2026-07-24T12:00:00.000Z',
  });
  assert.equal(r.status, 'red');
  assert.ok(r.violations.some((v) => v.level === 'HARD_BLOCK' && v.invariant === 'linear-live'));
});

test('red HARD_BLOCK: active + closed linear', () => {
  const r = checkCardIntegrity(card({ id: 'bad', linearId: 'DRU-done' }), {
    linear: { 'DRU-done': 'closed' },
    fetchedAt: '2026-07-24T12:00:00.000Z',
  });
  assert.equal(r.status, 'red');
  assert.ok(r.violations.some((v) => v.code === 'invariant.linear.closed'));
});

test('yellow WARNING: мёртвая github-ссылка', () => {
  const r = checkCardIntegrity(card({ id: 'warn', githubIssue: 99999, status: 'archived' }), {
    github: { '99999': 'missing' },
    fetchedAt: '2026-07-24T12:00:00.000Z',
  });
  assert.equal(r.status, 'yellow');
  assert.ok(r.violations.some((v) => v.level === 'WARNING' && v.invariant === 'github-exists'));
});

test('yellow DATALOSS: closed issue без closedAt', () => {
  const r = checkCardIntegrity(
    card({ id: 'dl', githubIssue: 42, githubIssueClosedAt: null }),
    {
      github: { '42': 'closed' },
      fetchedAt: '2026-07-24T12:00:00.000Z',
    },
  );
  assert.equal(r.status, 'yellow');
  assert.ok(r.violations.some((v) => v.level === 'DATALOSS' && v.code === 'invariant.closedAt.missing'));
});

test('unknown ≠ HARD_BLOCK', () => {
  const r = checkCardIntegrity(card({ id: 'u', linearId: 'DRU-1', githubIssue: 1 }), {
    linear: { 'DRU-1': 'unknown' },
    github: { '1': 'unknown' },
    fetchedAt: '2026-07-24T12:00:00.000Z',
  });
  assert.equal(r.status, 'unchecked');
  assert.ok(r.violations.every((v) => v.level !== 'HARD_BLOCK'));
});

test('без кэша → unchecked (fast path)', () => {
  const r = checkCardIntegrity(card({ id: 'f', linearId: 'DRU-1' }), null);
  assert.equal(r.status, 'unchecked');
  assert.equal(r.violations.length, 0);
});

test('isInvariantsCacheFresh TTL 4h', () => {
  const now = Date.parse('2026-07-24T16:00:00.000Z');
  assert.equal(
    isInvariantsCacheFresh({ fetchedAt: '2026-07-24T13:00:00.000Z' }, now),
    true,
  );
  assert.equal(
    isInvariantsCacheFresh({ fetchedAt: '2026-07-24T11:00:00.000Z' }, now),
    false,
  );
});

test('planLinkageRepair clear / manual', () => {
  const c = card({ id: 'r', linearId: 'DRU-1', githubIssue: 5 });
  const clear = planLinkageRepair(c, { clearLinear: true });
  assert.equal(clear.ok, true);
  assert.equal(clear.patch.linearId, null);
  const man = planLinkageRepair(c, { manualLinear: 'DRU-99' });
  assert.equal(man.patch.linearId, 'DRU-99');
});

test('checkRegistryIntegrity summary', () => {
  const cards = [
    card({ id: 'a', linearId: 'DRU-1' }),
    card({ id: 'b', githubIssue: 9 }),
  ];
  const r = checkRegistryIntegrity(cards, {
    linear: { 'DRU-1': 'missing' },
    github: { '9': 'open' },
    fetchedAt: '2026-07-24T12:00:00.000Z',
  });
  assert.equal(r.summary.red, 1);
  assert.equal(r.summary.green, 1);
  assert.match(formatInvariantsReport(r), /🔴/);
});

test('parseInvariantsArgs', () => {
  assert.equal(parseInvariantsArgs(['--full', 'tw-v6']).mode, 'full');
  assert.equal(parseInvariantsArgs(['--full', 'tw-v6']).id, 'tw-v6');
  assert.equal(parseInvariantsArgs([]).mode, 'fast');
});

test('parseRepairArgs + dry-run default', () => {
  const a = parseRepairArgs(['x', '--clear-linear']);
  assert.equal(a.execute, false);
  assert.equal(a.clearLinear, true);
});

test('runTaskInvariants: unknown card → exit 2', () => {
  const code = runTaskInvariants(['no-such-card'], {
    cwd: process.cwd(),
    load: () => ({ tasks: [card({ id: 'only' })] }),
  });
  assert.equal(code, 2);
});

test('runInvariantsRepair: dry-run не зовёт save', () => {
  let saved = false;
  const code = runInvariantsRepair(['only', '--clear-linear'], {
    load: () => ({ tasks: [card({ id: 'only', linearId: 'DRU-1' })] }),
    save: () => {
      saved = true;
    },
  });
  assert.equal(code, 0);
  assert.equal(saved, false);
});

test('snapshot: DRU выше max снимка → unknown, не missing', async () => {
  const { fetchLinearLiveStatesFromSnapshot } = await import('./lib/task-invariants-links.mjs');
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'inv-'));
  const snap = join(dir, 'snap.json');
  writeFileSync(
    snap,
    JSON.stringify({
      header: {
        format: 'linear-snapshot@1',
        capturedAt: '2026-07-20T08:47:45.278Z',
        sourceRevision: 'r',
        producedBy: 'media-NL',
        egressRegion: 'NL',
        mode: 'batch-full-pull',
        trigger: 'manual',
        recordCount: 1,
      },
      records: [{ linearId: 'DRU-225', stateType: 'backlog', githubIssueRefs: [1] }],
    }),
  );
  try {
    const states = fetchLinearLiveStatesFromSnapshot(['DRU-410', 'DRU-100'], snap);
    assert.equal(states['DRU-410'], 'unknown');
    assert.equal(states['DRU-100'], 'missing');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
