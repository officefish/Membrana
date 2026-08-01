import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  SALVAGE_FRAMES,
  assessPlanTargets,
  createSalvageJournal,
  hashSalvagePlan,
  reconcileInventories,
  runOneRef,
  selectPlanTarget,
  validateSalvageJournal,
  validateSalvagePlan,
  verifySalvageCloseout,
} from './lib/branch-salvage-procedure.mjs';
import {
  main as applyPlanMain,
  parseApplyPlanCli,
} from './repo-branches-apply-plan.mjs';
import { parseCloseoutCli } from './repo-branches-closeout.mjs';
import { parseReconcileCli } from './repo-branches-reconcile.mjs';

const sha = (char) => char.repeat(40);

function makePlan(overrides = {}) {
  return {
    schemaVersion: 1,
    id: 'salvage-test',
    baseSha: sha('a'),
    ownerGate: {
      status: 'ratified',
      ratifiedBy: 'owner',
      ratifiedAt: '2026-07-31T00:00:00.000Z',
      evidence: 'owner message test-1',
    },
    protectedRefs: [{ ref: 'refs/heads/main', expectedTip: sha('a') }],
    targets: [
      {
        ref: 'refs/heads/feat/old',
        expectedTip: sha('b'),
        action: 'delete-local-ref',
        verdict: 'already-in-main',
        evidence: 'PR #1',
      },
      {
        ref: 'refs/remotes/origin/feat/remote',
        expectedTip: sha('c'),
        action: 'delete-remote-ref',
        verdict: 'obsolete',
        evidence: 'main SHA deadbeef',
      },
    ],
    ...overrides,
  };
}

function snapshots() {
  return [
    { path: 'C:/w/main', state: 'ok', porcelain: '' },
    { path: 'C:/w/codex', state: 'ok', porcelain: ' M docs/note.md' },
  ];
}

function fakeIo({
  refs = new Map([
    ['refs/heads/main', sha('a')],
    ['refs/heads/feat/old', sha('b')],
    ['refs/remotes/origin/feat/remote', sha('c')],
  ]),
  held = new Set(),
  before = snapshots(),
  after = snapshots(),
  crashAfterDelete = false,
  preserveRefAfterDelete = false,
} = {}) {
  let saved = null;
  let deletes = 0;
  let snapshotsTaken = 0;
  return {
    state: {
      refs,
      get saved() {
        return saved;
      },
      get deletes() {
        return deletes;
      },
    },
    io: {
      async loadRefs() {
        return refs;
      },
      async heldBranches() {
        return held;
      },
      async snapshotLiveTrees() {
        snapshotsTaken += 1;
        return snapshotsTaken === 1 ? before : after;
      },
      async deleteRef(target) {
        deletes += 1;
        if (!preserveRefAfterDelete) refs.delete(target.ref);
        if (crashAfterDelete) throw new Error('simulated crash after delete');
      },
      async saveJournal(journal) {
        saved = structuredClone(journal);
      },
    },
  };
}

test('six frames are closed and ordered', () => {
  assert.deepEqual(
    SALVAGE_FRAMES.map((frame) => frame.id),
    [
      'freeze-snapshot',
      'reconcile-current-refs',
      'ratify-plan',
      'prepare-one-ref',
      'mutate-one-ref',
      'postcheck-closeout',
    ],
  );
});

test('CLI parsers keep read/write boundaries explicit', () => {
  assert.deepEqual(
    parseReconcileCli([
      '--snapshot',
      'snapshot.json',
      '--plan',
      'plan.json',
      '--report',
      'report.md',
      '--no-fetch',
      '--json',
    ]),
    {
      snapshot: 'snapshot.json',
      plan: 'plan.json',
      report: 'report.md',
      noFetch: true,
      json: true,
      help: false,
    },
  );
  assert.deepEqual(
    parseApplyPlanCli([
      '--plan',
      'plan.json',
      '--journal',
      'journal.json',
      '--report',
      'execution.md',
      '--target',
      'refs/heads/feat/x',
      '--execute',
    ]),
    {
      plan: 'plan.json',
      journal: 'journal.json',
      report: 'execution.md',
      targetRef: 'refs/heads/feat/x',
      next: false,
      execute: true,
      noFetch: false,
      json: false,
      help: false,
    },
  );
  assert.deepEqual(parseCloseoutCli(['--plan', 'p', '--journal', 'j', '--json']), {
    plan: 'p',
    journal: 'j',
    report: '',
    noFetch: false,
    json: true,
    help: false,
  });
});

