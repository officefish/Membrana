import { hostname } from 'node:os';
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
  closeSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  AXIS_VALUES,
  classifyEvidenceCandidate,
  replayInsightLifecycle,
} from './insight-lifecycle.mjs';
import {
  atomicWrite,
  canonicalJson,
  digestJson,
  fileDigest,
  lifecyclePaths,
  loadLifecycleStore,
  rebuildProjection,
  sha256,
  sharedLifecyclePaths,
} from './insight-lifecycle-store.mjs';

const EVENT_KIND_AXIS = { AssertD: 'D', AssertL: 'L', AssertO: 'O', AssertV: 'V' };

export class OperationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'OperationError';
    this.code = code;
    this.details = details;
  }
}

function requireValue(value, code, message) {
  if (typeof value !== 'string' || value.trim() === '') throw new OperationError(code, message);
}

function deterministicId(requestKey, requestDigest, ordinal, kind, prefix) {
  return `${prefix}-${sha256(`${requestKey}\0${requestDigest}\0${ordinal}\0${kind}`).slice(0, 24)}`;
}

function replayOrThrow(baseContext, eventLog) {
  const replay = replayInsightLifecycle(baseContext, eventLog);
  if (!replay.ok) throw new OperationError('REPLAY_ERROR', replay.error.message, replay.error);
  return replay.state;
}

function currentFor(state, axis, subjectRef) {
  return state.currentAssessments[`${axis}:${subjectRef}`] ?? { kind: 'None' };
}

function assertSubject(baseContext, collection, id) {
  if (!(baseContext[collection] ?? []).some((item) => item.id === id)) {
    throw new OperationError('UNKNOWN_SUBJECT', `Unknown lifecycle subject: ${id}`);
  }
}

function git(repoRoot, args, fallback = '') {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return fallback;
  }
}

/**
 * Build an immutable, digest-pinned C7 OperationPlan.
 * proposedEvents contain exact C4 payloads without envelopes; generated IDs are filled here.
 */
