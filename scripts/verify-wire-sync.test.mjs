import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractEventTypeValues,
  extractInterfaceFields,
  wireSyncDiffs,
} from './verify-wire-sync.mjs';

test('extractEventTypeValues: строки word.word', () => {
  const src = `const X = { a: 'board.capture', b: 'node.entitlements', c: 'health.ping' };`;
  assert.deepEqual([...extractEventTypeValues(src)].sort(), [
    'board.capture',
    'health.ping',
    'node.entitlements',
  ]);
});

test('extractInterfaceFields: readonly-поля вложенного интерфейса', () => {
  const src = `
    export interface BoardScenarioListItem {
      readonly id: string;
      readonly title: string;
      readonly kind?: 'user' | 'system';
      readonly branchCount?: number;
    }`;
  assert.deepEqual([...extractInterfaceFields(src, 'BoardScenarioListItem')].sort(), [
    'branchCount',
    'id',
    'kind',
    'title',
  ]);
});

test('wireSyncDiffs: нет расхождений при равных множествах', () => {
  const a = new Set(['x', 'y']);
  const b = new Set(['y', 'x']);
  assert.deepEqual(wireSyncDiffs([{ key: 'k', a, b }]), []);
});

test('wireSyncDiffs: ловит поле только в одном источнике', () => {
  const a = new Set(['id', 'title', 'kind']);
  const b = new Set(['id', 'title']); // cabinet отстал (нет kind)
  const diffs = wireSyncDiffs([{ key: 'BoardScenarioListItem', a, b }]);
  assert.equal(diffs.length, 1);
  assert.deepEqual(diffs[0].onlyA, ['kind']);
  assert.deepEqual(diffs[0].onlyB, []);
});

test('реальные файлы core ↔ cabinet синхронны (после csp-2/csp-5)', async () => {
  const { readFileSync } = await import('node:fs');
  const core = readFileSync('packages/core/src/contracts/node-realtime/events.ts', 'utf8');
  const cab = readFileSync(
    'packages/background-cabinet/src/domain/node-realtime-wire.ts',
    'utf8',
  );
  const diffs = wireSyncDiffs([
    { key: 'events', a: extractEventTypeValues(core), b: extractEventTypeValues(cab) },
  ]);
  // node.entitlements + scenario-list + capture/* должны совпадать после сегодняшних синков.
  assert.deepEqual(diffs, [], `wire рассинхронизирован: ${JSON.stringify(diffs)}`);
});
