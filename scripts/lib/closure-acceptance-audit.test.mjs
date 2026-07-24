import assert from 'node:assert/strict';
import test from 'node:test';

import {
  auditClosureFiles,
  parseClosureAcceptance,
  tableField,
  toAcceptanceArtifact,
} from './closure-acceptance-audit.mjs';

const CONFIRMED = `
## Приёмка

| Поле | Значение |
|---|---|
| acceptedBy | \`vesnin\` |
| headRev | \`a82fd5afec04dfa2605d77005eb0e684a2a5acd6\` |
`;

const NARRATIVE = `
| **Verdict** | **shipped** — LGTM Vesnin |

## LGTM

**Teamlead (Vesnin): LGTM.** Все критерии выполнены.
`;

const ABSENT = `
| Status | **CLOSED** |
| Date | 2026-07-23 |

## Delivered
- stuff
`;

test('tableField читает acceptedBy / headRev', () => {
  assert.equal(tableField(CONFIRMED, 'acceptedBy'), 'vesnin');
  assert.equal(
    tableField(CONFIRMED, 'headRev'),
    'a82fd5afec04dfa2605d77005eb0e684a2a5acd6',
  );
});

test('parse: confirmed требует acceptedBy + headRev', () => {
  const p = parseClosureAcceptance(CONFIRMED);
  assert.equal(p.kind, 'confirmed');
  assert.equal(p.acceptedBy, 'vesnin');
  assert.match(p.headRev, /^a82fd5af/);
});

test('parse: narrative LGTM без headRev', () => {
  const p = parseClosureAcceptance(NARRATIVE);
  assert.equal(p.kind, 'narrative');
  assert.ok(p.narrativeHint);
});

test('parse: acceptedBy без headRev → narrative', () => {
  const p = parseClosureAcceptance('| acceptedBy | dynin |\n| headRev | not-a-sha |');
  assert.equal(p.kind, 'narrative');
});

test('parse: absent', () => {
  assert.equal(parseClosureAcceptance(ABSENT).kind, 'absent');
  assert.equal(parseClosureAcceptance('').kind, 'absent');
});

test('auditClosureFiles: gateClaim когда confirmed < 50%', () => {
  const audit = auditClosureFiles([
    { path: 'a/CLOSURE.md', text: CONFIRMED },
    { path: 'b/CLOSURE.md', text: NARRATIVE },
    { path: 'c/CLOSURE.md', text: ABSENT },
    { path: 'd/CLOSURE.md', text: ABSENT },
  ]);
  assert.equal(audit.confirmed, 1);
  assert.equal(audit.narrative, 1);
  assert.equal(audit.absent, 2);
  assert.equal(audit.gateClaim, true);
  assert.equal(audit.anyAcceptanceRatio, 0.5);
});

test('toAcceptanceArtifact только для confirmed', () => {
  assert.equal(toAcceptanceArtifact('x', parseClosureAcceptance(ABSENT)).acceptance, null);
  const a = toAcceptanceArtifact('x', parseClosureAcceptance(CONFIRMED));
  assert.equal(a.acceptance?.acceptedBy, 'vesnin');
});
