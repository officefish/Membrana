/**
 * Юнит-тесты Ангелины-координатора (заседание ritual-refactor M1). Без сети/DOM/моков:
 * кормим готовый снимок. Покрываем инварианты DoD: три исхода свежести (`unknown ≠ fresh`),
 * провенанс обязателен (субагент запрещён), детерминизм порядка, цикл бросает,
 * `stale`/провенанс → громкий блок, `unknown` → метка без блока.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTHOR_ROLES,
  FRESHNESS,
  orderedDigest,
  freshness,
  provenanceProblem,
  provenanceOutcome,
  topoOrder,
  orchestrateCascade,
  presentNode,
} from './lib/angelina-cascade.mjs';

const prov = (author = 'vesnin') => ({ author, guard: 'angelina', digest: 'd', readAt: {} });
const manualProv = (overrides = {}) => ({
  kind: 'honest-manual',
  author: 'human',
  guard: 'honest-manual',
  digest: 'd',
  mintedAt: '2026-07-23',
  reason: 'Anthropic usage limits — генератор недоступен',
  readAt: {},
  ...overrides,
});

test('orderedDigest детерминирован и не зависит от порядка аргументов', () => {
  assert.equal(orderedDigest(['b', 'a']), orderedDigest(['a', 'b']));
  assert.notEqual(orderedDigest(['a']), orderedDigest(['a', 'b']));
});

test('freshness: три исхода, unknown ≠ fresh', () => {
  const producer = { version: 'v2', digest: 'x' };
  assert.equal(freshness(producer, { version: 'v2', digest: 'x' }), FRESHNESS.FRESH);
  assert.equal(freshness(producer, { version: 'v1', digest: 'x' }), FRESHNESS.STALE, 'версия разошлась');
  assert.equal(freshness(producer, { version: 'v2', digest: 'y' }), FRESHNESS.STALE, 'digest разошёлся');
  assert.equal(freshness(producer, undefined), FRESHNESS.UNKNOWN, 'не читал');
  assert.equal(freshness({ version: null, digest: null }, { version: 'v2' }), FRESHNESS.UNKNOWN, 'версии производителя нет');
  assert.notEqual(FRESHNESS.UNKNOWN, FRESHNESS.FRESH, 'не проверено ≠ свежо');
});

test('provenanceProblem: обязательные поля + субагент запрещён', () => {
  assert.equal(provenanceProblem({ provenance: prov('vesnin') }), '');
  assert.match(provenanceProblem({}), /нет провенанса/u);
  assert.match(provenanceProblem({ provenance: { author: 'vesnin', guard: 'a', digest: 'd' } }), /без поля «readAt»/u);
  assert.match(provenanceProblem({ provenance: prov('some-subagent') }), /субагент/u);
  for (const role of AUTHOR_ROLES) {
    assert.equal(provenanceProblem({ provenance: prov(role) }), '', `${role} — допустимый автор`);
  }
});

test('topoOrder: детерминизм (tie-break по id) и стабильность между вызовами', () => {
  const graph = { nodes: [{ id: 'k' }, { id: 'a' }, { id: 's' }, { id: 'r' }], edges: [{ from: 'a', to: 'k' }, { from: 'k', to: 's' }, { from: 'k', to: 'r' }] };
  const a = topoOrder(graph);
  const b = topoOrder({ nodes: [...graph.nodes].reverse(), edges: [...graph.edges].reverse() });
  assert.deepEqual(a, b, 'порядок не зависит от входной перестановки');
  assert.equal(a[0], 'a', 'корень A первым (in-degree 0)');
  assert.equal(a[1], 'k', 'K вторым');
  assert.deepEqual(a.slice(2).sort(), ['r', 's'], 'ярус {r,s} после K, tie-break по id → r, s');
  assert.deepEqual(a.slice(2), ['r', 's']);
});

test('topoOrder: цикл бросает, неизвестный узел бросает', () => {
  assert.throws(() => topoOrder({ nodes: [{ id: 'a' }, { id: 'b' }], edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }] }), /цикл/u);
  assert.throws(() => topoOrder({ nodes: [{ id: 'a' }], edges: [{ from: 'a', to: 'ghost' }] }), /неизвестный узел/u);
});

test('orchestrateCascade: чистый каскад — ok, все fresh', () => {
  const graph = { nodes: [{ id: 'a' }, { id: 'k' }], edges: [{ from: 'a', to: 'k' }] };
  const snapshot = {
    a: { version: 'v1', digest: 'da', provenance: prov('ozhegov') },
    k: { version: 'v1', digest: 'dk', provenance: prov('vesnin'), readAt: { a: { version: 'v1', digest: 'da' } } },
  };
  const out = orchestrateCascade(graph, snapshot);
  assert.equal(out.ok, true);
  assert.equal(out.firstBlocked, null);
  assert.deepEqual(out.order, ['a', 'k']);
  assert.equal(out.results.k.freshness, FRESHNESS.FRESH);
});

test('orchestrateCascade: stale останавливает громко (ok=false, firstBlocked)', () => {
  const graph = { nodes: [{ id: 'a' }, { id: 'k' }], edges: [{ from: 'a', to: 'k' }] };
  const snapshot = {
    a: { version: 'v2', digest: 'da2', provenance: prov('ozhegov') },
    k: { version: 'v1', digest: 'dk', provenance: prov('vesnin'), readAt: { a: { version: 'v1', digest: 'da1' } } },
  };
  const out = orchestrateCascade(graph, snapshot);
  assert.equal(out.ok, false, 'stale = не ok');
  assert.equal(out.firstBlocked, 'k');
  assert.equal(out.results.k.freshness, FRESHNESS.STALE);
  assert.equal(out.results.k.blocked, true);
});

test('orchestrateCascade: unknown помечается, но НЕ блокирует', () => {
  const graph = { nodes: [{ id: 'a' }, { id: 'k' }], edges: [{ from: 'a', to: 'k' }] };
  const snapshot = {
    a: { version: 'v1', digest: 'da', provenance: prov('ozhegov') },
    k: { version: 'v1', digest: 'dk', provenance: prov('vesnin') }, // readAt отсутствует → unknown
  };
  const out = orchestrateCascade(graph, snapshot);
  assert.equal(out.results.k.freshness, FRESHNESS.UNKNOWN);
  assert.equal(out.results.k.blocked, false, 'unknown — не мёртвая дверь');
  assert.equal(out.ok, true, 'unknown не роняет каскад');
});

test('orchestrateCascade: отсутствие провенанса = громкий блок', () => {
  const graph = { nodes: [{ id: 'a' }], edges: [] };
  const out = orchestrateCascade(graph, { a: { version: 'v1', digest: 'da' } });
  assert.equal(out.ok, false, 'нет провенанса = не ok');
  assert.equal(out.firstBlocked, 'a');
  assert.match(out.results.a.provenance, /нет провенанса/u);
});

test('honest-manual: не блок по провенансу, исход ≠ ok и ≠ «нет провенанса»', () => {
  assert.equal(provenanceProblem({ provenance: manualProv() }), '');
  assert.equal(provenanceOutcome({ provenance: manualProv() }), 'honest-manual');
  assert.match(provenanceProblem({ provenance: manualProv({ reason: '' }) }), /honest-manual без поля «reason»/u);

  const graph = { nodes: [{ id: 'MAIN_DAY_ISSUE' }], edges: [] };
  const out = orchestrateCascade(graph, {
    MAIN_DAY_ISSUE: { version: 'v1', digest: 'da', provenance: manualProv(), readAt: {} },
  });
  assert.equal(out.ok, true, 'честная ручная чеканка не роняет каскад');
  assert.equal(out.results.MAIN_DAY_ISSUE.blocked, false);
  assert.equal(out.results.MAIN_DAY_ISSUE.provenance, 'honest-manual');
  assert.equal(out.results.MAIN_DAY_ISSUE.mintedAt, '2026-07-23');

  const line = presentNode('MAIN_DAY_ISSUE', out.results.MAIN_DAY_ISSUE);
  assert.match(line, /^◇ ручная/u);
  assert.match(line, /honest-manual/u);
  assert.doesNotMatch(line, /нет провенанса/u);
});

test('honest-manual: stale по ребру всё ещё блокирует', () => {
  const graph = { nodes: [{ id: 'a' }, { id: 'k' }], edges: [{ from: 'a', to: 'k' }] };
  const out = orchestrateCascade(graph, {
    a: { version: 'v2', digest: 'da2', provenance: prov('ozhegov') },
    k: {
      version: 'v1',
      digest: 'dk',
      provenance: manualProv({ author: 'human' }),
      readAt: { a: { version: 'v1', digest: 'da1' } },
    },
  });
  assert.equal(out.ok, false);
  assert.equal(out.results.k.freshness, FRESHNESS.STALE);
  assert.equal(out.results.k.blocked, true);
});

test('orchestrateCascade: субагент-автор = блок', () => {
  const graph = { nodes: [{ id: 'a' }], edges: [] };
  const out = orchestrateCascade(graph, { a: { version: 'v1', digest: 'da', provenance: prov('dream-subagent') } });
  assert.equal(out.results.a.blocked, true);
  assert.match(out.results.a.provenance, /субагент/u);
});

test('presentNode: stale первым словом, unknown явно, digest усечён', () => {
  const staleLine = presentNode('k', { freshness: FRESHNESS.STALE, provenance: 'ok', blocked: true, author: 'vesnin', guard: 'angelina', digest: 'abcdef1234' });
  assert.match(staleLine, /^✖ БЛОК/u);
  assert.match(staleLine, /abcdef12/u);
  const unknownLine = presentNode('k', { freshness: FRESHNESS.UNKNOWN, provenance: 'ok', blocked: false, author: 'vesnin', guard: 'angelina', digest: null });
  assert.match(unknownLine, /не проверено/u);
});