test('apply-plan execute requires an evidence report before loading files', async () => {
  await assert.rejects(
    applyPlanMain([
      '--plan',
      'does-not-matter.json',
      '--journal',
      'does-not-matter-journal.json',
      '--target',
      'refs/heads/feat/x',
      '--execute',
    ]),
    /--execute requires --report/u,
  );
});

test('plan validation requires full SHA and action/ref consistency', () => {
  assert.equal(validateSalvagePlan(makePlan()).id, 'salvage-test');
  assert.throws(
    () => validateSalvagePlan(makePlan({ baseSha: 'abc1234' })),
    /full 40-char/u,
  );
  const wrongAction = makePlan();
  wrongAction.targets[0].action = 'delete-remote-ref';
  assert.throws(() => validateSalvagePlan(wrongAction), /refs\/remotes\/origin/u);

  const missingOwner = makePlan();
  delete missingOwner.ownerGate.ratifiedBy;
  assert.throws(() => validateSalvagePlan(missingOwner), /ratifiedBy/u);

  const protectedTarget = makePlan();
  protectedTarget.targets[0].ref = 'refs/remotes/origin/main';
  protectedTarget.targets[0].action = 'delete-remote-ref';
  assert.throws(() => validateSalvagePlan(protectedTarget), /protected branch/u);
});

test('journal is bound to immutable plan hash', () => {
  const plan = makePlan();
  const journal = createSalvageJournal(plan, '2026-07-31T00:00:00.000Z');
  assert.equal(journal.planHash, hashSalvagePlan(plan));
  const changed = structuredClone(plan);
  changed.targets[0].evidence = 'different evidence';
  assert.throws(() => validateSalvageJournal(changed, journal), /plan hash drift/u);
});

test('reconcile distinguishes unchanged, absent, moved, new and twins', () => {
  const frozen = {
    baseSha: sha('a'),
    local: [
      { name: 'feat/same', tip: sha('b') },
      { name: 'feat/gone', tip: sha('c') },
      { name: 'feat/moved', tip: sha('d') },
    ],
    remote: [{ name: 'origin/feat/same', tip: sha('b') }],
  };
  const current = {
    baseSha: sha('e'),
    local: [
      { name: 'feat/same', tip: sha('b') },
      { name: 'feat/moved', tip: sha('f') },
      { name: 'feat/new', tip: sha('1') },
    ],
    remote: [{ name: 'origin/feat/same', tip: sha('2') }],
  };
  const result = reconcileInventories(frozen, current);
  assert.deepEqual(result.counts, { unchanged: 1, absent: 1, moved: 2, new: 1 });
  assert.equal(result.baseMoved, true);
  assert.deepEqual(result.twins.map((row) => [row.branch, row.status]), [
    ['feat/same', 'moved'],
  ]);
});

test('plan assessment names absent, moved, held and ready targets', () => {
  const plan = makePlan({
    targets: [
      {
        ref: 'refs/heads/feat/ready',
        expectedTip: sha('b'),
        action: 'delete-local-ref',
        verdict: 'done',
        evidence: 'PR #1',
      },
      {
        ref: 'refs/heads/feat/held',
        expectedTip: sha('c'),
        action: 'delete-local-ref',
        verdict: 'done',
        evidence: 'PR #2',
      },
      {
        ref: 'refs/heads/feat/moved',
        expectedTip: sha('d'),
        action: 'delete-local-ref',
        verdict: 'done',
        evidence: 'PR #3',
      },
      {
        ref: 'refs/heads/feat/absent',
        expectedTip: sha('e'),
        action: 'delete-local-ref',
        verdict: 'done',
        evidence: 'PR #4',
      },
    ],
  });
  const rows = assessPlanTargets(
    plan,
    new Map([
      ['refs/heads/feat/ready', sha('b')],
      ['refs/heads/feat/held', sha('c')],
      ['refs/heads/feat/moved', sha('f')],
    ]),
    new Set(['feat/held']),
  );
  assert.deepEqual(rows.map((row) => row.status), ['ready', 'held', 'moved', 'absent']);
});

test('selector permits exactly one target and --next stops on failed terminal', () => {
  const plan = makePlan();
  const journal = createSalvageJournal(plan);
  assert.equal(selectPlanTarget(plan, journal, { next: true }).ref, plan.targets[0].ref);
  assert.throws(() => selectPlanTarget(plan, journal, {}), /exactly one/u);
  assert.throws(
    () => selectPlanTarget(plan, journal, { targetRef: 'refs/heads/missing' }),
    /not in plan/u,
  );
});

