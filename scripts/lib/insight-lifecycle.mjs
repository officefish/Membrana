/**
 * Pure Membrana Insight lifecycle core.
 *
 * Canon: docs/meeting/insight-archive-lifecycle/C1_VERDICT.md .. C7_VERDICT.md.
 * No filesystem, git, network, clock or environment reads are allowed in this module.
 */

export const LIFECYCLE_SCHEMA_VERSION = 1;

export const AXIS_VALUES = Object.freeze({
  D: Object.freeze(['proposed', 'accepted', 'rejected', 'deferred']),
  L: Object.freeze(['delivered', 'not-delivered']),
  O: Object.freeze(['realized', 'not-realized']),
  V: Object.freeze(['active', 'archived']),
});

const ASSERT_KINDS = Object.freeze({
  AssertD: 'D',
  AssertL: 'L',
  AssertO: 'O',
  AssertV: 'V',
});

export class LifecycleError extends Error {
  /** @param {string} code @param {string} message @param {Record<string, unknown>} [details] */
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'LifecycleError';
    this.code = code;
    this.details = details;
  }
}

/** @param {unknown} value @param {string} code @param {string} message */
function invariant(value, code, message) {
  if (!value) throw new LifecycleError(code, message);
}

/** @param {unknown} value */
function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

/** @param {unknown} value */
function array(value) {
  return Array.isArray(value) ? value : [];
}

/** @param {string} axis @param {string} subjectRef */
export function assessmentKey(axis, subjectRef) {
  return `${axis}:${subjectRef}`;
}

/**
 * Validate and index immutable BaseContext.
 * @param {Record<string, unknown>} baseContext
 */
export function indexBaseContext(baseContext) {
  invariant(baseContext && typeof baseContext === 'object', 'BASE_CONTEXT_INVALID', 'BaseContext must be an object');
  invariant(nonEmptyString(baseContext.contextId), 'BASE_CONTEXT_INVALID', 'BaseContext.contextId is required');
  invariant(Number.isInteger(baseContext.schemaVersion), 'BASE_CONTEXT_INVALID', 'BaseContext.schemaVersion must be an integer');

  const revisions = new Map();
  const mandates = new Map();
  const slices = new Map();
  const representations = new Map();
  const seen = new Set();

  const add = (map, records, kind) => {
    for (const record of array(records)) {
      invariant(record && typeof record === 'object' && nonEmptyString(record.id), 'BASE_CONTEXT_INVALID', `${kind}.id is required`);
      invariant(!seen.has(record.id), 'BASE_CONTEXT_INVALID', `Duplicate BaseContext id: ${record.id}`);
      seen.add(record.id);
      map.set(record.id, Object.freeze({ ...record }));
    }
  };

  add(revisions, baseContext.insightRevisions, 'InsightRevision');
  add(mandates, baseContext.mandates, 'Mandate');
  add(slices, baseContext.slices, 'Slice');
  add(representations, baseContext.representations, 'Representation');

  for (const mandate of mandates.values()) {
    invariant(revisions.has(mandate.insightRevisionRef), 'BASE_CONTEXT_INVALID', `Mandate ${mandate.id} has unknown insightRevisionRef`);
  }
  for (const slice of slices.values()) {
    invariant(mandates.has(slice.mandateRef), 'BASE_CONTEXT_INVALID', `Slice ${slice.id} has unknown mandateRef`);
  }
  for (const relation of array(baseContext.transcriptionRelations)) {
    invariant(nonEmptyString(relation.taskRef) && mandates.has(relation.mandateRef), 'BASE_CONTEXT_INVALID', 'Task→Mandate relation is malformed');
  }

  return { revisions, mandates, slices, representations };
}

/** @param {string} axis @param {string} subjectRef @param {ReturnType<typeof indexBaseContext>} base @param {Set<string>} eventRevisions */
function subjectExists(axis, subjectRef, base, eventRevisions) {
  if (axis === 'D') return base.mandates.has(subjectRef) || base.revisions.has(subjectRef) || eventRevisions.has(subjectRef);
  if (axis === 'L' || axis === 'O') return base.slices.has(subjectRef);
  if (axis === 'V') return base.representations.has(subjectRef);
  return false;
}

/**
 * Deterministically replay exact C4 EventEnvelope records.
 * @param {Record<string, unknown>} baseContext
 * @param {Record<string, unknown>[]} eventLog
 * @param {number} [targetSchemaVersion]
 */
