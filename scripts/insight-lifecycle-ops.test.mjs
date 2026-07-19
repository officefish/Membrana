import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

import {
  buildOperationPlan,
  executeOperationPlan,
  OperationError,
  planDecide,
  planReconcile,
  planVisibility,
  recoverPreparedJournal,
} from './lib/insight-lifecycle-ops.mjs';
import {
  canonicalJson,
  fileDigest,
  lifecyclePaths,
  loadLifecycleStore,
  saveLifecycleStore,
  sharedLifecyclePaths,
} from './lib/insight-lifecycle-store.mjs';

function baseContext() {
  return {
    contextId: 'ctx-test',
    schemaVersion: 1,
    insightRevisions: [{ id: 'revision-1', insightId: 'insight-test' }],
    mandates: [{ id: 'mandate-1', insightRevisionRef: 'revision-1' }],
    slices: [{ id: 'slice-1', mandateRef: 'mandate-1' }],
    representations: [{ id: 'representation-1', insightRevisionRef: 'revision-1' }],
    transcriptionRelations: [],
  };
}

function store(eventLog = []) {
  return { baseContext: baseContext(), eventLog, projection: null };
}

function env(seq, event) {
  return { eventId: `existing-${seq}`, seq, schemaVersion: 1, event };
}

function repo() {
  const root = mkdtempSync(join(tmpdir(), 'insight-lifecycle-'));
  execFileSync('git', ['init'], { cwd: root });
  return root;
}

function tree(root) {
  if (!existsSync(root)) return [];
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.name === '.git') return [];
    return entry.isDirectory() ? walk(path) : [[path.slice(root.length + 1), readFileSync(path)]];
  });
  return walk(root).sort(([a], [b]) => a.localeCompare(b));
}

function authority(overrides = {}) {
  return {
    requestKey: 'request-1',
    authorityRef: 'owner://decision/1',
    actorRef: 'test',
    ...overrides,
  };
}