test('dry-run never saves journal or deletes a ref', async () => {
  const plan = makePlan();
  const journal = createSalvageJournal(plan);
  const fake = fakeIo();
  const result = await runOneRef({
    plan,
    journal,
    target: plan.targets[0],
    execute: false,
    io: fake.io,
  });
  assert.equal(result.outcome.status, 'planned');
  assert.equal(fake.state.saved, null);
  assert.equal(fake.state.deletes, 0);
});

test('execute rejects a draft owner gate', async () => {
  const plan = makePlan({
    ownerGate: { status: 'draft' },
  });
  const journal = createSalvageJournal(plan);
  const fake = fakeIo();
  await assert.rejects(
    runOneRef({
      plan,
      journal,
      target: plan.targets[0],
      execute: true,
      io: fake.io,
    }),
    /status=ratified/u,
  );
  assert.equal(fake.state.saved, null);
  assert.equal(fake.state.deletes, 0);
});

test('execute mutates one selected ref and journals prepared before completed', async () => {
  const plan = makePlan();
  const journal = createSalvageJournal(plan);
  const fake = fakeIo();
  const result = await runOneRef({
    plan,
    journal,
    target: plan.targets[0],
    execute: true,
    io: fake.io,
    now: () => '2026-07-31T01:00:00.000Z',
  });
  assert.equal(result.outcome.status, 'deleted');
  assert.equal(fake.state.deletes, 1);
  assert.equal(fake.state.refs.has(plan.targets[0].ref), false);
  assert.equal(fake.state.refs.has(plan.targets[1].ref), true);
  assert.deepEqual(fake.state.saved.events.map((event) => event.phase), [
    'prepared',
    'completed',
  ]);
  assert.equal(fake.state.saved.events[1].liveTreeCount, 2);
});

test('tip drift and held worktree stop before prepared event', async () => {
  const plan = makePlan();
  const journal = createSalvageJournal(plan);
  const moved = fakeIo({
    refs: new Map([
      ['refs/heads/main', sha('a')],
      ['refs/heads/feat/old', sha('f')],
    ]),
  });
  await assert.rejects(
    runOneRef({ plan, journal, target: plan.targets[0], execute: true, io: moved.io }),
    /tip drift/u,
  );
  assert.equal(moved.state.saved, null);

  const held = fakeIo({ held: new Set(['feat/old']) });
  await assert.rejects(
    runOneRef({ plan, journal, target: plan.targets[0], execute: true, io: held.io }),
    /held by worktree/u,
  );
  assert.equal(held.state.saved, null);
});

test('absent target cannot advance while a protected ref drifted', async () => {
  const plan = makePlan({ targets: [makePlan().targets[0]] });
  const journal = createSalvageJournal(plan);
  const fake = fakeIo({
    refs: new Map([['refs/heads/main', sha('f')]]),
  });
  await assert.rejects(
    runOneRef({
      plan,
      journal,
      target: plan.targets[0],
      execute: true,
      io: fake.io,
    }),
    /absent-target check failed/u,
  );
  assert.equal(fake.state.saved, null);
  assert.equal(fake.state.deletes, 0);
});

test('crash after delete recovers prepared event with post-check', async () => {
  const plan = makePlan();
  const initial = createSalvageJournal(plan);
  const crashed = fakeIo({ crashAfterDelete: true });
  await assert.rejects(
    runOneRef({
      plan,
      journal: initial,
      target: plan.targets[0],
      execute: true,
      io: crashed.io,
    }),
    /simulated crash/u,
  );
  assert.deepEqual(crashed.state.saved.events.map((event) => event.phase), ['prepared']);
  assert.equal(crashed.state.refs.has(plan.targets[0].ref), false);

  const recovery = fakeIo({
    refs: crashed.state.refs,
    before: snapshots(),
    after: snapshots(),
  });
  const result = await runOneRef({
    plan,
    journal: crashed.state.saved,
    target: plan.targets[0],
    execute: true,
    io: recovery.io,
  });
  assert.equal(result.outcome.status, 'recovered-deleted');
  assert.deepEqual(recovery.state.saved.events.map((event) => event.phase), [
    'prepared',
    'completed',
  ]);
});

