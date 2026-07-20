import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyEvidenceCandidate,
  evidenceDedupKey,
  replayInsightLifecycle,
  verifyInsightLifecycle,
} from './lib/insight-lifecycle.mjs';

function baseContext() {
  return {
    contextId: 'ctx-1',
    schemaVersion: 1,
    insightRevisions: [{ id: 'rev-1' }],
    mandates: [{ id: 'mandate-1', insightRevisionRef: 'rev-1' }],
    slices: [
      { id: 'slice-a', mandateRef: 'mandate-1' },
      { id: 'slice-b', mandateRef: 'mandate-1' },
    ],
    representations: [{ id: 'repr-1' }],
    transcriptionRelations: [{ taskRef: 'task-1', mandateRef: 'mandate-1' }],
  };
}

function envelope(seq, event) {
  return { eventId: `event-${seq}`, seq, schemaVersion: 1, event };
}

describe('insight lifecycle replay', () => {
  it('keeps D/L/O/V independent and exposes absent keys as None', () => {
    const result = replayInsightLifecycle(baseContext(), [
      envelope(1, { kind: 'AssertD', assertionId: 'd-1', subjectRef: 'mandate-1', value: 'accepted' }),
      envelope(2, { kind: 'AssertV', assertionId: 'v-1', subjectRef: 'repr-1', value: 'archived' }),
    ]);
    assert.equal(result.ok, true);
    assert.equal(result.state.currentAssessments['D:mandate-1'].assertion.value, 'accepted');
    assert.equal(result.state.currentAssessments['V:repr-1'].assertion.value, 'archived');
    assert.equal(result.state.currentAssessments['L:slice-a'], undefined);
    assert.equal(result.state.currentAssessments['O:slice-a'], undefined);
  });

  it('does not choose a silent winner for conflicting live assertions', () => {
    const result = replayInsightLifecycle(baseContext(), [
      envelope(1, { kind: 'AssertL', assertionId: 'l-1', subjectRef: 'slice-a', value: 'delivered' }),
      envelope(2, { kind: 'AssertL', assertionId: 'l-2', subjectRef: 'slice-a', value: 'not-delivered' }),
    ]);
    assert.deepEqual(result.state.currentAssessments['L:slice-a'], {
      kind: 'Conflict', assertionIds: ['l-1', 'l-2'],
    });
  });

  it('revoke changes current view without deleting history', () => {
    const result = replayInsightLifecycle(baseContext(), [
      envelope(1, { kind: 'AssertV', assertionId: 'v-1', subjectRef: 'repr-1', value: 'archived' }),
      envelope(2, { kind: 'Revoke', targetAssertionId: 'v-1' }),
      envelope(3, { kind: 'AssertV', assertionId: 'v-2', subjectRef: 'repr-1', value: 'active' }),
    ]);
    assert.equal(result.state.assertions.length, 2);
    assert.equal(result.state.assertions.find((item) => item.assertionId === 'v-1').revoked, true);
    assert.equal(result.state.currentAssessments['V:repr-1'].assertion.value, 'active');
  });

  it('reopen creates a fresh revision with D=proposed and no transcription copy', () => {
    const result = replayInsightLifecycle(baseContext(), [
      envelope(1, {
        kind: 'Reopen', oldRevisionId: 'rev-1', newRevisionId: 'rev-2',
        initialDecisionAssertionId: 'd-new',
      }),
    ]);
    assert.equal(result.state.currentAssessments['D:rev-2'].assertion.value, 'proposed');
    assert.deepEqual(result.state.eventCreatedRevisionIds, ['rev-2']);
  });

  it('returns deterministic errors for invalid refs and repeated revoke', () => {
    const missing = replayInsightLifecycle(baseContext(), [
      envelope(1, { kind: 'AssertL', assertionId: 'l-x', subjectRef: 'missing', value: 'delivered' }),
    ]);
    assert.equal(missing.error.code, 'WRONG_SUBJECT_REF');
    const repeated = replayInsightLifecycle(baseContext(), [
      envelope(1, { kind: 'AssertL', assertionId: 'l-1', subjectRef: 'slice-a', value: 'delivered' }),
      envelope(2, { kind: 'Revoke', targetAssertionId: 'l-1' }),
      envelope(3, { kind: 'Revoke', targetAssertionId: 'l-1' }),
    ]);
    assert.equal(repeated.error.code, 'REPEATED_REVOKE');
  });
});

describe('C3 evidence classification', () => {
  const linked = {
    insightRevisionRef: 'rev-1', mandateRef: 'mandate-1', sliceRef: 'slice-a',
  };
  const core = {
    candidateId: 'candidate-1',
    targetClaim: { axis: 'L', subjectRef: 'slice-a', assertedValue: 'delivered' },
    linkedSliceContext: linked,
    originRef: 'repo://review/sha',
    predicateId: 'delivery-rule',
    predicateVersion: '1',
  };

  it('requires a named rule and affirmative result for delivered', () => {
    assert.equal(classifyEvidenceCandidate({ ...core, basis: {} }, baseContext()).classification, 'hint');
    assert.equal(classifyEvidenceCandidate({
      ...core,
      basis: { ruleRef: 'prompt#doD', ruleVersion: '1', affirmativeResultRef: 'review://lgtm' },
    }, baseContext()).classification, 'evidence');
  });

  it('does not turn absence into not-delivered evidence', () => {
    const candidate = {
      ...core,
      targetClaim: { axis: 'L', subjectRef: 'slice-a', assertedValue: 'not-delivered' },
      basis: { resultKind: 'timeout' },
    };
    assert.equal(classifyEvidenceCandidate(candidate, baseContext()).classification, 'hint');
  });

  it('requires criteria result and observation window for outcome', () => {
    const candidate = {
      ...core,
      targetClaim: { axis: 'O', subjectRef: 'slice-a', assertedValue: 'not-realized' },
      basis: { criteriaRef: 'metric', criteriaVersion: '1', observationWindowRef: 'window-1', result: false },
    };
    assert.equal(classifyEvidenceCandidate(candidate, baseContext()).classification, 'evidence');
  });

  it('deduplicates within exact target and keeps different targets distinct', () => {
    const a = { ...core };
    const b = { ...core, candidateId: 'candidate-2' };
    const c = { ...core, targetClaim: { ...core.targetClaim, subjectRef: 'slice-b' } };
    assert.equal(evidenceDedupKey(a), evidenceDedupKey(b));
    assert.notEqual(evidenceDedupKey(a), evidenceDedupKey(c));
  });
});

describe('lifecycle verify', () => {
  it('detects projection drift without treating None as failure', () => {
    const events = [envelope(1, { kind: 'AssertD', assertionId: 'd-1', subjectRef: 'mandate-1', value: 'accepted' })];
    assert.equal(verifyInsightLifecycle({ baseContext: baseContext(), eventLog: events }).ok, true);
    const drift = verifyInsightLifecycle({ baseContext: baseContext(), eventLog: events, projection: { currentAssessments: {} } });
    assert.equal(drift.diagnostics[0].code, 'PROJECTION_DRIFT');
  });
});