describe('C7 operation planning and execution', () => {
  it('keeps a dry-run workspace byte-identical', () => {
    const root = repo();
    try {
      writeFileSync(join(root, 'sentinel.txt'), 'same');
      const before = tree(root);
      const plan = planDecide({
        repoRoot: root, store: store(), subjectRef: 'mandate-1', value: 'accepted', ...authority(),
      });
      const report = executeOperationPlan(root, plan);
      assert.equal(report.mode, 'DRY-RUN');
      assert.deepEqual(tree(root), before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('makes decide and visibility state-aware', () => {
    const root = repo();
    try {
      const events = [
        env(1, { kind: 'AssertD', assertionId: 'd-1', subjectRef: 'mandate-1', value: 'accepted' }),
        env(2, { kind: 'AssertV', assertionId: 'v-1', subjectRef: 'representation-1', value: 'active' }),
      ];
      const same = planDecide({
        repoRoot: root, store: store(events), subjectRef: 'mandate-1', value: 'accepted', ...authority(),
      });
      assert.equal(same.noOp, true);
      assert.throws(() => planDecide({
        repoRoot: root, store: store(events), subjectRef: 'mandate-1', value: 'rejected',
        ...authority({ requestKey: 'different' }),
      }), (error) => error instanceof OperationError && error.code === 'DECISION_CORRECTION_REQUIRED');
      const visibility = planVisibility({
        repoRoot: root, store: store(events), subjectRef: 'representation-1', value: 'archived',
        reason: 'owner navigation', ...authority({ requestKey: 'visibility-1' }),
      });
      assert.deepEqual(visibility.proposedEvents.map((item) => item.event.kind), ['Revoke', 'AssertV']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('routine reconcile never emits Revoke', () => {
    const root = repo();
    try {
      const candidate = {
        candidateId: 'candidate-1',
        targetClaim: { axis: 'L', subjectRef: 'slice-1', assertedValue: 'delivered' },
        linkedSliceContext: {
          insightRevisionRef: 'revision-1', mandateRef: 'mandate-1', sliceRef: 'slice-1',
        },
        originRef: 'review://sha',
        predicateId: 'delivery',
        predicateVersion: '1',
        basis: { ruleRef: 'task#doD', ruleVersion: '1', affirmativeResultRef: 'review://lgtm' },
      };
      const plan = planReconcile({
        repoRoot: root, store: store(), candidates: [candidate], ...authority(),
      });
      assert.deepEqual(plan.proposedEvents.map((item) => item.event.kind), ['AssertL']);
      assert.equal(plan.proposedEvents.some((item) => item.event.kind === 'Revoke'), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns the recorded result for the same idempotency key and digest', () => {
    const root = repo();
    try {
      saveLifecycleStore(root, baseContext(), []);
      const plan = planDecide({
        repoRoot: root, store: store(), subjectRef: 'mandate-1', value: 'accepted', ...authority(),
      });
      const first = executeOperationPlan(root, plan, { execute: true });
      const retryPlan = planDecide({
        repoRoot: root,
        store: loadLifecycleStore(root),
        subjectRef: 'mandate-1',
        value: 'accepted',
        ...authority(),
      });
      assert.equal(retryPlan.requestDigest, plan.requestDigest);
      const second = executeOperationPlan(root, retryPlan, { execute: true });
      assert.deepEqual(second, first);
      assert.equal(readFileSync(lifecyclePaths(root).eventLog, 'utf8').trim().split(/\r?\n/).length, 1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('blocks lock conflicts and reused keys with a stale digest', () => {
    const root = repo();
    try {
      saveLifecycleStore(root, baseContext(), []);
      const shared = sharedLifecyclePaths(root);
      mkdirSync(shared.shared, { recursive: true });
      writeFileSync(shared.lock, '{}');
      const plan = planDecide({
        repoRoot: root, store: store(), subjectRef: 'mandate-1', value: 'accepted', ...authority(),
      });
      assert.throws(() => executeOperationPlan(root, plan, { execute: true }),
        (error) => error.code === 'LOCKED');
      rmSync(shared.lock);
      executeOperationPlan(root, plan, { execute: true });
      const reused = buildOperationPlan({
        repoRoot: root,
        store: store(),
        proposedEvents: [{ kind: 'AssertD', subjectRef: 'mandate-1', value: 'rejected' }],
        targetSubjects: ['mandate-1'],
        ...authority(),
      });
      assert.throws(() => executeOperationPlan(root, reused, { execute: true }),
        (error) => error.code === 'IDEMPOTENCY_KEY_REUSED');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('aborts PREPARED recovery when targets retain before hashes', () => {
    const root = repo();
    try {
      const target = join(root, 'target.json');
      writeFileSync(target, '{}\n');
      const journal = join(root, 'journal.json');
      writeFileSync(journal, `${canonicalJson({
        schemaVersion: 1,
        records: [{
          state: 'PREPARED',
          targets: [{ path: target, beforeDigest: fileDigest(target), afterDigest: 'unused' }],
        }],
      }, true)}\n`);
      const result = recoverPreparedJournal(journal);
      assert.equal(result.state, 'ABORTED');
      assert.equal(readFileSync(target, 'utf8'), '{}\n');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('deprecated CLI safety', () => {
  for (const command of [
    ['archive', 'insight-x', '--task', 'task-x', '--result', 'implemented'],
    ['close', 'insight-x', '--status', 'adopted'],
  ]) {
    it(`${command[0]} exits 2 without writes`, () => {
      const root = mkdtempSync(join(tmpdir(), `insight-${command[0]}-`));
      try {
        writeFileSync(join(root, 'sentinel'), 'same');
        const before = tree(root);
        const result = spawnSync(process.execPath, [resolve(import.meta.dirname, 'insight.mjs'), ...command], {
          cwd: root, encoding: 'utf8',
        });
        assert.equal(result.status, 2);
        assert.deepEqual(tree(root), before);
        assert.match(result.stderr, /DEPRECATED_AMBIGUOUS_/);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  }
});
