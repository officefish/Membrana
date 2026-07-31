/**
 * Controlled branch salvage procedure.
 *
 * Pure contracts and one-ref state machine live here. Git/fs/network adapters
 * are supplied by the CLI so tests never mutate repository refs.
 */
import { createHash } from 'node:crypto';

import {
  analyzeLiveTreePostCheck,
  formatPostCheckFinding,
  snapshotFindings,
} from './worktree-demolition.mjs';

export const SALVAGE_PLAN_SCHEMA_VERSION = 1;
export const SALVAGE_JOURNAL_SCHEMA_VERSION = 1;

export const SALVAGE_FRAMES = Object.freeze([
  { id: 'freeze-snapshot', title: 'freeze inventory snapshot' },
  { id: 'reconcile-current-refs', title: 'reconcile current refs and twins' },
  { id: 'ratify-plan', title: 'ratify exact-tip plan' },
  { id: 'prepare-one-ref', title: 'snapshot live trees and journal prepared event' },
  { id: 'mutate-one-ref', title: 'mutate exactly one ref' },
  { id: 'postcheck-closeout', title: 'post-check live trees and close the event' },
]);

const FULL_SHA = /^[0-9a-f]{40}$/u;
const SUCCESS_RESULTS = new Set(['deleted', 'already-absent', 'recovered-deleted']);
const ACTIONS = new Set(['delete-local-ref', 'delete-remote-ref']);
const PROTECTED_BRANCH_NAMES = new Set([
  'main',
  'master',
  'vesnin',
  'ozhegov',
  'boyarskiy',
  'dynin',
]);

function sortedValue(value) {
  if (Array.isArray(value)) return value.map(sortedValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortedValue(value[key])]),
  );
}

export function stableStringify(value) {
  return JSON.stringify(sortedValue(value));
}

export function hashSalvagePlan(plan) {
  return createHash('sha256').update(stableStringify(plan)).digest('hex');
}

function requireText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

function requireFullSha(value, label) {
  const sha = requireText(value, label);
  if (!FULL_SHA.test(sha)) throw new Error(`${label} must be a full 40-char lowercase SHA`);
  return sha;
}

function assertRefAction(ref, action) {
  if (action === 'delete-local-ref' && !ref.startsWith('refs/heads/')) {
    throw new Error(`delete-local-ref requires refs/heads/*: ${ref}`);
  }
  if (action === 'delete-remote-ref' && !ref.startsWith('refs/remotes/origin/')) {
    throw new Error(`delete-remote-ref requires refs/remotes/origin/*: ${ref}`);
  }
}

function assertTargetRefAllowed(ref) {
  const branch = logicalBranch(ref);
  if (PROTECTED_BRANCH_NAMES.has(branch) || branch.startsWith('base/')) {
    throw new Error(`protected branch cannot be a salvage target: ${ref}`);
  }
}

export function validateSalvagePlan(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new Error('plan must be an object');
  }
  if (plan.schemaVersion !== SALVAGE_PLAN_SCHEMA_VERSION) {
    throw new Error(`unsupported plan schemaVersion: ${plan.schemaVersion}`);
  }
  requireText(plan.id, 'plan.id');
  requireFullSha(plan.baseSha, 'plan.baseSha');

  const gate = plan.ownerGate;
  if (!gate || !['draft', 'ratified'].includes(gate.status)) {
    throw new Error('plan.ownerGate.status must be draft or ratified');
  }
  if (gate.status === 'ratified') {
    requireText(gate.ratifiedBy, 'plan.ownerGate.ratifiedBy');
    requireText(gate.ratifiedAt, 'plan.ownerGate.ratifiedAt');
    requireText(gate.evidence, 'plan.ownerGate.evidence');
  }

  if (!Array.isArray(plan.targets) || plan.targets.length === 0) {
    throw new Error('plan.targets must contain at least one target');
  }
  if (!Array.isArray(plan.protectedRefs)) {
    throw new Error('plan.protectedRefs must be an array');
  }

  const targetRefs = new Set();
  for (const [index, target] of plan.targets.entries()) {
    const prefix = `plan.targets[${index}]`;
    const ref = requireText(target?.ref, `${prefix}.ref`);
    if (!ACTIONS.has(target?.action)) throw new Error(`${prefix}.action is unsupported`);
    assertRefAction(ref, target.action);
    assertTargetRefAllowed(ref);
    requireFullSha(target.expectedTip, `${prefix}.expectedTip`);
    requireText(target.verdict, `${prefix}.verdict`);
    requireText(target.evidence, `${prefix}.evidence`);
    if (targetRefs.has(ref)) throw new Error(`duplicate target ref: ${ref}`);
    targetRefs.add(ref);
  }

  const protectedRefs = new Set();
  for (const [index, item] of plan.protectedRefs.entries()) {
    const prefix = `plan.protectedRefs[${index}]`;
    const ref = requireText(item?.ref, `${prefix}.ref`);
    requireFullSha(item.expectedTip, `${prefix}.expectedTip`);
    if (protectedRefs.has(ref)) throw new Error(`duplicate protected ref: ${ref}`);
    if (targetRefs.has(ref)) throw new Error(`ref is both target and protected: ${ref}`);
    protectedRefs.add(ref);
  }
  return plan;
}

