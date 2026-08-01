# Dynin follow-up: summarizeProcedureRunTrail

Persona: dynin
Block: journal-predicates-review
Plan: docs/sprint/cut/procedure-run-journal-2026-08-01-code-review.json
Ratified v2: 2026-08-01T09:53:55+03:00

## Review task

Previous v2 reviews returned BLOCK: first because `summarizeProcedureRunTrail()` was clipped,
then because the visible function did not validate its input contract. This follow-up contains
the fixed function and the relevant tests after ratified cut v3.

Return strictly LGTM or BLOCK. If BLOCK, name the exact defect.

## Full function

```js
export function summarizeProcedureRunTrail(records) {
  if (!Array.isArray(records)) throw new Error('records must be an array');
  const summary = {
    total: records.length,
    gaps: [],
  };
  for (const status of VALID_STATUSES) summary[status] = 0;

  records.forEach((record, index) => {
    if (!VALID_STATUSES.has(record?.status)) {
      throw new Error(`records[${index}].status must be one of ${[...VALID_STATUSES].join(', ')}`);
    }
    const gaps = record.coverage?.gaps ?? [];
    if (!Array.isArray(gaps)) throw new Error(`records[${index}].coverage.gaps must be an array`);

    summary[record.status] += 1;
    for (const gap of gaps) {
      summary.gaps.push({ runId: record.runId, procedureId: record.procedureId, gap });
    }
  });
  return summary;
}
```

## Relevant test

```js
test('summary names gaps with procedure and run ids', () => {
  const one = buildProcedureRunRecord({
    procedureId: 'membrana-local-sprint',
    runId: 'r1',
    status: 'blocked',
    subject: 'gate',
    evidence: [],
    gaps: ['missing ratification'],
  }, { nowIso: '2026-08-01T00:00:00.000Z', sequence: 1 });
  const two = buildProcedureRunRecord({
    procedureId: 'membrana-local-sprint',
    runId: 'r2',
    status: 'pass',
    subject: 'gate',
    evidence: ['docs/x.md'],
    gaps: [],
  }, { nowIso: '2026-08-01T00:01:00.000Z', sequence: 2 });

  const summary = summarizeProcedureRunTrail([one, two]);
  assert.equal(summary.total, 2);
  assert.equal(summary.blocked, 1);
  assert.equal(summary.pass, 1);
  assert.deepEqual(summary.gaps, [{
    procedureId: 'membrana-local-sprint',
    runId: 'r1',
    gap: 'missing ratification',
  }]);
});

test('summary rejects unreadable input instead of inventing counters', () => {
  assert.throws(() => summarizeProcedureRunTrail(null), /records must be an array/);
  assert.throws(() => summarizeProcedureRunTrail([{ status: 'unknown', coverage: { gaps: [] } }]), /records\[0\]\.status/);
  assert.throws(() => summarizeProcedureRunTrail([{ status: 'pass', coverage: { gaps: 'oops' } }]), /coverage\.gaps/);
});
```