test('resume rechecks live trees before mutating a still-present ref', async () => {
  const plan = makePlan({ targets: [makePlan().targets[0]] });
  const initial = createSalvageJournal(plan);
  initial.events = [
    {
      sequence: 1,
      targetRef: plan.targets[0].ref,
      phase: 'prepared',
      expectedTip: plan.targets[0].expectedTip,
      observedTip: plan.targets[0].expectedTip,
      preparedAt: '2026-07-31T01:00:00.000Z',
      liveTreesBefore: snapshots(),
    },
  ];
  const fake = fakeIo({
    before: [
      { path: 'C:/w/main', state: 'ok', porcelain: ' D packages/core/src/index.ts' },
      { path: 'C:/w/codex', state: 'ok', porcelain: ' M docs/note.md' },
    ],
  });
  await assert.rejects(
    runOneRef({
      plan,
      journal: initial,
      target: plan.targets[0],
      execute: true,
      io: fake.io,
    }),
    /resume precheck failed/u,
  );
  assert.equal(fake.state.deletes, 0);
});

test('a target ref that survives deletion becomes a failed terminal event', async () => {
  const plan = makePlan({ targets: [makePlan().targets[0]] });
  const journal = createSalvageJournal(plan);
  const fake = fakeIo({ preserveRefAfterDelete: true });
  const result = await runOneRef({
    plan,
    journal,
    target: plan.targets[0],
    execute: true,
    io: fake.io,
  });
  assert.equal(result.outcome.status, 'postcheck-failed');
  assert.equal(fake.state.saved.events.at(-1).findings.at(-1).type, 'target-ref-present');
});

test('ADR-0020 finding is persisted as failed terminal and blocks closeout', async () => {
  const plan = makePlan({
    targets: [makePlan().targets[0]],
  });
  const journal = createSalvageJournal(plan);
  const fake = fakeIo({
    after: [
      { path: 'C:/w/main', state: 'ok', porcelain: ' D packages/core/src/index.ts' },
      { path: 'C:/w/codex', state: 'ok', porcelain: ' M docs/note.md' },
    ],
  });
  const result = await runOneRef({
    plan,
    journal,
    target: plan.targets[0],
    execute: true,
    io: fake.io,
  });
  assert.equal(result.outcome.status, 'postcheck-failed');
  assert.equal(fake.state.saved.events.at(-1).findings[0].type, 'new-deletions');

  const closeout = verifySalvageCloseout({
    plan,
    journal: fake.state.saved,
    currentRefs: fake.state.refs,
  });
  assert.equal(closeout.ok, false);
  assert.match(closeout.findings.join('\n'), /postcheck-failed/u);
});

test('closeout reconciles mutations, absent refs and live-tree checks', () => {
  const plan = makePlan();
  let journal = createSalvageJournal(plan);
  journal.events = [
    {
      sequence: 1,
      targetRef: plan.targets[0].ref,
      phase: 'completed',
      result: 'deleted',
      mutated: true,
      liveTreeCount: 15,
      findings: [],
    },
    {
      sequence: 2,
      targetRef: plan.targets[1].ref,
      phase: 'completed',
      result: 'already-absent',
      mutated: false,
      liveTreeCount: 0,
      findings: [],
    },
  ];
  const result = verifySalvageCloseout({
    plan,
    journal,
    currentRefs: new Map([['refs/heads/main', sha('a')]]),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.summary, {
    targets: 2,
    completed: 2,
    mutatingOperations: 1,
    alreadyAbsent: 1,
    liveTreeChecks: 15,
    unresolved: 0,
  });
});

test('closeout fails on unresolved prepared event and protected drift', () => {
  const plan = makePlan({ targets: [makePlan().targets[0]] });
  const journal = createSalvageJournal(plan);
  journal.events = [
    {
      sequence: 1,
      targetRef: plan.targets[0].ref,
      phase: 'prepared',
      expectedTip: plan.targets[0].expectedTip,
      observedTip: plan.targets[0].expectedTip,
      liveTreesBefore: snapshots(),
    },
  ];
  const result = verifySalvageCloseout({
    plan,
    journal,
    currentRefs: new Map([
      ['refs/heads/main', sha('f')],
      [plan.targets[0].ref, plan.targets[0].expectedTip],
    ]),
  });
  assert.equal(result.ok, false);
  assert.equal(result.summary.unresolved, 1);
  assert.match(result.findings.join('\n'), /no terminal event/u);
  assert.match(result.findings.join('\n'), /protected ref moved/u);
});
