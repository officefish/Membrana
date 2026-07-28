/**
 * Зуб слоя Инсайтов (DAY_MEMO блок 2): цитата без указателя не выходит,
 * [Q:] на каждой строке, цитатный v1 без LLM.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  SCRIBE_CONTRACT,
  buildInsightsLayer,
  insightFromCase,
  insightsFromFeedback,
  insightsFromVerdict,
  renderInsights,
} from './day-memo-insights.mjs';

const VERDICT_MD = [
  '# Протокол', '',
  '## Итоговое решение консилиума', '',
  '| Вопрос | Решение |', '|--------|---------|',
  '| Q1 — Состав | Три раздела: факты, инсайты, след |',
  '| Q2 — Кто пишет | Факты — генератор; инсайты — scribe |',
  '', '---', 'хвост',
].join('\n');

test('строки «Итогового решения» становятся выводами с указателем и [Q: консилиум …]', () => {
  const e = insightsFromVerdict(VERDICT_MD, 'docs/seanses/day-memo-evening-2026-07-27.md');
  assert.equal(e.length, 2);
  assert.match(e[0].quote, /Q1 — Состав: Три раздела/u);
  assert.equal(e[0].pointer, 'docs/seanses/day-memo-evening-2026-07-27.md · Итоговое решение');
  assert.match(e[0].q, /^консилиум day-memo-evening/u);
});

test('фидбек: пункты «Сводки предложений» становятся хайлайтами; без секции — пусто', () => {
  const md = '### Сводка предложений на завтра\n- чинить провод\n- держать гейт\n### Резюме';
  const e = insightsFromFeedback(md, 'docs/seanses/team-evening-feedback-x.md');
  assert.deepEqual(e.map((x) => x.quote), ['чинить провод', 'держать гейт']);
  assert.deepEqual(insightsFromFeedback('# без сводки', 'f.md'), []);
});

test('кейс: Conclusion извлекается; кейс без Conclusion — null (problem у вызывающего)', () => {
  const e = insightFromCase('## Raw\nц\n## Conclusion\nЖест таков.\n## Meta\n- id: x', 'docs/meeting/bridge-command-post/cases/case-x.md');
  assert.equal(e.quote, 'Жест таков.');
  assert.match(e.q, /^кейс case-x$/u);
  assert.equal(insightFromCase('## Raw\nтолько сырьё', 'c.md'), null);
});

test('ЗАКОН: цитата без указателя не выходит — уходит в problems, не в markdown', () => {
  const { markdown, kept, problems } = renderInsights([
    { quote: 'с указателем', pointer: 'f.md · s', q: 'кейс x' },
    { quote: 'без указателя', pointer: '', q: 'кейс y' },
  ]);
  assert.equal(kept.length, 1);
  assert.ok(!markdown.includes('без указателя'));
  assert.match(problems[0], /закон Raw/u);
});

test('каждая строка слоя несёт тег [Q: …] (вердикт Q1)', () => {
  const { markdown } = renderInsights([{ quote: 'x', pointer: 'f.md · s', q: 'вечерний фидбек' }]);
  for (const line of markdown.split('\n').filter((l) => l.startsWith('- '))) {
    assert.match(line, /\[Q: [^\]]+\]/u);
  }
});

test('buildInsightsLayer на фикстурах: собирает все три источника, счёт по Q', () => {
  const files = {
    'docs/seanses/day-memo-evening-2026-07-28.md': VERDICT_MD,
    'docs/seanses/team-evening-feedback-2026-07-28.md': '### Сводка предложений на завтра\n- пункт',
    'docs/meeting/bridge-command-post/cases/case-a.md': '## Conclusion\nЖест.\n## Meta',
  };
  const r = buildInsightsLayer('/repo', '2026-07-28', {
    readFile: (p) => files[p],
    exists: (p) => p in files,
    listDir: () => ['day-memo-evening-2026-07-28.md', 'team-evening-feedback-2026-07-28.md', 'чужой-2026-07-27.md'],
    touchedCases: ['docs/meeting/bridge-command-post/cases/case-a.md'],
  });
  assert.equal(r.stats.total, 4);
  assert.deepEqual(r.stats.byQ, { 'консилиум': 2, 'вечерний': 1, 'кейс': 1 });
  assert.deepEqual(r.problems, []);
});

test('SCRIBE_CONTRACT — точка расширения описана, LLM не зовётся (v1 канал, не фолбэк)', () => {
  assert.match(SCRIBE_CONTRACT.output, /3–7 выводов/u);
  assert.ok(SCRIBE_CONTRACT.laws.some((l) => l.includes('не фолбэк')));
});
