import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buildResearchQueries,
  collectInsightsForWeeklyPlan,
  createInsight,
  formatInsightsWeeklyBlock,
  normalizeInsightId,
  readRegistry,
} from './lib/insight-ritual.mjs';

describe('insight-ritual', () => {
  it('normalizeInsightId adds prefix', () => {
    assert.equal(normalizeInsightId('my-idea'), 'insight-my-idea');
    assert.equal(normalizeInsightId('insight-my-idea'), 'insight-my-idea');
  });

  it('createInsight writes folder and registry entry', () => {
    const root = mkdtempSync(join(tmpdir(), 'membrana-insight-'));
    try {
      const tplDir = join(root, 'docs/insights/_template');
      mkdirSync(tplDir, { recursive: true });
      writeFileSync(join(tplDir, 'INSIGHT.md'), '# INSIGHT: {{TITLE}}\n{{ID}}\n', 'utf8');
      writeFileSync(join(tplDir, 'RESEARCH.md'), '# Research\n', 'utf8');
      writeFileSync(join(tplDir, 'REVIEW.md'), '# Review\n', 'utf8');
      writeFileSync(join(tplDir, 'meta.json'), '{"id":"{{ID}}","title":"{{TITLE}}"}', 'utf8');
      mkdirSync(join(root, 'docs/insights'), { recursive: true });
      writeFileSync(
        join(root, 'docs/insights/registry.json'),
        '{"version":1,"insights":[]}',
        'utf8',
      );

      const { id } = createInsight(root, { id: 'test-idea', title: 'Test idea' });
      assert.equal(id, 'insight-test-idea');
      assert.ok(existsSync(join(root, 'docs/insights/insight-test-idea/INSIGHT.md')));
      const registry = readRegistry(root);
      assert.equal(registry.insights.length, 1);
      assert.equal(registry.insights[0].status, 'draft');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('buildResearchQueries returns three queries', () => {
    const queries = buildResearchQueries('# INSIGHT: Operator smoke\n');
    assert.equal(queries.length, 3);
    assert.match(queries[0].query, /Operator smoke/);
  });

  it('formatInsightsWeeklyBlock filters by weight', () => {
    const root = mkdtempSync(join(tmpdir(), 'membrana-week-'));
    try {
      mkdirSync(join(root, 'docs/insights'), { recursive: true });
      writeFileSync(
        join(root, 'docs/insights/registry.json'),
        JSON.stringify({
          version: 1,
          insights: [
            { id: 'insight-a', title: 'A', status: 'adopted', weight: 7.2 },
            { id: 'insight-b', title: 'B', status: 'reviewed', weight: 4 },
          ],
        }),
        'utf8',
      );
      const items = collectInsightsForWeeklyPlan(root, 6);
      assert.equal(items.length, 1);
      assert.match(formatInsightsWeeklyBlock(root, 6), /insight-a/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
