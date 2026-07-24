import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildCardLinks,
  buildPassport,
  formatInspection,
  formatInspectionWarnings,
  indexTasks,
  inspectCard,
  inspectElement,
  isLiveTask,
  liveChildrenOf,
  normalizeDepth,
} from './lib/task-inspect.mjs';
import { parseInspectArgs, runTaskInspect } from './task-inspect.mjs';

/** @param {Partial<import('./lib/task-inspect.mjs').TaskLike> & { id: string }} t */
function card(t) {
  return {
    title: t.title ?? t.id,
    status: t.status ?? 'active',
    leadPersona: t.leadPersona ?? null,
    parentEpic: t.parentEpic ?? null,
    createdAt: t.createdAt ?? '2026-07-01',
    archivedAt: t.archivedAt ?? null,
    githubIssue: t.githubIssue ?? null,
    linearId: t.linearId ?? null,
    promptPath: t.promptPath ?? `docs/prompts/${t.id}.md`,
    insightId: t.insightId ?? null,
    ...t,
  };
}

const FIXTURE = {
  version: 1,
  tasks: [
    card({ id: 'epic-live', title: 'Live epic', leadPersona: 'ozhegov', githubIssue: 100 }),
    card({
      id: 'child-a',
      title: 'Child A',
      parentEpic: 'epic-live',
      leadPersona: 'dynin',
      linearId: 'DRU-1',
    }),
    card({
      id: 'child-b',
      title: 'Child B',
      parentEpic: 'epic-live',
      status: 'archived',
      archivedAt: '2026-07-10',
    }),
    card({ id: 'grand-a1', title: 'Grand A1', parentEpic: 'child-a' }),
    card({
      id: 'orphan-card',
      title: 'Orphan',
      parentEpic: 'no-such-epic',
      leadPersona: 'vesnin',
    }),
    card({
      id: 'epic-dead',
      title: 'Dead epic',
      status: 'archived',
      archivedAt: '2026-07-02',
    }),
    card({
      id: 'zombie-child',
      title: 'Zombie under dead',
      parentEpic: 'epic-dead',
      leadPersona: 'ozhegov',
    }),
  ],
};

test('isLiveTask: только active', () => {
  assert.equal(isLiveTask(card({ id: 'x', status: 'active' })), true);
  assert.equal(isLiveTask(card({ id: 'x', status: 'archived' })), false);
  assert.equal(isLiveTask(null), false);
});

test('normalizeDepth: 1|2, default 2', () => {
  assert.equal(normalizeDepth(undefined), 2);
  assert.equal(normalizeDepth(1), 1);
  assert.equal(normalizeDepth('2'), 2);
  assert.throws(() => normalizeDepth(3), /depth/);
});

test('buildCardLinks: github/linear/prompt/insight без сети', () => {
  const links = buildCardLinks(
    card({
      id: 'x',
      title: 'Hello',
      githubIssue: 42,
      linearId: 'DRU-9',
      promptPath: 'docs/prompts/X.md',
      insightId: 'ins-1',
    }),
  );
  assert.deepEqual(
    links.map((l) => l.type),
    ['github', 'linear', 'prompt', 'insight'],
  );
  assert.equal(links[0].urn, 'github:issue/42');
  assert.equal(links[1].urn, 'linear:DRU-9');
  assert.match(links[2].urn, /^file:/);
});

test('inspectElement: depth=1 — только живые children, без archived', () => {
  const r = inspectElement(FIXTURE, 'epic-live', { depth: 1 });
  assert.ok(r);
  assert.equal(r.self.id, 'epic-live');
  assert.deepEqual(
    r.children.map((c) => c.id),
    ['child-a'],
  );
  assert.equal(r.grandchildren, undefined);
  assert.equal(r.hasInconsistency, false);
});

test('inspectElement: depth=2 — grandchildren по живым', () => {
  const r = inspectCard(FIXTURE, 'epic-live', 2);
  assert.ok(r);
  assert.deepEqual(r.grandchildren?.['child-a']?.map((g) => g.id), ['grand-a1']);
  assert.equal(r.grandchildren?.['child-b'], undefined);
});

test('inspectElement: [ORPHANED] если parentEpic не резолвится', () => {
  const r = inspectElement(FIXTURE, 'orphan-card', { depth: 1 });
  assert.ok(r);
  assert.equal(r.self.orphaned, true);
  assert.deepEqual(r.self.markers, ['[ORPHANED]']);
  assert.equal(r.hasInconsistency, true);
  const text = formatInspection(r);
  assert.match(text, /\[ORPHANED\] orphan-card/);
});

test('inspectElement: [INCONSISTENT] живой ребёнок у мёртвого родителя', () => {
  const r = inspectElement(FIXTURE, 'zombie-child', { depth: 1 });
  assert.ok(r);
  assert.equal(r.self.inconsistent, true);
  assert.deepEqual(r.self.markers, ['[INCONSISTENT]']);
});

test('inspectElement: [INCONSISTENT] на мёртвом эпике с живыми детьми', () => {
  const r = inspectElement(FIXTURE, 'epic-dead', { depth: 1 });
  assert.ok(r);
  assert.equal(r.self.inconsistent, true);
  // Рекурсия не спускается в archived base — children только live:
  assert.deepEqual(
    r.children.map((c) => c.id),
    ['zombie-child'],
  );
});

test('inspectElement: null если карточки нет', () => {
  assert.equal(inspectElement(FIXTURE, 'missing', { depth: 1 }), null);
});

test('formatInspectionWarnings + liveChildrenOf', () => {
  const byId = indexTasks(FIXTURE);
  assert.deepEqual(
    liveChildrenOf('epic-live', byId).map((t) => t.id),
    ['child-a'],
  );
  const r = inspectElement(FIXTURE, 'orphan-card');
  const warnings = formatInspectionWarnings(r);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /ORPHANED/);
});

test('buildPassport: markers пусты у здоровой карточки', () => {
  const byId = indexTasks(FIXTURE);
  const p = buildPassport(byId.get('child-a'), byId);
  assert.deepEqual(p.markers, []);
  assert.equal(p.owner, 'dynin');
  assert.equal(p.parentEpicId, 'epic-live');
});

test('parseInspectArgs: depth/json/refresh', () => {
  assert.deepEqual(parseInspectArgs(['epic-x', '--depth=1', '--json']), {
    id: 'epic-x',
    depth: '1',
    json: true,
    refresh: false,
    help: false,
  });
  assert.equal(parseInspectArgs(['--refresh', 'x']).refresh, true);
});

test('runTaskInspect: --refresh → exit 2, без сети', () => {
  const loads = [];
  const code = runTaskInspect(['--refresh', 'epic-live'], {
    load: (cwd) => {
      loads.push(cwd);
      return FIXTURE;
    },
  });
  assert.equal(code, 2);
  assert.equal(loads.length, 0);
});

test('runTaskInspect: inconsistency → exit 1', () => {
  const code = runTaskInspect(['orphan-card', '--depth=1'], {
    load: () => FIXTURE,
  });
  assert.equal(code, 1);
});

test('runTaskInspect: healthy → exit 0', () => {
  const code = runTaskInspect(['epic-live', '--depth=1'], {
    load: () => FIXTURE,
  });
  assert.equal(code, 0);
});

test('runTaskInspect: missing → exit 2', () => {
  const code = runTaskInspect(['nope'], { load: () => FIXTURE });
  assert.equal(code, 2);
});
