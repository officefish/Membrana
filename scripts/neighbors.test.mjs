import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderNeighbors, todayActiveCards } from './neighbors.mjs';

test('todayActiveCards: только active за сегодня, компактной строкой', () => {
  const registry = {
    tasks: [
      { id: 'a', status: 'active', createdAt: '2026-07-14', githubIssue: 469, size: 'M', title: 'Спринт A' },
      { id: 'b', status: 'archived', createdAt: '2026-07-14', title: 'вчерашний архив' },
      { id: 'c', status: 'active', createdAt: '2026-07-13', title: 'старая активная' },
    ],
  };
  const cards = todayActiveCards(registry, '2026-07-14');
  assert.equal(cards.length, 1);
  assert.match(cards[0], /^a \(#469, M\) — Спринт A/);
});

test('renderNeighbors: все секции, честные пустые состояния, финальная памятка про скоуп', () => {
  const out = renderNeighbors({
    hours: 4,
    commits: ['abc1234 feat: x'],
    prs: [],
    cards: ['a (#469, M) — Спринт A'],
    branches: [],
    worktrees: ['C:/repo  abc1234 [main]'],
  });
  assert.ok(out.includes('## Коммиты origin/main за 4ч'));
  assert.ok(out.includes('открытых PR нет'));
  assert.ok(out.includes('свежих веток нет'));
  assert.ok(out.includes('пересечение СКОУПА'));
  assert.ok(!out.includes(String.fromCharCode(27)), 'без ANSI');
});
