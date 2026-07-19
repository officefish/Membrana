import { buildOperationPlan, OperationError } from './insight-lifecycle-ops.mjs';
import { digestJson } from './insight-lifecycle-store.mjs';
import { replayInsightLifecycle } from './insight-lifecycle.mjs';

const CASES = [
  {
    insightId: 'insight-hermes-liaison-agent',
    disposition: 'verified',
    visibility: 'archived',
    mandates: [{ key: 'hermes-brief', slices: [{ key: 'hermes-brief', delivered: true }] }],
  },
  {
    insightId: 'insight-comms-contour-topology',
    disposition: 'partial',
    visibility: 'archived',
    mandates: [{
      key: 'comms-cc1-cc9',
      slices: Array.from({ length: 9 }, (_, index) => ({
        key: `cc${index + 1}`,
        delivered: index < 8,
      })),
    }],
  },
  {
    insightId: 'insight-telegram-work-reports',
    disposition: 'partial',
    visibility: 'archived',
    mandates: [{
      key: 'telegram-mvp',
      slices: [
        { key: 'software', delivered: true },
        { key: 'config', delivered: true },
        { key: 'ritual-wiring', delivered: true },
        { key: 'operational-smoke', delivered: false },
      ],
    }],
  },
  {
    insightId: 'insight-persona-persistent-memory',
    disposition: 'partial',
    visibility: 'archived',
    mandates: [
      { key: 'phase-1', slices: [{ key: 'phase-1', delivered: true }] },
      { key: 'phase-1-5', slices: [{ key: 'phase-1-5', delivered: true }] },
    ],
  },
  {
    insightId: 'insight-operator-smoke-ci-gate',
    disposition: 'partial',
    visibility: 'active',
    mandates: [{ key: 'operator-smoke-ci-gate', slices: [{ key: 'implementation', delivered: false }] }],
  },
  {
    insightId: 'insight-async-v2-product-narrative',
    disposition: 'partial',
    visibility: 'active',
    mandates: [{ key: 'async-v2-product-narrative', slices: [{ key: 'implementation', delivered: false }] }],
  },
  {
    insightId: 'insight-competition-catalog-pipeline',
    disposition: 'partial',
    visibility: 'active',
    mandates: [{ key: 'competition-catalog-pipeline', slices: [{ key: 'implementation', delivered: false }] }],
  },
];