function canonicalRowRef(row, scope) {
  if (row.ref) return row.ref;
  if (scope === 'remote' || String(row.name).startsWith('origin/')) {
    const short = String(row.name).replace(/^origin\//u, '');
    return `refs/remotes/origin/${short}`;
  }
  return `refs/heads/${row.name}`;
}

export function flattenInventory(inventory) {
  const rows = [];
  for (const [scope, source] of [
    ['local', inventory?.local ?? []],
    ['remote', inventory?.remote ?? []],
  ]) {
    for (const row of source) {
      rows.push({
        ref: canonicalRowRef(row, scope),
        name: row.name,
        scope,
        tip: row.tip ?? '',
        worktree: Boolean(row.worktree),
      });
    }
  }
  return rows;
}

export function diagnoseSnapshotTwins(inventory) {
  const local = new Map(
    (inventory?.local ?? []).map((row) => [
      String(row.name),
      { ...row, ref: canonicalRowRef(row, 'local') },
    ]),
  );
  const twins = [];
  for (const remoteRow of inventory?.remote ?? []) {
    const shortName = String(remoteRow.name).replace(/^origin\//u, '');
    const localRow = local.get(shortName);
    if (!localRow) continue;
    const status =
      localRow.tip && remoteRow.tip
        ? localRow.tip === remoteRow.tip
          ? 'exact'
          : 'moved'
        : 'unknown';
    twins.push({
      branch: shortName,
      localRef: localRow.ref,
      remoteRef: canonicalRowRef(remoteRow, 'remote'),
      localTip: localRow.tip ?? '',
      remoteTip: remoteRow.tip ?? '',
      status,
    });
  }
  return twins.sort((a, b) => a.branch.localeCompare(b.branch));
}

export function reconcileInventories(frozen, current) {
  const frozenRows = flattenInventory(frozen);
  const currentRows = flattenInventory(current);
  const currentByRef = new Map(currentRows.map((row) => [row.ref, row]));
  const frozenRefs = new Set(frozenRows.map((row) => row.ref));

  const rows = frozenRows.map((row) => {
    const live = currentByRef.get(row.ref);
    if (!live) return { ...row, frozenTip: row.tip, currentTip: '', status: 'absent' };
    const status = row.tip && live.tip && row.tip === live.tip ? 'unchanged' : 'moved';
    return {
      ...row,
      frozenTip: row.tip,
      currentTip: live.tip,
      status,
      worktree: live.worktree,
    };
  });
  for (const row of currentRows) {
    if (frozenRefs.has(row.ref)) continue;
    rows.push({
      ...row,
      frozenTip: '',
      currentTip: row.tip,
      status: 'new',
    });
  }

  const counts = { unchanged: 0, absent: 0, moved: 0, new: 0 };
  for (const row of rows) counts[row.status] += 1;
  return {
    frozenBaseSha: frozen?.baseSha ?? '',
    currentBaseSha: current?.baseSha ?? '',
    baseMoved: Boolean(
      frozen?.baseSha && current?.baseSha && frozen.baseSha !== current.baseSha,
    ),
    rows: rows.sort((a, b) => a.ref.localeCompare(b.ref)),
    counts,
    twins: diagnoseSnapshotTwins(current),
  };
}

function asRefMap(refs) {
  if (refs instanceof Map) return refs;
  return new Map(Object.entries(refs ?? {}));
}

function logicalBranch(ref) {
  return String(ref)
    .replace(/^refs\/heads\//u, '')
    .replace(/^refs\/remotes\/origin\//u, '');
}

export function assessPlanTargets(plan, currentRefs, heldBranches = new Set()) {
  validateSalvagePlan(plan);
  const refs = asRefMap(currentRefs);
  return plan.targets.map((target) => {
    const currentTip = refs.get(target.ref) ?? '';
    let status = 'ready';
    if (!currentTip) status = 'absent';
    else if (currentTip !== target.expectedTip) status = 'moved';
    else if (heldBranches.has(logicalBranch(target.ref))) status = 'held';
    return { ...target, currentTip, status };
  });
}

export function createSalvageJournal(plan, at = new Date().toISOString()) {
  validateSalvagePlan(plan);
  return {
    schemaVersion: SALVAGE_JOURNAL_SCHEMA_VERSION,
    planId: plan.id,
    planHash: hashSalvagePlan(plan),
    createdAt: at,
    events: [],
  };
}

export function validateSalvageJournal(plan, journal) {
  validateSalvagePlan(plan);
  if (!journal || journal.schemaVersion !== SALVAGE_JOURNAL_SCHEMA_VERSION) {
    throw new Error(`unsupported journal schemaVersion: ${journal?.schemaVersion}`);
  }
  if (journal.planId !== plan.id) throw new Error('journal planId does not match plan');
  if (journal.planHash !== hashSalvagePlan(plan)) {
    throw new Error('plan hash drift: journal belongs to another plan revision');
  }
  if (!Array.isArray(journal.events)) throw new Error('journal.events must be an array');
  return journal;
}

function eventsFor(journal, ref) {
  return journal.events.filter((event) => event.targetRef === ref);
}

function latestEvent(journal, ref, phase) {
  return eventsFor(journal, ref).filter((event) => event.phase === phase).at(-1) ?? null;
}

function appendEvent(journal, event) {
  return {
    ...journal,
    events: [
      ...journal.events,
      {
        sequence: journal.events.length + 1,
        ...event,
      },
    ],
  };
}

function successfulTerminal(journal, ref) {
  const terminal = latestEvent(journal, ref, 'completed');
  return terminal && SUCCESS_RESULTS.has(terminal.result) ? terminal : null;
}

export function selectPlanTarget(plan, journal, { targetRef = '', next = false } = {}) {
  validateSalvagePlan(plan);
  if (Boolean(targetRef) === Boolean(next)) {
    throw new Error('choose exactly one: --target <ref> or --next');
  }
  if (targetRef) {
    const target = plan.targets.find((item) => item.ref === targetRef);
    if (!target) throw new Error(`target is not in plan: ${targetRef}`);
    return target;
  }
  for (const target of plan.targets) {
    const terminal = latestEvent(journal, target.ref, 'completed');
    if (!terminal) return target;
    if (!SUCCESS_RESULTS.has(terminal.result)) {
      throw new Error(`target has failed terminal event: ${target.ref} (${terminal.result})`);
    }
  }
  return null;
}

function protectedRefFindings(plan, refs) {
  const map = asRefMap(refs);
  const findings = [];
  for (const item of plan.protectedRefs) {
    const current = map.get(item.ref);
    if (!current) findings.push({ type: 'protected-ref-absent', ref: item.ref });
    else if (current !== item.expectedTip) {
      findings.push({
        type: 'protected-ref-moved',
        ref: item.ref,
        expectedTip: item.expectedTip,
        currentTip: current,
      });
    }
  }
  return findings;
}

function formatFinding(finding) {
  if (finding.path) return formatPostCheckFinding(finding);
  if (finding.type === 'protected-ref-absent') return `${finding.ref}: protected ref absent`;
  if (finding.type === 'protected-ref-moved') {
    return `${finding.ref}: protected ref moved ${finding.expectedTip.slice(0, 12)} -> ${finding.currentTip.slice(0, 12)}`;
  }
  if (finding.type === 'target-ref-present') return `${finding.ref}: target ref is present`;
  return String(finding.message ?? finding.type ?? finding);
}

function assertNoFindings(findings, label) {
  if (findings.length > 0) {
    throw new Error(`${label}: ${findings.map(formatFinding).join('; ')}`);
  }
}

async function completeRecoveredDeletion({ plan, journal, target, prepared, io, now }) {
  const after = await io.snapshotLiveTrees();
  const finalRefs = await io.loadRefs();
  const findings = [
    ...analyzeLiveTreePostCheck(prepared.liveTreesBefore, after),
    ...protectedRefFindings(plan, finalRefs),
  ];
  if (asRefMap(finalRefs).has(target.ref)) {
    findings.push({ type: 'target-ref-present', ref: target.ref });
  }
  const result = findings.length === 0 ? 'recovered-deleted' : 'postcheck-failed';
  const nextJournal = appendEvent(journal, {
    targetRef: target.ref,
    phase: 'completed',
    result,
    mutated: true,
    recovered: true,
    expectedTip: target.expectedTip,
    completedAt: now(),
    liveTreeCount: after.length,
    findings,
  });
  await io.saveJournal(nextJournal);
  return {
    journal: nextJournal,
    outcome: { status: result, mutated: true, findings },
  };
}

/**
 * Execute or recover exactly one target.
 *
 * io: loadRefs, heldBranches, snapshotLiveTrees, deleteRef, saveJournal.
 */
export async function runOneRef({
  plan,
  journal,
  target,
  execute = false,
  io,
  now = () => new Date().toISOString(),
}) {
  validateSalvagePlan(plan);
  validateSalvageJournal(plan, journal);
  if (!target) return { journal, outcome: { status: 'complete', mutated: false } };

  const refs = await io.loadRefs();
  const held = await io.heldBranches();
  const assessment = assessPlanTargets(plan, refs, held).find((row) => row.ref === target.ref);
  if (!execute) return { journal, outcome: { status: 'planned', mutated: false, assessment } };

  if (plan.ownerGate.status !== 'ratified') {
    throw new Error('execute requires plan.ownerGate.status=ratified');
  }

  const done = successfulTerminal(journal, target.ref);
  if (done) return { journal, outcome: { status: 'already-complete', mutated: false, event: done } };
  const failed = latestEvent(journal, target.ref, 'completed');
  if (failed) throw new Error(`target has failed terminal event: ${target.ref} (${failed.result})`);

  let prepared = latestEvent(journal, target.ref, 'prepared');
  const currentTip = asRefMap(refs).get(target.ref) ?? '';

  if (!currentTip) {
    if (!prepared) {
      assertNoFindings(
        protectedRefFindings(plan, refs),
        'protected-ref absent-target check failed',
      );
      const nextJournal = appendEvent(journal, {
        targetRef: target.ref,
        phase: 'completed',
        result: 'already-absent',
        mutated: false,
        expectedTip: target.expectedTip,
        completedAt: now(),
        liveTreeCount: 0,
        findings: [],
      });
      await io.saveJournal(nextJournal);
      return {
        journal: nextJournal,
        outcome: { status: 'already-absent', mutated: false },
      };
    }

    return completeRecoveredDeletion({ plan, journal, target, prepared, io, now });
  }

  if (currentTip !== target.expectedTip) {
    throw new Error(
      `tip drift for ${target.ref}: expected ${target.expectedTip}, current ${currentTip}`,
    );
  }
  if (held.has(logicalBranch(target.ref))) {
    throw new Error(`target branch is held by worktree: ${logicalBranch(target.ref)}`);
  }
  assertNoFindings(protectedRefFindings(plan, refs), 'protected-ref precheck failed');

  if (!prepared) {
    const before = await io.snapshotLiveTrees();
    assertNoFindings(snapshotFindings(before), 'live-tree precheck failed');
    journal = appendEvent(journal, {
      targetRef: target.ref,
      phase: 'prepared',
      expectedTip: target.expectedTip,
      observedTip: currentTip,
      preparedAt: now(),
      liveTreesBefore: before,
    });
    await io.saveJournal(journal);
    prepared = latestEvent(journal, target.ref, 'prepared');
  } else if (prepared.observedTip !== target.expectedTip) {
    throw new Error(`prepared event tip does not match plan: ${target.ref}`);
  } else {
    const resumedBefore = await io.snapshotLiveTrees();
    assertNoFindings(
      analyzeLiveTreePostCheck(prepared.liveTreesBefore, resumedBefore),
      'live-tree resume precheck failed',
    );
  }

  const refsBeforeDelete = await io.loadRefs();
  const tipBeforeDelete = asRefMap(refsBeforeDelete).get(target.ref) ?? '';
  if (!tipBeforeDelete) {
    return completeRecoveredDeletion({
      plan,
      journal,
      target,
      prepared,
      io,
      now,
    });
  }
  if (tipBeforeDelete !== target.expectedTip) {
    throw new Error(
      `tip drift before mutation for ${target.ref}: expected ${target.expectedTip}, current ${tipBeforeDelete}`,
    );
  }
  const heldBeforeDelete = await io.heldBranches();
  if (heldBeforeDelete.has(logicalBranch(target.ref))) {
    throw new Error(`target branch became held by worktree: ${logicalBranch(target.ref)}`);
  }
  assertNoFindings(
    protectedRefFindings(plan, refsBeforeDelete),
    'protected-ref pre-mutation check failed',
  );

  await io.deleteRef(target);
  const after = await io.snapshotLiveTrees();
  const refsAfter = await io.loadRefs();
  const findings = [
    ...analyzeLiveTreePostCheck(prepared.liveTreesBefore, after),
    ...protectedRefFindings(plan, refsAfter),
  ];
  if (asRefMap(refsAfter).has(target.ref)) {
    findings.push({ type: 'target-ref-present', ref: target.ref });
  }
  const result = findings.length === 0 ? 'deleted' : 'postcheck-failed';
  const nextJournal = appendEvent(journal, {
    targetRef: target.ref,
    phase: 'completed',
    result,
    mutated: true,
    recovered: false,
    expectedTip: target.expectedTip,
    completedAt: now(),
    liveTreeCount: after.length,
    findings,
  });
  await io.saveJournal(nextJournal);
  return {
    journal: nextJournal,
    outcome: { status: result, mutated: true, findings },
  };
}

export function verifySalvageCloseout({ plan, journal, currentRefs }) {
  const findings = [];
  try {
    validateSalvageJournal(plan, journal);
  } catch (error) {
    return {
      ok: false,
      findings: [String(error.message ?? error)],
      summary: {
        targets: plan?.targets?.length ?? 0,
        completed: 0,
        mutatingOperations: 0,
        alreadyAbsent: 0,
        liveTreeChecks: 0,
        unresolved: plan?.targets?.length ?? 0,
      },
    };
  }

  const refs = asRefMap(currentRefs);
  let completed = 0;
  let mutatingOperations = 0;
  let alreadyAbsent = 0;
  let liveTreeChecks = 0;

  for (const target of plan.targets) {
    const terminal = latestEvent(journal, target.ref, 'completed');
    if (!terminal) {
      findings.push(`${target.ref}: no terminal event`);
      continue;
    }
    if (!SUCCESS_RESULTS.has(terminal.result)) {
      findings.push(`${target.ref}: terminal result ${terminal.result}`);
      continue;
    }
    completed += 1;
    if (terminal.result === 'already-absent') alreadyAbsent += 1;
    else {
      mutatingOperations += 1;
      liveTreeChecks += Number(terminal.liveTreeCount) || 0;
      if ((terminal.findings ?? []).length > 0) {
        findings.push(`${target.ref}: terminal findings are not empty`);
      }
    }
    if (refs.has(target.ref)) findings.push(`${target.ref}: ref exists after terminal event`);
  }
  findings.push(...protectedRefFindings(plan, refs).map(formatFinding));

  const unresolved = plan.targets.length - completed;
  return {
    ok: findings.length === 0 && unresolved === 0,
    findings,
    summary: {
      targets: plan.targets.length,
      completed,
      mutatingOperations,
      alreadyAbsent,
      liveTreeChecks,
      unresolved,
    },
  };
}

function short(value) {
  return value ? String(value).slice(0, 12) : '—';
}

export function renderReconciliation({
  reconciliation,
  snapshotPath,
  currentGeneratedAt,
  planAssessment = [],
}) {
  const lines = [
    '# Branch salvage reconciliation',
    '',
    '## Meta',
    '',
    `- snapshot: \`${snapshotPath}\``,
    `- frozen base: \`${reconciliation.frozenBaseSha || 'unknown'}\``,
    `- current base: \`${reconciliation.currentBaseSha || 'unknown'}\``,
    `- base moved: ${reconciliation.baseMoved ? 'yes' : 'no'}`,
    `- generated: ${currentGeneratedAt || 'unknown'}`,
    '',
    '## Ref reconciliation',
    '',
    '| Ref | Frozen tip | Current tip | Status | Worktree |',
    '| --- | --- | --- | --- | --- |',
    ...reconciliation.rows.map((row) =>
      `| \`${row.ref}\` | \`${short(row.frozenTip)}\` | \`${short(row.currentTip)}\` | ${row.status} | ${row.worktree ? 'yes' : ''} |`),
    '',
    '## Twin diagnostics',
    '',
    reconciliation.twins.length === 0
      ? '_none_'
      : [
          '| Branch | Local tip | Remote tip | Status |',
          '| --- | --- | --- | --- |',
          ...reconciliation.twins.map((row) =>
            `| \`${row.branch}\` | \`${short(row.localTip)}\` | \`${short(row.remoteTip)}\` | ${row.status} |`),
        ].join('\n'),
    '',
  ];
  if (planAssessment.length > 0) {
    lines.push(
      '## Plan targets',
      '',
      '| Ref | Expected tip | Current tip | Status |',
      '| --- | --- | --- | --- |',
      ...planAssessment.map((row) =>
        `| \`${row.ref}\` | \`${short(row.expectedTip)}\` | \`${short(row.currentTip)}\` | ${row.status} |`),
      '',
    );
  }
  return `${lines.join('\n')}\n`;
}

export function renderExecutionJournal(plan, journal) {
  const lines = [
    `# Branch salvage execution — ${plan.id}`,
    '',
    '## Meta',
    '',
    `- plan hash: \`${journal.planHash}\``,
    `- owner gate: ${plan.ownerGate.status}`,
    `- targets: ${plan.targets.length}`,
    '- mutation contract: one ref per execute invocation',
    '',
    '## Events',
    '',
    '| # | Ref | Phase | Result | Mutated | Live trees | Findings |',
    '| ---: | --- | --- | --- | --- | ---: | --- |',
    ...journal.events.map((event) =>
      `| ${event.sequence} | \`${event.targetRef}\` | ${event.phase} | ${event.result ?? '—'} | ${event.mutated ? 'yes' : ''} | ${event.liveTreeCount ?? '—'} | ${(event.findings ?? []).map(formatFinding).join('<br>') || '—'} |`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

export function renderCloseout(plan, journal, result) {
  const { summary } = result;
  return [
    `# Branch salvage closeout — ${plan.id}`,
    '',
    `status: **${result.ok ? 'PASS' : 'FAIL'}**`,
    '',
    '| Fact | Count |',
    '| --- | ---: |',
    `| Targets | ${summary.targets} |`,
    `| Completed | ${summary.completed} |`,
    `| Mutating operations | ${summary.mutatingOperations} |`,
    `| Already absent | ${summary.alreadyAbsent} |`,
    `| Live-tree checks | ${summary.liveTreeChecks} |`,
    `| Unresolved | ${summary.unresolved} |`,
    '',
    '## Findings',
    '',
    ...(result.findings.length > 0 ? result.findings.map((item) => `- ${item}`) : ['_none_']),
    '',
    `plan hash: \`${journal.planHash}\``,
    '',
  ].join('\n');
}