export function buildOperationPlan(input) {
  requireValue(input.requestKey, 'INVALID_ARGUMENT', 'requestKey is required');
  requireValue(input.authorityRef, 'AUTHORITY_REQUIRED', 'authorityRef is required');
  const repoRoot = resolve(input.repoRoot);
  const store = input.store ?? loadLifecycleStore(repoRoot);
  const baseContext = input.proposedBaseContext ?? store.baseContext;
  const derivedRequestMetadata = {
    subjectRef: input.subjectRef ?? null,
    value: input.value ?? null,
    reason: input.reason ?? null,
    targetAssertionId: input.targetAssertionId ?? null,
    successorRevisionId: input.successorRevisionId ?? null,
    candidates: input.candidates ?? null,
    evidenceCandidate: input.evidenceCandidate ?? null,
  };
  const hasDerivedRequest = Object.values(derivedRequestMetadata).some((value) => value !== null);
  const intent = {
    schemaVersion: 1,
    requestKey: input.requestKey,
    authorityRef: input.authorityRef,
    actorRef: input.actorRef ?? 'local-operator',
    targetSubjects: [...new Set(input.targetSubjects ?? [])].sort(),
    inputRefsAndDigests: input.inputRefsAndDigests ?? [],
    requestMetadata: input.requestMetadata ??
      (hasDerivedRequest ? derivedRequestMetadata : { proposedEvents: input.proposedEvents ?? [] }),
  };
  const requestDigest = digestJson(intent);
  const operationId = deterministicId(input.requestKey, requestDigest, 0, 'Operation', 'op');
  const tailSeq = store.eventLog.at(-1)?.seq ?? 0;
  const proposedEvents = (input.proposedEvents ?? []).map((raw, index) => {
    const ordinal = index + 1;
    const event = { ...raw };
    if (EVENT_KIND_AXIS[event.kind] && !event.assertionId) {
      event.assertionId = deterministicId(input.requestKey, requestDigest, ordinal, event.kind, 'assert');
    }
    if (event.kind === 'Reopen') {
      event.newRevisionId ??= deterministicId(input.requestKey, requestDigest, ordinal, 'Revision', 'revision');
      event.initialDecisionAssertionId ??= deterministicId(input.requestKey, requestDigest, ordinal, 'AssertD', 'assert');
    }
    return {
      eventId: deterministicId(input.requestKey, requestDigest, ordinal, event.kind, 'event'),
      seq: tailSeq + ordinal,
      schemaVersion: 1,
      event,
    };
  });
  const projectedEventLog = [...store.eventLog, ...proposedEvents];
  const projected = replayOrThrow(baseContext, projectedEventLog);
  const paths = lifecyclePaths(repoRoot);
  const shared = sharedLifecyclePaths(repoRoot);
  const inputRefsAndDigests = [
    { ref: relative(repoRoot, paths.baseContext), digest: digestJson(store.baseContext) },
    { ref: relative(repoRoot, paths.eventLog), digest: digestJson(store.eventLog) },
    ...(input.inputRefsAndDigests ?? []),
  ];
  const plan = {
    schemaVersion: 1,
    operationId,
    requestKey: input.requestKey,
    requestDigest,
    actorRef: input.actorRef ?? 'local-operator',
    authorityRef: input.authorityRef,
    baseContext: {
      contextId: store.baseContext.contextId,
      schemaVersion: store.baseContext.schemaVersion,
      digest: digestJson(store.baseContext),
    },
    eventLog: { tailSeq, tailDigest: digestJson(store.eventLog) },
    repo: {
      commonGitDir: shared.commonGitDir,
      worktree: repoRoot,
      branch: git(repoRoot, ['branch', '--show-current']),
      head: git(repoRoot, ['rev-parse', 'HEAD']),
      treeDigest: sha256(git(repoRoot, ['status', '--porcelain=v1', '--untracked-files=all'])),
    },
    targetSubjects: intent.targetSubjects,
    targetPaths: [paths.baseContext, paths.eventLog],
    proposedBaseContextVersion: input.proposedBaseContext
      ? { contextId: baseContext.contextId, digest: digestJson(baseContext) }
      : null,
    proposedEvents,
    projectionPaths: [paths.currentView],
    inputRefsAndDigests,
    projectedAssessments: projected.currentAssessments,
    noOp: proposedEvents.length === 0 && !input.proposedBaseContext,
    __proposedBaseContext: input.proposedBaseContext ?? null,
  };
  return Object.freeze(plan);
}

function commonPlan(input, proposedEvents, targetSubjects, extra = {}) {
  return buildOperationPlan({ ...input, proposedEvents, targetSubjects, ...extra });
}

export function planDecide(input) {
  if (!AXIS_VALUES.D.includes(input.value) || input.value === 'proposed') {
    throw new OperationError('INVALID_ARGUMENT', 'decide accepts accepted|rejected|deferred');
  }
  assertSubject(input.store.baseContext, 'mandates', input.subjectRef);
  const state = replayOrThrow(input.store.baseContext, input.store.eventLog);
  const current = currentFor(state, 'D', input.subjectRef);
  if (current.kind === 'Conflict') throw new OperationError('CURRENT_ASSERTION_CONFLICT', 'D is in Conflict');
  if (current.kind === 'None') {
    return commonPlan(input, [{ kind: 'AssertD', subjectRef: input.subjectRef, value: input.value }], [input.subjectRef]);
  }
  if (current.assertion.value === input.value) return commonPlan(input, [], [input.subjectRef]);
  if (current.assertion.value === 'proposed') {
    return commonPlan(input, [
      { kind: 'Revoke', targetAssertionId: current.assertion.assertionId },
      { kind: 'AssertD', subjectRef: input.subjectRef, value: input.value },
    ], [input.subjectRef]);
  }
  throw new OperationError('DECISION_CORRECTION_REQUIRED', 'Existing D requires explicit correct');
}

