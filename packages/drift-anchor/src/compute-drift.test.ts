import { describe, expect, it } from 'vitest';

import { computeDrift } from './compute-drift.js';
import type { DriftThresholds, Snapshot } from './types.js';

const T: DriftThresholds = { epsilon1: 0.05, epsilon2: 0.2 };

const snap = (components: Snapshot['components'], takenAt = '2026-07-12T00:00:00Z'): Snapshot => ({
  takenAt,
  components,
});

const baseline = snap([
  { id: 'registry-active-ids', kind: 'structural', value: 'hashA' },
  { id: 'import-graph', kind: 'structural', value: 'graphA' },
  { id: 'combinedScore:drone-01', kind: 'behavioral', value: 0.82 },
]);

describe('computeDrift — DoD консилиума', () => {
  it('(а) равные снимки → все ok', () => {
    const d = computeDrift(baseline, baseline, T);
    expect(d.anchors.every((a) => a.verdict === 'ok')).toBe(true);
    expect(d.summary).toEqual({ ok: 3, drift: 0, broken: 0 });
  });

  it('(б) один изменённый structural-компонент → ровно один drift', () => {
    const cur = snap([
      { id: 'registry-active-ids', kind: 'structural', value: 'hashB' }, // изменён
      { id: 'import-graph', kind: 'structural', value: 'graphA' },
      { id: 'combinedScore:drone-01', kind: 'behavioral', value: 0.82 },
    ]);
    const d = computeDrift(baseline, cur, T);
    expect(d.summary.drift).toBe(1);
    expect(d.anchors.find((a) => a.id === 'registry-active-ids')?.verdict).toBe('drift');
  });

  it('(в) behavioral превышение ε₂ → broken', () => {
    const cur = snap([
      { id: 'registry-active-ids', kind: 'structural', value: 'hashA' },
      { id: 'import-graph', kind: 'structural', value: 'graphA' },
      { id: 'combinedScore:drone-01', kind: 'behavioral', value: 0.5 }, // |0.82-0.5|=0.32 > 0.2
    ]);
    const d = computeDrift(baseline, cur, T);
    const b = d.anchors.find((a) => a.id === 'combinedScore:drone-01');
    expect(b?.verdict).toBe('broken');
    expect(b?.delta).toBeCloseTo(0.32, 5);
  });
});

describe('computeDrift — behavioral пороги', () => {
  it('в пределах ε₁ → ok', () => {
    const cur = snap([{ id: 'combinedScore:drone-01', kind: 'behavioral', value: 0.8 }]);
    const base = snap([{ id: 'combinedScore:drone-01', kind: 'behavioral', value: 0.82 }]);
    expect(computeDrift(base, cur, T).anchors[0]?.verdict).toBe('ok'); // 0.02 < 0.05
  });

  it('между ε₁ и ε₂ → drift', () => {
    const cur = snap([{ id: 'combinedScore:drone-01', kind: 'behavioral', value: 0.7 }]);
    const base = snap([{ id: 'combinedScore:drone-01', kind: 'behavioral', value: 0.82 }]);
    expect(computeDrift(base, cur, T).anchors[0]?.verdict).toBe('drift'); // 0.12
  });
});

describe('computeDrift — исчезновение и новые компоненты', () => {
  it('компонент исчез в current → broken', () => {
    const cur = snap([{ id: 'import-graph', kind: 'structural', value: 'graphA' }]);
    const d = computeDrift(baseline, cur, T);
    expect(d.anchors.find((a) => a.id === 'registry-active-ids')?.verdict).toBe('broken');
    expect(d.anchors.find((a) => a.id === 'combinedScore:drone-01')?.verdict).toBe('broken');
  });

  it('новый компонент в current (нет в baseline) → drift', () => {
    const cur = snap([
      ...baseline.components,
      { id: 'prompt:vesnin', kind: 'structural', value: 'newHash' },
    ]);
    const d = computeDrift(baseline, cur, T);
    const n = d.anchors.find((a) => a.id === 'prompt:vesnin');
    expect(n?.verdict).toBe('drift');
    expect(n?.baseline).toBeNull();
  });
});

describe('computeDrift — детерминизм и форма', () => {
  it('anchors отсортированы по id; generatedAt = current.takenAt', () => {
    const d = computeDrift(baseline, snap(baseline.components, '2026-07-13T00:00:00Z'), T);
    const ids = d.anchors.map((a) => a.id);
    expect(ids).toEqual([...ids].sort());
    expect(d.generatedAt).toBe('2026-07-13T00:00:00Z');
  });

  it('два прогона идентичны', () => {
    const a = computeDrift(baseline, baseline, T);
    const b = computeDrift(baseline, baseline, T);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
});
