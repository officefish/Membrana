import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildSnapshot,
  hashActiveRegistryIds,
  hashDependencyGraph,
  hashFileSet,
  sha256,
} from './drift-anchor-snapshot.mjs';

describe('drift-anchor snapshot helpers', () => {
  it('sha256 детерминирован и стабилен по длине', () => {
    assert.equal(sha256('a'), sha256('a'));
    assert.notEqual(sha256('a'), sha256('b'));
    assert.equal(sha256('x').length, 16);
  });

  it('hashActiveRegistryIds: только active, порядок не важен', () => {
    const a = JSON.stringify({ tasks: [{ id: 'z', status: 'active' }, { id: 'a', status: 'active' }] });
    const b = JSON.stringify({ tasks: [{ id: 'a', status: 'active' }, { id: 'z', status: 'active' }] });
    assert.equal(hashActiveRegistryIds(a), hashActiveRegistryIds(b));
    const c = JSON.stringify({ tasks: [{ id: 'a', status: 'active' }, { id: 'z', status: 'archived' }] });
    assert.notEqual(hashActiveRegistryIds(a), hashActiveRegistryIds(c));
  });

  it('hashDependencyGraph: только @membrana-рёбра, дедуп+сортировка', () => {
    const g1 = hashDependencyGraph([
      { name: '@membrana/a', deps: ['@membrana/core', 'vitest'] },
      { name: '@membrana/b', deps: ['@membrana/core'] },
    ]);
    const g2 = hashDependencyGraph([
      { name: '@membrana/b', deps: ['@membrana/core'] },
      { name: '@membrana/a', deps: ['vitest', '@membrana/core'] },
    ]);
    assert.equal(g1, g2);
    const g3 = hashDependencyGraph([{ name: '@membrana/a', deps: ['@membrana/device-board'] }]);
    assert.notEqual(g1, g3);
  });

  it('hashFileSet: null-контент пропущен, сортировка по пути', () => {
    const h1 = hashFileSet([{ path: 'b', content: 'B' }, { path: 'a', content: 'A' }]);
    const h2 = hashFileSet([{ path: 'a', content: 'A' }, { path: 'b', content: 'B' }, { path: 'c', content: null }]);
    assert.equal(h1, h2);
  });

  it('buildSnapshot на реальном репо → 4 структурных компонента', () => {
    const snap = buildSnapshot(new Date('2026-07-12T00:00:00Z'));
    assert.deepEqual(
      snap.components.map((c) => c.id).sort(),
      ['architecture-canon', 'dependency-graph', 'registry-active-ids', 'role-prompts'],
    );
    assert.ok(snap.components.every((c) => c.kind === 'structural' && typeof c.value === 'string'));
  });
});
