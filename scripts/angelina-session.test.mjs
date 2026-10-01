import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderHostessArtifact, sessionState } from './lib/angelina-session.mjs';

test('day raises and evening lowers explicit availability', () => {
  assert.equal(sessionState(true, '2026-10-01T10:00:00Z', 'ritual:day').active, true);
  assert.equal(sessionState(false, '2026-10-01T20:00:00Z', 'ritual:evening').active, false);
});

test('premises precede verdict and exactly four echoes are rendered', () => {
  const text = renderHostessArtifact({ premises: 'HEAD x', entry: 'one', gates: 'closed', analysts: '3/3', session: 'active' });
  assert.ok(text.indexOf('Основания:') < text.indexOf('Вердикт:'));
  assert.equal((text.match(/^\d\./gmu) ?? []).length, 4);
});
