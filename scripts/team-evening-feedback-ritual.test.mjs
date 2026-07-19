import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildEveningFeedbackUserMessage,
  DAY_DOC_INPUTS,
  parseTeamEveningFeedbackCli,
  resolveEveningFeedbackOutputPath,
} from './lib/team-evening-feedback-ritual.mjs';

test('parseTeamEveningFeedbackCli defaults', () => {
  const cli = parseTeamEveningFeedbackCli([]);
  assert.equal(cli.help, false);
  assert.equal(cli.saveAs, 'team-evening-feedback');
  assert.equal(cli.noRag, false);
  assert.equal(cli.noSave, false);
  assert.equal(cli.dryRun, false);
});

test('parseTeamEveningFeedbackCli flags', () => {
  const cli = parseTeamEveningFeedbackCli([
    '--no-rag',
    '--no-save',
    '--dry-run',
    '--save-as',
    'w0-hotfix',
    'extra focus',
  ]);
  assert.equal(cli.noRag, true);
  assert.equal(cli.noSave, true);
  assert.equal(cli.dryRun, true);
  assert.equal(cli.saveAs, 'w0-hotfix');
  assert.equal(cli.focusNote, 'extra focus');
});

test('resolveEveningFeedbackOutputPath default slug and date', () => {
  const p = resolveEveningFeedbackOutputPath({
    saveAs: 'team-evening-feedback',
    date: new Date('2026-06-23T12:00:00.000Z'),
    cwd: '/repo',
  });
  assert.match(p.replace(/\\/g, '/'), /docs\/seanses\/team-evening-feedback-2026-06-23\.md$/);
});

test('buildEveningFeedbackUserMessage includes regulation prompt and git', () => {
  const msg = buildEveningFeedbackUserMessage({
    regulation: 'REG',
    prompt: 'PROMPT',
    virtualTeam: 'VT',
    dayDocs: 'DOCS',
    gitSummary: 'GIT',
    ragBlock: 'RAG',
    date: new Date('2026-06-23T12:00:00.000Z'),
  });
  assert.match(msg, /REG/);
  assert.match(msg, /PROMPT/);
  assert.match(msg, /VT/);
  assert.match(msg, /DOCS/);
  assert.match(msg, /GIT/);
  assert.match(msg, /RAG/);
  assert.match(msg, /2026-06-23/);
});

test('DAY_DOC_INPUTS covers ritual documents', () => {
  const rels = DAY_DOC_INPUTS.map((d) => d.rel);
  assert.ok(rels.includes('docs/MAIN_DAY_ISSUE.md'));
  assert.ok(rels.includes('docs/DAILY_CODE_REVIEW.md'));
  // Конвейер владельца (18.07): рефлексия работает НА сухих фактах аудитора.
  // Без этого входа она их не видит — 18.07 не назвала разрез областей ни разу.
  assert.ok(rels.includes('docs/DAILY_AUDIT.md'));
});

test('хроника подаётся в рефлексию РАНЬШЕ code-review: сначала что было, потом как написано', () => {
  const rels = DAY_DOC_INPUTS.map((d) => d.rel);
  assert.ok(rels.indexOf('docs/DAILY_AUDIT.md') < rels.indexOf('docs/DAILY_CODE_REVIEW.md'));
});