export function planVisibility(input) {
  if (!AXIS_VALUES.V.includes(input.value)) throw new OperationError('INVALID_ARGUMENT', 'visibility must be active|archived');
  requireValue(input.reason, 'INVALID_ARGUMENT', 'reason is required');
  assertSubject(input.store.baseContext, 'representations', input.subjectRef);
  const state = replayOrThrow(input.store.baseContext, input.store.eventLog);
  const current = currentFor(state, 'V', input.subjectRef);
  if (current.kind === 'Conflict') throw new OperationError('CURRENT_ASSERTION_CONFLICT', 'V is in Conflict');
  if (current.kind === 'None') {
    return commonPlan(input, [{ kind: 'AssertV', subjectRef: input.subjectRef, value: input.value }], [input.subjectRef]);
  }
  if (current.assertion.value === input.value) return commonPlan(input, [], [input.subjectRef]);
  return commonPlan(input, [
    { kind: 'Revoke', targetAssertionId: current.assertion.assertionId },
    { kind: 'AssertV', subjectRef: input.subjectRef, value: input.value },
  ], [input.subjectRef]);
}

export function planReconcile(input) {
  const state = replayOrThrow(input.store.baseContext, input.store.eventLog);
  const events = [];
  const subjects = [];
  const evidenceSummary = { evidence: 0, hint: 0, invalid: 0, noOp: 0 };
  for (const candidate of input.candidates ?? []) {
    const result = classifyEvidenceCandidate(candidate, input.store.baseContext);
    evidenceSummary[result.classification] += 1;
    if (result.classification !== 'evidence') continue;
    const { axis, subjectRef, assertedValue } = candidate.targetClaim;
    const current = currentFor(state, axis, subjectRef);
    subjects.push(subjectRef);
    if (current.kind === 'Conflict') throw new OperationError('CURRENT_ASSERTION_CONFLICT', `${axis}:${subjectRef} is in Conflict`);
    if (current.kind === 'Some') {
      if (current.assertion.value === assertedValue) {
        evidenceSummary.noOp += 1;
        continue;
      }
      throw new OperationError('CORRECTION_REQUIRED', `${axis}:${subjectRef} requires explicit correct`);
    }
    events.push({
      kind: `Assert${axis}`,
      subjectRef,
      value: assertedValue,
      evidenceRef: candidate.evidenceRef ?? candidate.candidateId,
    });
  }
  const plan = commonPlan(input, events, subjects);
  return Object.freeze({ ...plan, evidenceSummary });
}

export function planCorrect(input) {
  const state = replayOrThrow(input.store.baseContext, input.store.eventLog);
  const old = state.assertions.find((item) => item.assertionId === input.targetAssertionId && !item.revoked);
  if (!old) throw new OperationError('UNKNOWN_SUBJECT', 'targetAssertionId is not a live assertion');
  const axis = input.axis ?? old.axis;
  if (axis !== old.axis || !AXIS_VALUES[axis]?.includes(input.value)) {
    throw new OperationError('INVALID_ARGUMENT', 'Correction axis/value does not match target');
  }
  if (['L', 'O'].includes(axis)) {
    const candidate = input.evidenceCandidate;
    const classified = classifyEvidenceCandidate(candidate, input.store.baseContext);
    if (classified.classification !== 'evidence' ||
        candidate.targetClaim.axis !== axis ||
        candidate.targetClaim.subjectRef !== old.subjectRef ||
        candidate.targetClaim.assertedValue !== input.value) {
      throw new OperationError('INVALID_EVIDENCE_REF', 'Correction needs exact C3 evidence');
    }
  }
  return commonPlan(input, [
    { kind: 'Revoke', targetAssertionId: old.assertionId },
    {
      kind: `Assert${axis}`,
      subjectRef: old.subjectRef,
      value: input.value,
      ...(input.evidenceRef ? { evidenceRef: input.evidenceRef } : {}),
    },
  ], [old.subjectRef]);
}

export function planReopen(input) {
  requireValue(input.reason, 'INVALID_ARGUMENT', 'reason is required');
  assertSubject(input.store.baseContext, 'insightRevisions', input.subjectRef);
  return commonPlan(input, [{ kind: 'Reopen', oldRevisionId: input.subjectRef }], [input.subjectRef]);
}

