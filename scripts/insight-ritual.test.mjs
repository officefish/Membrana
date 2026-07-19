import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buildResearchQueries,
  collectInsightsForWeeklyPlan,
  createInsight,
  findTruncatedQueries,
  formatInsightsWeeklyBlock,
  normalizeInsightId,
  readRegistry,
  parseInsightCli,
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

  it('buildResearchQueries prefers explicit Q-section over title', () => {
    // Заголовок «Hermes» Perplexity путал с брендом — берём доменные вопросы автора.
    const md = [
      '# INSIGHT: Hermes — вестник',
      '',
      '## Вопросы для research (Q1–Q3)',
      '',
      '1. **Landscape:** как решают cross-session handoff?',
      '2. **Fit:** детерминированный сбор или LLM-обобщение?',
      '',
      '## Связи',
      '',
      '- прочее',
    ].join('\n');
    const queries = buildResearchQueries(md);
    assert.equal(queries.length, 2);
    assert.equal(queries[0].key, 'Q1');
    assert.equal(queries[0].query, 'как решают cross-session handoff?');
    // Метка — заголовок для НАС, в запрос не уходит: «Fit (Membrana): …» заставлял
    // поиск искать продукт «Membrana» → ответ про мембранную ткань (15.07). Тот же
    // класс, что «Hermes» в заголовке, только на уровне метки.
    assert.equal(queries[0].label, 'Landscape');
    assert.doesNotMatch(queries[0].query, /Landscape:/);
    assert.doesNotMatch(queries[0].query, /Hermes|вестник/); // заголовок не протёк в запрос
    assert.doesNotMatch(queries[1].query, /## Связи/); // терминатор секции сработал
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

  it('legacy archive CLI is parsed only so dispatcher can hard-deprecate it', () => {
    const cli = parseInsightCli(['archive', 'done', '--task', 'done-task', '--result', 'shipped']);
    assert.equal(cli.command, 'archive');
    assert.deepEqual(cli.taskIds, ['done-task']);
    assert.equal(cli.execute, false);
  });

  it('parses exact lifecycle request and authority flags', () => {
    const cli = parseInsightCli([
      'visibility', 'repr-1', '--set', 'active', '--reason', 'owner choice',
      '--request-key', 'rk-1', '--authority', 'owner://decision/1', '--execute',
    ]);
    assert.equal(cli.command, 'visibility');
    assert.equal(cli.id, 'repr-1');
    assert.equal(cli.set, 'active');
    assert.equal(cli.requestKey, 'rk-1');
    assert.equal(cli.authority, 'owner://decision/1');
    assert.equal(cli.execute, true);
  });
});

// ─── #402: многострочные вопросы не режутся, мусор не уходит молча ────────────────

describe('research questions (#402)', () => {
  /** Живой формат INSIGHT.md: вопросы переносятся по строкам markdown-вёрсткой. */
  const insightMd = [
    '# INSIGHT: Тест',
    '',
    '## Вопросы для research (Q1–Q3)',
    '',
    '1. **Landscape:** как трекеры (Linear/Jira/GitHub Projects,',
    '   changesets) связывают подзадачу с родительским тикетом — отдельное поле',
    '   `parent` vs переиспользование номера?',
    '2. **Fit (Membrana):** правка служебного поля в 163 архивных карточках — это',
    '   починка данных или переписывание истории?',
    '3. **Risk:** что ломается, если обнулить `githubIssue` у архивной фазы —',
    '   теряется ли связь с эпиком?',
    '',
    '## Следующая секция',
    '',
    'не должна попасть в вопросы',
  ].join('\n');

  it('многострочный вопрос собирается целиком, а не до первой строки', () => {
    const qs = buildResearchQueries(insightMd);
    assert.equal(qs.length, 3);
    // Прежняя версия рвала здесь: «…(Linear/Jira/GitHub Projects,» → Perplexity
    // ответил про благотворительные пожертвования в США (инцидент 2026-07-12).
    assert.match(qs[0].query, /changesets\) связывают подзадачу/u);
    assert.match(qs[0].query, /переиспользование номера\?$/u);
    assert.equal(qs[0].label, 'Landscape');
  });

  it('следующая H2-секция не затекает в последний вопрос', () => {
    const qs = buildResearchQueries(insightMd);
    assert.doesNotMatch(qs[2].query, /Следующая секция|не должна попасть/u);
    assert.match(qs[2].query, /теряется ли связь с эпиком\?$/u);
  });

  it('переносы строк склеиваются в один пробел (вёрстка ≠ смысл)', () => {
    for (const q of buildResearchQueries(insightMd)) {
      assert.doesNotMatch(q.query, /\n/u);
      assert.doesNotMatch(q.query, / {2,}/u);
    }
  });

  it('findTruncatedQueries ловит обрыв на скобке — тот самый случай', () => {
    const bad = findTruncatedQueries([
      { key: 'Q1', label: 'Landscape', query: 'Landscape: как трекеры (Linear/Jira/GitHub Projects,' },
    ]);
    assert.equal(bad.length, 1);
    assert.match(bad[0].reason, /скобка|обрыв/u);
  });

  it('findTruncatedQueries ловит хвостовую запятую и слишком короткий запрос', () => {
    assert.equal(
      findTruncatedQueries([{ key: 'Q2', label: 'x', query: 'x: нормальный длинный вопрос про что-то,' }]).length,
      1,
    );
    assert.equal(findTruncatedQueries([{ key: 'Q3', label: 'x', query: 'x: коротко' }]).length, 1);
  });

  it('целый вопрос гард пропускает', () => {
    assert.deepEqual(
      findTruncatedQueries(buildResearchQueries(insightMd)),
      [],
      'починенный парсер не должен спотыкаться о собственный вывод',
    );
  });
});
