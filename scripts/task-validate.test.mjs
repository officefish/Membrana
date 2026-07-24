import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  GROUP_CHECK_NAMES,
  computeReadmeMatchesRegistry,
  emptyTaskLinks,
  extractActiveIdsFromReadme,
  formatValidityReport,
  groupActiveIssueUmbrella,
  groupDuplicateIds,
  groupParentEpicIntegrity,
  groupReadmeDrift,
  maxLevel,
  summarizeFindings,
  validateRegistry,
  validateTask,
} from './lib/task-validity.mjs';
import { detectPromptStub } from './lib/task-validity-links.mjs';
import { parseValidateArgs, runTaskValidate } from './task-validate.mjs';

/** @param {Partial<object> & { id: string }} t */
function card(t) {
  return {
    title: t.title ?? t.id,
    status: t.status ?? 'active',
    size: t.size ?? 'M',
    leadPersona: t.leadPersona ?? null,
    parentEpic: t.parentEpic ?? null,
    createdAt: t.createdAt ?? '2026-07-01',
    archivedAt: t.archivedAt ?? null,
    githubIssue: t.githubIssue ?? null,
    linearId: t.linearId ?? null,
    promptPath: t.promptPath ?? `docs/prompts/${t.id}.md`,
    insightId: t.insightId ?? null,
    githubIssueClosedAt: t.githubIssueClosedAt ?? null,
    ...t,
  };
}

test('maxLevel / summarizeFindings', () => {
  assert.equal(maxLevel('note', 'warning'), 'warning');
  assert.equal(maxLevel('blocker', 'warning'), 'blocker');
  const s = summarizeFindings([
    { level: 'note', cardId: 'a', field: 'x', message: 'm', code: 'c' },
    { level: 'warning', cardId: 'a', field: 'y', message: 'm', code: 'c' },
  ]);
  assert.equal(s.ok, true);
  assert.equal(s.level, 'warning');
});

test('validateTask: blocker — пустой title / нет промпта на диске', () => {
  const r = validateTask(card({ id: 'x', title: '', linearId: 'DRU-1' }), {
    ...emptyTaskLinks(card({ id: 'x', linearId: 'DRU-1' })),
    promptExists: false,
    promptIsStub: false,
    issueState: null,
    linearState: 'open',
  });
  assert.equal(r.ok, false);
  assert.equal(r.level, 'blocker');
  assert.ok(r.findings.some((f) => f.code === 'field.title.missing'));
  assert.ok(r.findings.some((f) => f.code === 'link.prompt.missing'));
  assert.ok(r.findings.every((f) => f.cardId && f.field));
});

test('validateTask: unknown ≤ warning (прокси упал)', () => {
  const r = validateTask(
    card({ id: 'x', githubIssue: 10, linearId: 'DRU-1' }),
    {
      issueState: 'unknown',
      linearState: 'unknown',
      promptExists: true,
      promptIsStub: false,
      insightExists: null,
    },
  );
  assert.equal(r.ok, true);
  assert.equal(r.level, 'warning');
  assert.ok(r.findings.every((f) => f.level !== 'blocker'));
  assert.ok(r.findings.some((f) => f.code === 'link.issue.unknown'));
  assert.ok(r.findings.some((f) => f.code === 'link.linear.unknown'));
});

test('validateTask: warning — stub промпт и пустой linearId', () => {
  const r = validateTask(card({ id: 'x', linearId: null, githubIssue: 1 }), {
    issueState: 'open',
    linearState: null,
    promptExists: true,
    promptIsStub: true,
    insightExists: null,
  });
  assert.equal(r.ok, true);
  assert.equal(r.level, 'warning');
  assert.ok(r.findings.some((f) => f.code === 'link.prompt.stub'));
  assert.ok(r.findings.some((f) => f.code === 'field.linearId.missing'));
});

test('validateTask: note — архив без githubIssueClosedAt', () => {
  const r = validateTask(
    card({
      id: 'arch',
      status: 'archived',
      archivedAt: '2026-07-10',
      githubIssue: 5,
      linearId: 'DRU-9',
      githubIssueClosedAt: null,
    }),
    {
      issueState: 'closed',
      linearState: 'closed',
      promptExists: true,
      promptIsStub: false,
      insightExists: null,
    },
  );
  assert.equal(r.ok, true);
  assert.equal(r.level, 'note');
  assert.ok(r.findings.some((f) => f.code === 'field.githubIssueClosedAt.missing'));
});