export function planSupersede(input) {
  requireValue(input.reason, 'INVALID_ARGUMENT', 'reason is required');
  const state = replayOrThrow(input.store.baseContext, input.store.eventLog);
  const successorExists =
    (input.store.baseContext.insightRevisions ?? []).some((item) => item.id === input.successorRevisionId) ||
    state.eventCreatedRevisionIds.includes(input.successorRevisionId);
  if (!successorExists) throw new OperationError('UNKNOWN_SUBJECT', 'successor revision does not exist');
  const old = state.assertions.find((item) => item.assertionId === input.oldDecisionAssertionId);
  if (!old || old.axis !== 'D') throw new OperationError('UNKNOWN_SUBJECT', 'old decision assertion does not exist');
  return commonPlan(input, [{
    kind: 'Supersede',
    oldDecisionAssertionId: input.oldDecisionAssertionId,
    successorRevisionId: input.successorRevisionId,
  }], [old.subjectRef, input.successorRevisionId]);
}

function readLedger(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { schemaVersion: 1, requests: {} };
}

function appendJournal(path, record) {
  const journal = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { schemaVersion: 1, records: [] };
  journal.records.push(record);
  atomicWrite(path, `${canonicalJson(journal, true)}\n`);
}

function acquireLock(path, record) {
  mkdirSync(dirname(path), { recursive: true });
  let fd;
  try {
    fd = openSync(path, 'wx');
    writeFileSync(fd, `${canonicalJson(record, true)}\n`, 'utf8');
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new OperationError('LOCKED', 'Lifecycle store is locked', { lockPath: path });
    }
    throw error;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function assertPinned(plan, store) {
  const observed = {
    base: digestJson(store.baseContext),
    log: digestJson(store.eventLog),
    tail: store.eventLog.at(-1)?.seq ?? 0,
  };
  if (observed.base !== plan.baseContext.digest ||
      observed.log !== plan.eventLog.tailDigest ||
      observed.tail !== plan.eventLog.tailSeq) {
    throw new OperationError('STALE_PRECONDITION', 'Authoritative inputs changed after planning', {
      expected: { base: plan.baseContext.digest, log: plan.eventLog.tailDigest, tail: plan.eventLog.tailSeq },
      observed,
    });
  }
}

/**
 * Execute a plan. Dry-run is the default and performs no mkdir/write/lock operation.
 */
export function executeOperationPlan(repoRoot, plan, options = {}) {
  if (!options.execute) {
    return {
      ok: true,
      mode: 'DRY-RUN',
      operationId: plan.operationId,
      inputDigests: { baseContext: plan.baseContext.digest, eventLog: plan.eventLog.tailDigest },
      subjects: plan.targetSubjects,
      proposedEvents: plan.proposedEvents,
      assessments: plan.projectedAssessments,
      diagnostics: [],
      safety: { writes: false, pinned: true },
      projectionDiff: plan.noOp ? 'none' : 'planned',
    };
  }
  const root = resolve(repoRoot);
  const shared = sharedLifecyclePaths(root);
  let ledger = readLedger(shared.ledger);
  const prior = ledger.requests[plan.requestKey];
  if (prior) {
    if (prior.requestDigest !== plan.requestDigest) {
      throw new OperationError('IDEMPOTENCY_KEY_REUSED', 'requestKey was used with a different digest', {
        requestKey: plan.requestKey,
        expected: prior.requestDigest,
        observed: plan.requestDigest,
      });
    }
    return prior.result;
  }
  if (plan.noOp) {
    return {
      ok: true, mode: 'COMMITTED', operationId: plan.operationId,
      proposedEvents: [], assessments: plan.projectedAssessments,
      safety: { writes: false, idempotentNoOp: true }, projectionDiff: 'none',
    };
  }

  const journalPath = join(shared.journals, `${plan.operationId}.json`);
  acquireLock(shared.lock, {
    operationId: plan.operationId,
    requestKey: plan.requestKey,
    requestDigest: plan.requestDigest,
    pid: process.pid,
    host: hostname(),
    worktree: root,
    branch: plan.repo.branch,
    head: plan.repo.head,
    actor: plan.actorRef,
    startedAt: new Date().toISOString(),
    journalPath,
  });
  try {
    ledger = readLedger(shared.ledger);
    const lockedPrior = ledger.requests[plan.requestKey];
    if (lockedPrior) {
      if (lockedPrior.requestDigest !== plan.requestDigest) {
        throw new OperationError('IDEMPOTENCY_KEY_REUSED', 'requestKey was used with a different digest', {
          requestKey: plan.requestKey,
          expected: lockedPrior.requestDigest,
          observed: plan.requestDigest,
        });
      }
      return lockedPrior.result;
    }
    const store = loadLifecycleStore(root);
    assertPinned(plan, store);
    const nextBase = plan.proposedBaseContextVersion
      ? plan.__proposedBaseContext
      : store.baseContext;
    const nextLog = [...store.eventLog, ...plan.proposedEvents];
    const projection = rebuildProjection(nextBase, nextLog);
    const paths = lifecyclePaths(root);
    const targets = [
      {
        path: paths.baseContext,
        beforeDigest: fileDigest(paths.baseContext),
        afterDigest: sha256(`${canonicalJson(nextBase, true)}\n`),
        before: existsSync(paths.baseContext) ? readFileSync(paths.baseContext, 'utf8') : null,
        after: `${canonicalJson(nextBase, true)}\n`,
        authoritative: true,
      },
      {
        path: paths.eventLog,
        beforeDigest: fileDigest(paths.eventLog),
        afterDigest: sha256(nextLog.map((event) => canonicalJson(event)).join('\n') + (nextLog.length ? '\n' : '')),
        before: existsSync(paths.eventLog) ? readFileSync(paths.eventLog, 'utf8') : null,
        after: nextLog.map((event) => canonicalJson(event)).join('\n') + (nextLog.length ? '\n' : ''),
        authoritative: true,
      },
      {
        path: paths.currentView,
        beforeDigest: fileDigest(paths.currentView),
        afterDigest: sha256(`${canonicalJson(projection, true)}\n`),
        before: existsSync(paths.currentView) ? readFileSync(paths.currentView, 'utf8') : null,
        after: `${canonicalJson(projection, true)}\n`,
        authoritative: false,
      },
    ];
    appendJournal(journalPath, { state: 'PREPARED', at: new Date().toISOString(), plan, targets });
    assertPinned(plan, loadLifecycleStore(root));
    appendJournal(journalPath, { state: 'APPLYING', at: new Date().toISOString() });
    for (const target of targets.filter((item) => item.authoritative)) atomicWrite(target.path, target.after);
    replayOrThrow(nextBase, nextLog);
    appendJournal(journalPath, {
      state: 'COMMITTED',
      at: new Date().toISOString(),
      baseContextDigest: digestJson(nextBase),
      eventLogDigest: digestJson(nextLog),
    });
    atomicWrite(paths.currentView, targets.find((item) => !item.authoritative).after);
    appendJournal(journalPath, { state: 'PROJECTED', at: new Date().toISOString() });
    const result = JSON.parse(canonicalJson({
      ok: true,
      mode: 'COMMITTED',
      operationId: plan.operationId,
      inputDigests: { baseContext: plan.baseContext.digest, eventLog: plan.eventLog.tailDigest },
      subjects: plan.targetSubjects,
      proposedEvents: plan.proposedEvents,
      assessments: projection.currentAssessments,
      diagnostics: [],
      safety: { writes: true, lock: 'exclusive', journal: journalPath },
      projectionDiff: 'rebuilt',
    }));
    ledger.requests[plan.requestKey] = { requestDigest: plan.requestDigest, operationId: plan.operationId, result };
    atomicWrite(shared.ledger, `${canonicalJson(ledger, true)}\n`);
    appendJournal(journalPath, { state: 'DONE', at: new Date().toISOString() });
    return result;
  } finally {
    rmSync(shared.lock, { force: true });
  }
}

/**
 * Recover a PREPARED/APPLYING journal when every target still has its recorded before hash.
 */
export function recoverPreparedJournal(journalPath) {
  const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
  const prepared = journal.records.find((record) => record.state === 'PREPARED');
  if (!prepared) return { ok: true, state: 'ABORTED', changed: false };
  const unexpected = prepared.targets.filter((target) => fileDigest(target.path) !== target.beforeDigest);
  if (unexpected.length) {
    throw new OperationError('BLOCKED_EXTERNAL_MUTATION', 'Target differs from PREPARED before hash', {
      paths: unexpected.map((item) => item.path),
    });
  }
  appendJournal(journalPath, { state: 'ABORTED', at: new Date().toISOString(), reason: 'targets-at-before-hashes' });
  return { ok: true, state: 'ABORTED', changed: false };
}
