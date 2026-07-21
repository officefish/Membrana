import assert from 'node:assert/strict';
import test from 'node:test';

import {
  appendTaskContext,
  buildCodeReviewUserMessage,
  defaultOutputPath,
  estimateChangedLines,
  parseCodeReviewCli,
} from './lib/code-review-ritual.mjs';

test('parseCodeReviewCli daily defaults', () => {
  const cli = parseCodeReviewCli([]);
  assert.equal(cli.mode, 'daily');
  assert.equal(cli.full, false);
  assert.equal(cli.noRag, false);
});

test('parseCodeReviewCli pr mode', () => {
  const cli = parseCodeReviewCli(['--pr', '140', '--no-rag']);
  assert.equal(cli.mode, 'pr');
  assert.equal(cli.pr, '140');
  assert.equal(cli.noRag, true);
});

test('parseCodeReviewCli branch requires name', () => {
  assert.throws(() => parseCodeReviewCli(['--branch']), /ветку/);
});

test('parseCodeReviewCli staged mode (NB3)', () => {
  const cli = parseCodeReviewCli(['--staged']);
  assert.equal(cli.mode, 'staged');
});

test('parseCodeReviewCli uncommitted mode', () => {
  assert.equal(parseCodeReviewCli(['--uncommitted']).mode, 'uncommitted');
});

test('defaultOutputPath pr', () => {
  const p = defaultOutputPath({ mode: 'pr', pr: '140' });
  assert.match(p, /pr-140-code-review\.md$/);
});

test('buildCodeReviewUserMessage includes regulation and assignment', () => {
  const msg = buildCodeReviewUserMessage({
    mode: 'pr',
    regulation: 'REG',
    virtualTeam: 'VT',
    contextBlock: 'CTX',
    ragBlock: '',
    focusQuestion: '',
  });
  assert.match(msg, /REG/);
  assert.match(msg, /VT/);
  assert.match(msg, /CTX/);
  assert.match(msg, /LGTM или BLOCK/);
  assert.match(msg, /MAIN_DAY_ISSUE/);
});

test('estimateChangedLines parses git stat summary', () => {
  const stat = ` packages/foo/src/a.ts | 10 +++++-----\n 1 file changed, 5 insertions(+), 5 deletions(-)`;
  assert.equal(estimateChangedLines(stat), 10);
});

test('appendTaskContext includes MAIN_DAY_ISSUE when present', () => {
  const block = appendTaskContext('pr');
  assert.match(block, /MAIN_DAY_ISSUE/);
});

// ─── TF-2 (#554): --pr обязан быть числом ─────────────────────────────────────────

test('--pr с «--» → внятный отказ, а не мусор в gh', () => {
  // Живой случай 16.07: `yarn code-review:pr -- 543` → argv [--pr, --, 543] →
  // pr="--" уходил в gh → «accepts at most 1 arg(s), received 4». Звал напрямую.
  assert.throws(() => parseCodeReviewCli(['--pr', '--', '543']), /--pr должен быть числом/u);
  assert.throws(() => parseCodeReviewCli(['--pr', 'abc']), /--pr должен быть числом/u);
});

test('--pr с числом работает; подсказка про `--` в тексте отказа', () => {
  assert.equal(parseCodeReviewCli(['--pr', '543']).pr, '543');
  try {
    parseCodeReviewCli(['--pr', '--', '543']);
    assert.fail('должен был отказать');
  } catch (e) {
    assert.match(e.message, /без `--`/u, 'отказ подсказывает корень');
  }
});

// ─── день-спринт code-review-lead-refactor: ведущий из пяти (T3/T4/T5) ───────────

test('review-lead: явное слово владельца — вершина каскада', async () => {
  const { resolveReviewLead } = await import('./lib/review-lead.mjs');
  const r = resolveReviewLead({ explicit: 'dynin', diffPaths: ['apps/client/src/x.tsx'] });
  assert.equal(r.persona, 'dynin');
  assert.match(r.basis, /явное слово/u);
});

test('review-lead: карточка с id в ветке отдаёт leadPersona', async () => {
  const { resolveReviewLead } = await import('./lib/review-lead.mjs');
  const r = resolveReviewLead({
    branch: 'feat/scoreboard-spectral-ladder-f2',
    diffPaths: ['scripts/x.mjs'],
    activeTasks: [{ id: 'scoreboard-spectral-ladder', leadPersona: 'rodchenko' }],
  });
  assert.equal(r.persona, 'rodchenko');
  assert.match(r.basis, /карточки/u);
});

test('review-lead: скоуп диффа голосует большинством; вне конвенции — Teamlead с пометкой', async () => {
  const { resolveReviewLead } = await import('./lib/review-lead.mjs');
  const scope = resolveReviewLead({
    diffPaths: ['packages/services/detectors/fft/a.ts', 'packages/services/detectors/fft/b.ts', 'apps/client/src/c.tsx'],
  });
  assert.equal(scope.persona, 'dynin', 'большинство путей — детекторы');
  const fallback = resolveReviewLead({ diffPaths: ['weird/unknown.bin'] });
  assert.equal(fallback.persona, 'vesnin');
  assert.equal(fallback.outOfConvention, true, 'вне конвенции названо, не спрятано');
});

test('review-lead: блок ведущего несёт обязанность пропуск/блок, память и бестиарий', async () => {
  const { formatLeadBlock } = await import('./lib/review-lead.mjs');
  const md = formatLeadBlock({ persona: 'ozhegov', basis: 'тест', memoryExcerpt: 'помню X', bestiary: '| B1 | зверь |' });
  assert.match(md, /ведёт \*\*ozhegov\*\*/u);
  assert.match(md, /пропуск или блок/u);
  assert.match(md, /Память ведущего/u);
  assert.match(md, /Бестиарий/u);
});

test('провод: code-review зовёт review-lead, промпт несёт leadBlock после обрезаемого контекста', async () => {
  const { readFileSync } = await import('node:fs');
  const adapter = readFileSync(new URL('./code-review.mjs', import.meta.url), 'utf8');
  assert.match(adapter, /resolveReviewLead\(/u);
  assert.match(adapter, /readPersonaMemory\(/u, 'память ведущего подключена (T4)');
  const lib = readFileSync(new URL('./lib/code-review-ritual.mjs', import.meta.url), 'utf8');
  const trimIdx = lib.indexOf('trimText(p.contextBlock');
  const leadIdx = lib.indexOf('p.leadBlock ?');
  assert.ok(trimIdx !== -1 && leadIdx > trimIdx, 'leadBlock конкатенируется ПОСЛЕ обрезки контекста (не зверь B1)');
});

test('бестиарий: живёт, у каждого зверя графа вещдока', async () => {
  const { readFileSync } = await import('node:fs');
  const md = readFileSync(new URL('../docs/bestiary/BESTIARY.md', import.meta.url), 'utf8');
  const beasts = md.split('\n').filter((l) => /^\|\s*B\d+\s*\|/u.test(l));
  assert.ok(beasts.length >= 5, `зверей ≥5, найдено ${beasts.length}`);
  for (const b of beasts) {
    const cells = b.split('|').map((s) => s.trim()).filter(Boolean);
    assert.ok(cells[cells.length - 1].length > 5, `у зверя ${cells[1]} есть вещдок`);
  }
});
