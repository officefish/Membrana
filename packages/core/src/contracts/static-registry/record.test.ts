import { describe, expect, it } from 'vitest';

import { parseEvidenceRecord } from './index.js';

const HASH = 'a'.repeat(64);

function validRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'evidence-one',
    sha256: HASH,
    bytes: 42,
    addedAt: '2026-08-09',
    source: 'measured fixture',
    location: { kind: 'local', ref: 'docs/evidence/store/evidence-one.pdf' },
    ...overrides,
  };
}

describe('parseEvidenceRecord', () => {
  it('accepts and freezes the complete current EvidenceRecord form', () => {
    const raw = validRecord({
      addedAt: '2026-08-09T12:30:45.123Z',
      about: 'human interpretation',
      measured: { pages: 7, labels: ['source', 'pdf'], nested: { accepted: true } },
      sensitive: { reason: 'partner material', decidedAt: '2026-08-09' },
      supersedes: 'evidence-base',
    });

    const result = parseEvidenceRecord(raw);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(raw);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.location)).toBe(true);
    expect(Object.isFrozen(result.value.measured)).toBe(true);
    expect(Object.isFrozen(result.value.measured?.nested)).toBe(true);
    expect(Object.isFrozen(result.value.sensitive)).toBe(true);
  });

  it.each([
    ['id', { id: 'No' }],
    ['sha256', { sha256: 'ABC' }],
    ['bytes', { bytes: 0 }],
    ['bytes', { bytes: Number.MAX_SAFE_INTEGER + 1 }],
    ['addedAt', { addedAt: '2026-02-30' }],
    ['addedAt', { addedAt: '2026-08-09T12:00:00' }],
    ['location.kind', { location: { kind: 'private', ref: 'somewhere' } }],
    ['location.ref', { location: { kind: 'local', ref: '   ' } }],
  ])('rejects invalid %s', (field, overrides) => {
    const result = parseEvidenceRecord(validRecord(overrides));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((item) => item.field === field)).toBe(true);
  });

  it('rejects unknown and partial nested fields instead of normalizing them', () => {
    const topLevel = parseEvidenceRecord(validRecord({ extra: true }));
    const location = parseEvidenceRecord(validRecord({
      location: { kind: 'local', ref: 'fixture.pdf', bucket: 'implicit' },
    }));
    const sensitive = parseEvidenceRecord(validRecord({
      sensitive: { reason: 'private', decidedAt: null },
    }));

    expect(topLevel.ok).toBe(false);
    expect(location.ok).toBe(false);
    expect(sensitive.ok).toBe(false);
  });

  it('rejects non-JSON measured values and cyclic measured objects', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    const nonFinite = parseEvidenceRecord(validRecord({ measured: { score: Infinity } }));
    const cycle = parseEvidenceRecord(validRecord({ measured: cyclic }));

    expect(nonFinite.ok).toBe(false);
    expect(cycle.ok).toBe(false);
  });

  it('classifies a multi-parent supersedes form as a merge', () => {
    const result = parseEvidenceRecord(validRecord({ supersedes: ['parent-a', 'parent-b'] }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((item) => item.code)).toContain('merge');
  });
});
