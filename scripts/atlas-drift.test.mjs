/**
 * Зубы трёх разниц дрейфа справочника (§3 контракта `workshop-wires`).
 *
 * Прогон: `node --test scripts/atlas-drift.test.mjs`
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DRIFT_KINDS, computeDrift, renderDrift } from './lib/atlas-drift.mjs';

/** Сошедшийся вход: две мастерских, один дом без манифеста, одно правило. */
const input = (over = {}) => ({
  discovered: [
    { home: 'docs/a', kind: 'workshop', hasManifest: true },
    { home: 'docs/b', kind: 'workshop', hasManifest: true },
    { home: 'docs/дом', kind: 'home', hasManifest: false },
  ],
  indexed: [
    { home: 'docs/a', kind: 'workshop' },
    { home: 'docs/b', kind: 'workshop' },
    { home: 'docs/дом', kind: 'home' },
  ],
  manifestHomes: ['docs/a', 'docs/b'],
  registryIds: ['ritual'],
  projectedIds: ['ritual'],
  ...over,
});

test('три рода разниц, и ни одного четвёртого', () => {
  assert.deepEqual(Object.values(DRIFT_KINDS), ['discovery', 'manifests', 'namespaces']);
});

test('всё сошлось — ok и одна строка про три разницы', () => {
  const r = computeDrift(input());
  assert.equal(r.ok, true);
  assert.deepEqual(r.diffs, []);
  assert.match(renderDrift(r)[0], /три разницы сошлись/u);
});

// ── Δ1: обнаружение ↔ индекс ──────────────────────────────────────────────────────────────

test('дом найден обходом, но в индекс не попал', () => {
  const r = computeDrift(input({ indexed: input().indexed.filter((i) => i.home !== 'docs/b') }));
  assert.equal(r.ok, false);
  const d = r.diffs.find((x) => x.kind === DRIFT_KINDS.DISCOVERY);
  assert.deepEqual(d.missing, ['docs/b']);
});

test('индекс помнит снесённый дом', () => {
  const r = computeDrift(input({ discovered: input().discovered.filter((d) => d.home !== 'docs/дом') }));
  const d = r.diffs.find((x) => x.kind === DRIFT_KINDS.DISCOVERY);
  assert.deepEqual(d.extra, ['docs/дом'], 'разница симметрична: пропажу и лишнее видно обе');
});

// ── Δ2: манифесты ↔ записи мастерских ─────────────────────────────────────────────────────

test('манифест в дереве есть, записи мастерской нет', () => {
  const r = computeDrift(input({ manifestHomes: ['docs/a', 'docs/b', 'docs/забытый'] }));
  const d = r.diffs.find((x) => x.kind === DRIFT_KINDS.MANIFESTS);
  assert.deepEqual(d.missing, ['docs/забытый']);
});

test('ДОМ БЕЗ МАНИФЕСТА в эту разницу не входит — он законен', () => {
  // §3: «контейнер без мастерской — законное состояние, третий вид записи». Считать его
  // расхождением значило бы требовать 33 манифеста «для зелени» окольным путём.
  const r = computeDrift(input());
  assert.equal(r.ok, true, 'docs/дом присутствует в индексе как home и разницы не даёт');
  const many = computeDrift(input({
    discovered: [...input().discovered, { home: 'docs/ещё-дом', kind: 'home', hasManifest: false }],
    indexed: [...input().indexed, { home: 'docs/ещё-дом', kind: 'home' }],
  }));
  assert.equal(many.ok, true);
});

// ── Δ3: реестр ↔ проекция ─────────────────────────────────────────────────────────────────

test('правило в реестре есть, в проекции нет', () => {
  const r = computeDrift(input({ projectedIds: [] }));
  const d = r.diffs.find((x) => x.kind === DRIFT_KINDS.NAMESPACES);
  assert.deepEqual(d.missing, ['ritual']);
});

test('пустой реестр и пустая проекция расхождением не являются', () => {
  const r = computeDrift(input({ registryIds: [], projectedIds: [] }));
  assert.equal(r.ok, true, 'правил ноль — это состояние, а не дрейф');
});

// ── Отчёт различает роды ──────────────────────────────────────────────────────────────────

test('каждая разница печатается СВОИМ именем и адресами', () => {
  const r = computeDrift(input({
    indexed: input().indexed.filter((i) => i.home !== 'docs/b'),
    projectedIds: [],
  }));
  const text = renderDrift(r).join('\n');
  assert.match(text, /разошлось разниц: 3 из 3|разошлось разниц: 2 из 3/u);
  assert.match(text, /Δ обнаружение домов ↔ индекс/u);
  assert.match(text, /Δ реестр неймспейсов ↔ проекция/u);
  assert.match(text, /docs\/b/u, 'адрес назван, а не «что-то разошлось»');
  assert.match(text, /ritual/u);
});

test('починка названа по роду — она разная', () => {
  const text = renderDrift(computeDrift(input({ projectedIds: [] }))).join('\n');
  // «Пересобери» лечит обнаружение и манифесты; расхождение реестра может значить, что он
  // не читается вовсе — совсем другая работа.
  assert.match(text, /неймспейсы — сначала проверить читаемость реестра/u);
});

test('мусор на входе не роняет счёт', () => {
  const r = computeDrift(undefined);
  assert.equal(r.ok, true, 'пустой вход — пустые разницы, не исключение');
  assert.deepEqual(computeDrift({}).diffs, []);
});