function id(kind, ...parts) {
  return `${kind}-${parts.join('-').replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;
}

/**
 * Deterministic C5 fixture reconstruction. It consumes a pinned request/manifest and
 * deliberately does not read or rewrite legacy registry/meta files.
 */
export function buildLegacyMigrationPlan(input) {
  const request = input.request ?? {};
  if (request.disposition === 'disputed' || (request.disputedCases ?? []).length > 0) {
    throw new OperationError('LEGACY_DISPUTED', 'Disputed legacy mapping requires owner-attributed manual resolution', {
      cases: request.disputedCases ?? [],
    });
  }
  if (request.independentAudit !== 'PASS') {
    throw new OperationError('AUTHORITY_REQUIRED', 'Verified/partial migration requires independent audit PASS');
  }

  const baseContext = {
    contextId: `legacy-migration-${digestJson({
      schemaVersion: request.schemaVersion ?? 1,
      sourceDigests: request.sourceDigests ?? [],
      cases: CASES,
    }).slice(0, 20)}`,
    schemaVersion: 1,
    insightRevisions: [],
    mandates: [],
    slices: [],
    representations: [],
    transcriptionRelations: [],
  };
  const events = [];
  const evidenceNodes = [];
  const diagnostics = [];

  for (const item of CASES) {
    const revisionId = id('revision', item.insightId, 'legacy');
    const representationId = id('representation', item.insightId, 'legacy');
    baseContext.insightRevisions.push({ id: revisionId, insightId: item.insightId, source: 'legacy-migration' });
    baseContext.representations.push({ id: representationId, insightRevisionRef: revisionId, kind: 'legacy-meta' });
    events.push({ kind: 'AssertV', subjectRef: representationId, value: item.visibility });

    for (const mandateSpec of item.mandates) {
      const mandateId = id('mandate', item.insightId, mandateSpec.key);
      baseContext.mandates.push({
        id: mandateId,
        insightRevisionRef: revisionId,
        priorityWeight: null,
      });
      events.push({ kind: 'AssertD', subjectRef: mandateId, value: 'accepted' });
      for (const sliceSpec of mandateSpec.slices) {
        const sliceId = id('slice', item.insightId, mandateSpec.key, sliceSpec.key);
        baseContext.slices.push({ id: sliceId, mandateRef: mandateId, claimKey: sliceSpec.key });
        if (sliceSpec.delivered) {
          const evidenceRef = id('evidence', sliceId, 'delivery');
          evidenceNodes.push({
            id: evidenceRef,
            targetClaim: { axis: 'L', subjectRef: sliceId, assertedValue: 'delivered' },
            predicateId: 'c5-legacy-delivery',
            predicateVersion: '1',
          });
          events.push({ kind: 'AssertL', subjectRef: sliceId, value: 'delivered', evidenceRef });
        }
      }
    }
    diagnostics.push({
      insightId: item.insightId,
      disposition: item.disposition,
      manualReviewRequired: false,
      reasons: item.disposition === 'partial' ? ['UNSUPPORTED_ASSESSMENTS_REMAIN_NONE'] : [],
    });
  }

  baseContext.insightRevisions.sort((a, b) => a.id.localeCompare(b.id));
  baseContext.mandates.sort((a, b) => a.id.localeCompare(b.id));
  baseContext.slices.sort((a, b) => a.id.localeCompare(b.id));
  baseContext.representations.sort((a, b) => a.id.localeCompare(b.id));
  events.sort((a, b) => {
    const subject = (event) => event.subjectRef ?? '';
    return subject(a).localeCompare(subject(b)) || a.kind.localeCompare(b.kind);
  });

  const existing = input.store.baseContext;
  const existingReplay = replayInsightLifecycle(existing, input.store.eventLog);
  if (!existingReplay.ok) {
    throw new OperationError('REPLAY_ERROR', existingReplay.error.message, existingReplay.error);
  }
  const collections = ['insightRevisions', 'mandates', 'slices', 'representations', 'transcriptionRelations'];
  const desiredContext = structuredClone(baseContext);
  for (const collection of collections) {
    const merged = [...(existing[collection] ?? [])];
    const byId = new Map(merged.filter((item) => item.id).map((item) => [item.id, item]));
    for (const desired of desiredContext[collection]) {
      const prior = byId.get(desired.id);
      if (prior && digestJson(prior) !== digestJson(desired)) {
        throw new OperationError('LEGACY_DISPUTED', `Existing ${collection} identity conflicts with migration`, {
          id: desired.id,
        });
      }
      if (!prior) merged.push(desired);
    }
    baseContext[collection] = merged.sort((a, b) => (a.id ?? a.taskRef).localeCompare(b.id ?? b.taskRef));
  }
  const existingIdentityCount = collections.reduce((count, key) => count + (existing[key]?.length ?? 0), 0);
  const allDesiredPresent = collections.every((key) =>
    desiredContext[key].every((desired) =>
      (existing[key] ?? []).some((prior) => prior.id === desired.id && digestJson(prior) === digestJson(desired)),
    ),
  );
  baseContext.contextId = allDesiredPresent
    ? existing.contextId
    : existingIdentityCount === 0
      ? desiredContext.contextId
      : `legacy-migration-${digestJson({ previous: existing.contextId, desired: desiredContext.contextId }).slice(0, 20)}`;

  const axisByKind = { AssertD: 'D', AssertL: 'L', AssertO: 'O', AssertV: 'V' };
  const pendingEvents = events.filter((event) => {
    const axis = axisByKind[event.kind];
    const current = existingReplay.state.currentAssessments[`${axis}:${event.subjectRef}`];
    if (!current) return true;
    if (current.kind === 'Some' && current.assertion.value === event.value) return false;
    throw new OperationError('LEGACY_DISPUTED', 'Existing lifecycle value conflicts with migration', {
      axis,
      subjectRef: event.subjectRef,
      requestedValue: event.value,
    });
  });

  const plan = buildOperationPlan({
    repoRoot: input.repoRoot,
    store: input.store,
    requestKey: request.requestKey,
    authorityRef: request.authorityRef,
    actorRef: request.actorRef,
    targetSubjects: CASES.map((item) => item.insightId),
    proposedBaseContext: baseContext,
    proposedEvents: pendingEvents,
    inputRefsAndDigests: request.sourceDigests ?? [],
    requestMetadata: { command: 'migrate-legacy', request },
  });
  return {
    ...plan,
    __proposedBaseContext: baseContext,
    migration: {
      schemaVersion: 1,
      diagnostics,
      evidenceNodes,
      excludedHints: [
        'task archive',
        'sprintPhase',
        'textual mention',
        'PR existence without exact acceptance result',
      ],
      legacyFilesRewritten: false,
    },
  };
}

export const LEGACY_MIGRATION_CASES = Object.freeze(CASES);