export function replayInsightLifecycle(baseContext, eventLog, targetSchemaVersion = LIFECYCLE_SCHEMA_VERSION) {
  const base = indexBaseContext(baseContext);
  invariant(targetSchemaVersion === LIFECYCLE_SCHEMA_VERSION, 'UNSUPPORTED_SCHEMA_VERSION', `Unsupported target schema: ${targetSchemaVersion}`);

  const eventIds = new Set();
  const seqs = new Set();
  const assertions = new Map();
  const revoked = new Set();
  const supersedes = [];
  const reopens = [];
  const eventRevisions = new Set();
  let previousSeq = -Infinity;

  for (const envelope of eventLog) {
    try {
      invariant(envelope && typeof envelope === 'object', 'EVENT_LOG_INVALID', 'EventEnvelope must be an object');
      invariant(nonEmptyString(envelope.eventId), 'EVENT_LOG_INVALID', 'eventId is required');
      invariant(Number.isInteger(envelope.seq), 'EVENT_LOG_INVALID', 'seq must be an integer');
      invariant(!eventIds.has(envelope.eventId), 'DUPLICATE_EVENT_ID', `Duplicate eventId: ${envelope.eventId}`);
      invariant(!seqs.has(envelope.seq) && envelope.seq > previousSeq, 'INVALID_EVENT_ORDER', `Invalid seq: ${envelope.seq}`);
      invariant(envelope.schemaVersion === LIFECYCLE_SCHEMA_VERSION, 'UNSUPPORTED_SCHEMA_VERSION', `Unsupported event schema: ${envelope.schemaVersion}`);
      invariant(envelope.event && typeof envelope.event === 'object', 'EVENT_LOG_INVALID', 'event payload is required');
      eventIds.add(envelope.eventId);
      seqs.add(envelope.seq);
      previousSeq = envelope.seq;

      const event = envelope.event;
      const axis = ASSERT_KINDS[event.kind];
      if (axis) {
        invariant(nonEmptyString(event.assertionId) && !assertions.has(event.assertionId), 'ASSERTION_ID_NOT_FRESH', `Assertion ID is not fresh: ${event.assertionId}`);
        invariant(nonEmptyString(event.subjectRef) && subjectExists(axis, event.subjectRef, base, eventRevisions), 'WRONG_SUBJECT_REF', `Unknown ${axis} subject: ${event.subjectRef}`);
        invariant(AXIS_VALUES[axis].includes(event.value), 'WRONG_AXIS_VALUE', `Invalid ${axis} value: ${event.value}`);
        assertions.set(event.assertionId, Object.freeze({
          assertionId: event.assertionId,
          axis,
          subjectRef: event.subjectRef,
          value: event.value,
          evidenceRef: event.evidenceRef,
          eventId: envelope.eventId,
          seq: envelope.seq,
        }));
        continue;
      }

      if (event.kind === 'Revoke') {
        invariant(assertions.has(event.targetAssertionId), 'MISSING_ASSERTION_REF', `Unknown assertion: ${event.targetAssertionId}`);
        invariant(!revoked.has(event.targetAssertionId), 'REPEATED_REVOKE', `Assertion already revoked: ${event.targetAssertionId}`);
        revoked.add(event.targetAssertionId);
        continue;
      }

      if (event.kind === 'Supersede') {
        const old = assertions.get(event.oldDecisionAssertionId);
        invariant(old?.axis === 'D', 'INVALID_SUPERSEDE', 'Supersede requires an existing D assertion');
        invariant(base.revisions.has(event.successorRevisionId) || eventRevisions.has(event.successorRevisionId), 'INVALID_SUPERSEDE', `Unknown successor revision: ${event.successorRevisionId}`);
        supersedes.push(Object.freeze({
          oldDecisionAssertionId: event.oldDecisionAssertionId,
          successorRevisionId: event.successorRevisionId,
          eventId: envelope.eventId,
        }));
        continue;
      }

      if (event.kind === 'Reopen') {
        invariant(base.revisions.has(event.oldRevisionId) || eventRevisions.has(event.oldRevisionId), 'INVALID_REOPEN', `Unknown old revision: ${event.oldRevisionId}`);
        invariant(nonEmptyString(event.newRevisionId) && !base.revisions.has(event.newRevisionId) && !eventRevisions.has(event.newRevisionId), 'REVISION_ID_NOT_FRESH', `Revision ID is not fresh: ${event.newRevisionId}`);
        invariant(nonEmptyString(event.initialDecisionAssertionId) && !assertions.has(event.initialDecisionAssertionId), 'ASSERTION_ID_NOT_FRESH', `Assertion ID is not fresh: ${event.initialDecisionAssertionId}`);
        eventRevisions.add(event.newRevisionId);
        assertions.set(event.initialDecisionAssertionId, Object.freeze({
          assertionId: event.initialDecisionAssertionId,
          axis: 'D',
          subjectRef: event.newRevisionId,
          value: 'proposed',
          eventId: envelope.eventId,
          seq: envelope.seq,
        }));
        reopens.push(Object.freeze({ ...event, eventId: envelope.eventId }));
        continue;
      }

      throw new LifecycleError('UNKNOWN_EVENT_KIND', `Unknown event kind: ${event.kind}`);
    } catch (error) {
      if (error instanceof LifecycleError) {
        return { ok: false, error: { code: error.code, message: error.message, seq: envelope?.seq, eventId: envelope?.eventId, ...error.details } };
      }
      throw error;
    }
  }

  const liveByKey = new Map();
  for (const assertion of assertions.values()) {
    if (revoked.has(assertion.assertionId)) continue;
    const key = assessmentKey(assertion.axis, assertion.subjectRef);
    const live = liveByKey.get(key) ?? [];
    live.push(assertion);
    liveByKey.set(key, live);
  }

  const currentAssessments = {};
  for (const [key, live] of [...liveByKey.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (live.length === 1) {
      currentAssessments[key] = { kind: 'Some', assertion: live[0] };
    } else {
      currentAssessments[key] = { kind: 'Conflict', assertionIds: live.map((item) => item.assertionId).sort() };
    }
  }

  return {
    ok: true,
    state: {
      contextId: baseContext.contextId,
      assertions: [...assertions.values()].map((assertion) => ({ ...assertion, revoked: revoked.has(assertion.assertionId) })),
      currentAssessments,
      supersedes,
      reopens,
      eventCreatedRevisionIds: [...eventRevisions].sort(),
    },
  };
}

/** @param {Record<string, unknown>} targetClaim */
function validateTargetClaim(targetClaim) {
  if (!targetClaim || !['L', 'O'].includes(targetClaim.axis)) return 'INVALID_TARGET';
  if (!nonEmptyString(targetClaim.subjectRef)) return 'INVALID_TARGET';
  if (!AXIS_VALUES[targetClaim.axis].includes(targetClaim.assertedValue)) return 'INVALID_TARGET';
  return null;
}

/**
 * Classify a C3 EvidenceCandidate without inferring an assessment.
 * @param {Record<string, unknown>} candidate
 * @param {Record<string, unknown>} baseContext
 */
export function classifyEvidenceCandidate(candidate, baseContext) {
  let base;
  try {
    base = indexBaseContext(baseContext);
  } catch (error) {
    return { classification: 'invalid', reason: error.code ?? 'BASE_CONTEXT_INVALID' };
  }
  const targetError = validateTargetClaim(candidate?.targetClaim);
  if (targetError) return { classification: 'invalid', reason: targetError };
  if (!nonEmptyString(candidate.originRef) || !nonEmptyString(candidate.predicateId) || !nonEmptyString(candidate.predicateVersion)) {
    return { classification: 'invalid', reason: 'MISSING_PROVENANCE' };
  }
  const context = candidate.linkedSliceContext;
  const slice = base.slices.get(candidate.targetClaim.subjectRef);
  const mandate = base.mandates.get(context?.mandateRef);
  if (!slice || !mandate || context?.sliceRef !== slice.id || slice.mandateRef !== mandate.id || mandate.insightRevisionRef !== context?.insightRevisionRef) {
    return { classification: 'invalid', reason: 'UNLINKED_TARGET' };
  }

  const basis = candidate.basis ?? {};
  const value = candidate.targetClaim.assertedValue;
  const hasRule = nonEmptyString(basis.ruleRef) && nonEmptyString(basis.ruleVersion);
  if (value === 'delivered') {
    return hasRule && nonEmptyString(basis.affirmativeResultRef)
      ? { classification: 'evidence', reason: 'DELIVERY_ACCEPTED' }
      : { classification: 'hint', reason: 'DELIVERY_BASIS_INCOMPLETE' };
  }
  if (value === 'not-delivered') {
    const bounded = hasRule || nonEmptyString(basis.acceptanceWindowRef);
    const negative = ['refusal', 'cancellation', 'failure'].includes(basis.resultKind) && nonEmptyString(basis.affirmativeResultRef);
    return bounded && negative
      ? { classification: 'evidence', reason: 'NON_DELIVERY_CONFIRMED' }
      : { classification: 'hint', reason: 'NON_DELIVERY_BASIS_INCOMPLETE' };
  }
  const criteria = nonEmptyString(basis.criteriaRef) && nonEmptyString(basis.criteriaVersion);
  const window = nonEmptyString(basis.observationWindowRef);
  if (value === 'realized') {
    return criteria && window && basis.result === true
      ? { classification: 'evidence', reason: 'OUTCOME_REALIZED' }
      : { classification: 'hint', reason: 'OUTCOME_BASIS_INCOMPLETE' };
  }
  return criteria && window && basis.result === false
    ? { classification: 'evidence', reason: 'OUTCOME_NOT_REALIZED' }
    : { classification: 'hint', reason: 'OUTCOME_BASIS_INCOMPLETE' };
}

/** @param {Record<string, unknown>} candidate */
export function evidenceDedupKey(candidate) {
  const target = candidate.targetClaim ?? {};
  return [target.axis, target.subjectRef, target.assertedValue, candidate.originRef, candidate.predicateId, candidate.predicateVersion].join('|');
}

/**
 * Verify authoritative inputs and an optional projection without writing.
 * @param {{baseContext:Record<string,unknown>, eventLog:Record<string,unknown>[], projection?:Record<string,unknown>}} input
 */
export function verifyInsightLifecycle(input) {
  const replay = replayInsightLifecycle(input.baseContext, input.eventLog);
  if (!replay.ok) return { ok: false, diagnostics: [replay.error] };
  const diagnostics = [];
  if (input.projection) {
    const actual = JSON.stringify(input.projection.currentAssessments ?? {});
    const expected = JSON.stringify(replay.state.currentAssessments);
    if (actual !== expected) diagnostics.push({ code: 'PROJECTION_DRIFT', message: 'Projection differs from replay' });
  }
  return { ok: diagnostics.length === 0, diagnostics, replay: replay.state };
}