test('validateRegistry: group duplicate ids — blocker', () => {
  const cards = [card({ id: 'dup', linearId: 'A' }), card({ id: 'dup', linearId: 'B', title: 'other' })];
  const r = validateRegistry(cards, {
    byCard: {
      dup: {
        issueState: null,
        linearState: 'open',
        promptExists: true,
        promptIsStub: false,
        insightExists: null,
      },
    },
    readmeMatchesRegistry: true,
  });
  assert.equal(r.ok, false);
  assert.ok(r.groupFindings.some((f) => f.code === 'group.id.duplicate'));
});

test('validateRegistry: umbrella active issue — warning', () => {
  const cards = [
    card({ id: 'a', githubIssue: 42, linearId: 'DRU-1' }),
    card({ id: 'b', githubIssue: 42, linearId: 'DRU-2' }),
  ];
  const links = {
    byCard: Object.fromEntries(
      cards.map((c) => [
        c.id,
        {
          issueState: 'open',
          linearState: 'open',
          promptExists: true,
          promptIsStub: false,
          insightExists: null,
        },
      ]),
    ),
    readmeMatchesRegistry: true,
  };
  const r = validateRegistry(cards, links);
  assert.equal(r.ok, true);
  assert.ok(r.groupFindings.some((f) => f.code === 'group.issue.umbrella'));
});

test('group checks: не выполнимы на одной карточке (инвариант)', () => {
  assert.deepEqual(GROUP_CHECK_NAMES, [
    'groupDuplicateIds',
    'groupActiveIssueUmbrella',
    'groupParentEpicIntegrity',
    'groupReadmeDrift',
  ]);
  const one = [card({ id: 'solo', githubIssue: 1, linearId: 'DRU-1', parentEpic: null })];
  assert.equal(groupDuplicateIds(one).length, 0);
  assert.equal(groupActiveIssueUmbrella(one).length, 0);
  assert.equal(groupParentEpicIntegrity(one).length, 0);
  // umbrella / orphan / duplicate требуют второго элемента или внешнего слепка
  const orphan = [card({ id: 'o', parentEpic: 'missing', linearId: 'DRU-1' })];
  assert.ok(groupParentEpicIntegrity(orphan).length >= 1);
  const two = [
    card({ id: 'a', githubIssue: 7, linearId: 'DRU-1' }),
    card({ id: 'b', githubIssue: 7, linearId: 'DRU-2' }),
  ];
  assert.ok(groupActiveIssueUmbrella(two).length >= 2);
  assert.ok(groupReadmeDrift(false).length === 1);
  assert.ok(groupReadmeDrift('unknown').every((f) => f.level === 'warning'));
});

test('extractActiveIdsFromReadme / computeReadmeMatchesRegistry', () => {
  const readme = `# x

## Активные задачи

| ID | Название |
|----|----------|
| \`alpha\` | A |
| \`beta\` | B |

## Архив

| ID |
|----|
| \`old\` |
`;
  assert.deepEqual(extractActiveIdsFromReadme(readme), ['alpha', 'beta']);
  assert.equal(
    computeReadmeMatchesRegistry(
      [card({ id: 'alpha', linearId: '1' }), card({ id: 'beta', linearId: '2' })],
      readme,
    ),
    true,
  );
  assert.equal(
    computeReadmeMatchesRegistry([card({ id: 'alpha', linearId: '1' })], readme),
    false,
  );
});

test('detectPromptStub', () => {
  assert.equal(detectPromptStub('живой промпт без заготовки'), false);
  assert.equal(
    detectPromptStub('Acceptance criteria (scaffold)\n\n> Заполнить до кода.\n- [ ] …'),
    true,
  );
});

test('formatValidityReport содержит адрес', () => {
  const r = validateTask(card({ id: 'z', title: '' }), {
    promptExists: true,
    promptIsStub: false,
    issueState: null,
    linearState: null,
    insightExists: null,
  });
  const text = formatValidityReport(r);
  assert.match(text, /z\.title/);
});

test('parseValidateArgs / CLI exit 0 при blocker (зрение не забор)', () => {
  const args = parseValidateArgs(['my-card', '--json']);
  assert.equal(args.id, 'my-card');
  assert.equal(args.json, true);

  const code = runTaskValidate(['missing-card-xyz'], {
    cwd: process.cwd(),
    load: () => ({ version: 1, tasks: [card({ id: 'only', linearId: 'DRU-1' })] }),
  });
  assert.equal(code, 2);

  let stdout = '';
  const orig = console.log;
  console.log = (...a) => {
    stdout += a.join(' ') + '\n';
  };
  try {
    const okCode = runTaskValidate([], {
      cwd: process.cwd(),
      load: () => ({
        version: 1,
        tasks: [card({ id: 'bad', title: '', linearId: null, promptPath: 'nope.md' })],
      }),
    });
    // load подменён, но collect читает fs — exit всё равно 0
    assert.equal(okCode, 0);
  } finally {
    console.log = orig;
  }
  assert.match(stdout, /task:validate/);
});
