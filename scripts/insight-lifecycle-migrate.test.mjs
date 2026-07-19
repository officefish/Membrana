import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

import { replayInsightLifecycle } from './lib/insight-lifecycle.mjs';
import { buildLegacyMigrationPlan } from './lib/insight-lifecycle-migrate.mjs';
import { executeOperationPlan } from './lib/insight-lifecycle-ops.mjs';
import { emptyBaseContext, loadLifecycleStore } from './lib/insight-lifecycle-store.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'insight-migrate-'));
  execFileSync('git', ['init'], { cwd: root });
  const store = { baseContext: emptyBaseContext(), eventLog: [], projection: null };
  const request = {
    requestKey: 'legacy-migration-v1',
    actorRef: 'migration-agent',
    authorityRef: 'audit://c5/pass',
    independentAudit: 'PASS',
    sourceDigests: [{ ref: 'docs/insights/registry.json', digest: 'pinned-registry' }],
  };
  return { root, store, request };
}

function value(state, axis, subjectRef) {
  return state.currentAssessments[`${axis}:${subjectRef}`]?.assertion?.value;
}

describe('C5 deterministic legacy migration', () => {
  it('reconstructs the exact verified and partial facts while leaving gaps None', () => {
    const f = fixture();
    try {
      const plan = buildLegacyMigrationPlan({ repoRoot: f.root, store: f.store, request: f.request });
      const replay = replayInsightLifecycle(plan.__proposedBaseContext, plan.proposedEvents);
      assert.equal(replay.ok, true);
      const base = plan.__proposedBaseContext;
      const state = replay.state;

      const byInsight = (insightId) => {
        const revision = base.insightRevisions.find((item) => item.insightId === insightId);
        const mandates = base.mandates.filter((item) => item.insightRevisionRef === revision.id);
        const mandateIds = new Set(mandates.map((item) => item.id));
        const slices = base.slices.filter((item) => mandateIds.has(item.mandateRef));
        const representation = base.representations.find((item) => item.insightRevisionRef === revision.id);
        return { mandates, slices, representation };
      };

      const hermes = byInsight('insight-hermes-liaison-agent');
      assert.deepEqual(hermes.mandates.map((item) => value(state, 'D', item.id)), ['accepted']);
      assert.deepEqual(hermes.slices.map((item) => value(state, 'L', item.id)), ['delivered']);
      assert.equal(value(state, 'O', hermes.slices[0].id), undefined);
      assert.equal(value(state, 'V', hermes.representation.id), 'archived');

      const comms = byInsight('insight-comms-contour-topology');
      assert.equal(comms.slices.filter((item) => value(state, 'L', item.id) === 'delivered').length, 8);
      assert.equal(comms.slices.filter((item) => value(state, 'L', item.id) === undefined).length, 1);
      assert.equal(comms.slices.every((item) => value(state, 'O', item.id) === undefined), true);

      const telegram = byInsight('insight-telegram-work-reports');
      assert.equal(telegram.slices.filter((item) => value(state, 'L', item.id) === 'delivered').length, 3);
      assert.equal(value(state, 'L', telegram.slices.find((item) => item.claimKey === 'operational-smoke').id), undefined);

      const persona = byInsight('insight-persona-persistent-memory');
      assert.equal(persona.mandates.length, 2);
      assert.equal(persona.mandates.every((item) => value(state, 'D', item.id) === 'accepted'), true);
      assert.equal(persona.slices.every((item) => value(state, 'L', item.id) === 'delivered'), true);
      assert.equal(persona.slices.every((item) => value(state, 'O', item.id) === undefined), true);

      for (const insightId of [
        'insight-operator-smoke-ci-gate',
        'insight-async-v2-product-narrative',
        'insight-competition-catalog-pipeline',
      ]) {
        const item = byInsight(insightId);
        assert.equal(value(state, 'D', item.mandates[0].id), 'accepted');
        assert.equal(value(state, 'L', item.slices[0].id), undefined);
        assert.equal(value(state, 'O', item.slices[0].id), undefined);
        assert.equal(value(state, 'V', item.representation.id), 'active');
      }
      assert.equal(plan.migration.legacyFilesRewritten, false);
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  });

  it('is byte-deterministic and blocks disputed inputs', () => {
    const f = fixture();
    try {
      const first = buildLegacyMigrationPlan({ repoRoot: f.root, store: f.store, request: f.request });
      const second = buildLegacyMigrationPlan({ repoRoot: f.root, store: f.store, request: f.request });
      assert.deepEqual(second, first);
      assert.throws(() => buildLegacyMigrationPlan({
        repoRoot: f.root,
        store: f.store,
        request: { ...f.request, disputedCases: ['identity-x'] },
      }), (error) => error.code === 'LEGACY_DISPUTED');
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  });

  it('rebuilds the same request digest and returns the committed result on retry', () => {
    const f = fixture();
    try {
      const firstPlan = buildLegacyMigrationPlan({ repoRoot: f.root, store: f.store, request: f.request });
      const first = executeOperationPlan(f.root, firstPlan, { execute: true });
      const retryPlan = buildLegacyMigrationPlan({
        repoRoot: f.root,
        store: loadLifecycleStore(f.root),
        request: f.request,
      });
      assert.equal(retryPlan.requestDigest, firstPlan.requestDigest);
      const retry = executeOperationPlan(f.root, retryPlan, { execute: true });
      assert.deepEqual(retry, first);
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  });
});
