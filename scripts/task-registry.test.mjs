import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  findEpicIssueCollisions,
  findTask,
  listPendingGithubClose,
  loadRegistry,
  renderTaskPromptStub,
  renderTasksReadme,
  saveRegistry,
  validateTaskId,
  writeArchiveCard,
} from './lib/task-registry.mjs';

/** Фаза эпика: githubIssue задаётся тестом (свой номер / номер эпика / null). */
function phase(id, parentEpic, githubIssue, status = 'archived') {
  return {
    id,
    title: id,
    promptPath: `docs/prompts/${id}.md`,
    githubIssue,
    parentEpic,
    linearId: null,
    size: 'S',
    status,
    createdAt: '2026-07-01',
    archivedAt: status === 'archived' ? '2026-07-02' : null,
    archiveNotes: null,
    githubIssueClosedAt: null,
  };
}

describe('task-registry', () => {
  it('validateTaskId accepts kebab-case', () => {
    assert.doesNotThrow(() => validateTaskId('fft-indices-viz'));
    assert.throws(() => validateTaskId('Bad_ID'));
  });

  it('archive card contains title and prompt path', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'membrana-task-'));
    try {
      const registry = {
        version: 1,
        tasks: [
          {
            id: 'demo-task',
            title: 'Demo task',
            promptPath: 'docs/prompts/DEMO_PROMPT.md',
            githubIssue: 99,
            linearId: null,
            size: 'M',
            status: 'archived',
            createdAt: '2026-05-15',
            archivedAt: '2026-05-15',
            archiveNotes: 'Done in PR #1',
          },
        ],
      };
      saveRegistry(registry, cwd);
      const task = findTask(loadRegistry(cwd), 'demo-task');
      const card = writeArchiveCard(task, cwd);
      const text = readFileSync(card, 'utf8');
      assert.match(text, /Demo task/);
      assert.match(text, /docs\/prompts\/DEMO_PROMPT.md/);
      assert.match(text, /PR #1/);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('listPendingGithubClose finds archived tasks with open Issue', () => {
    const pending = listPendingGithubClose({
      version: 1,
      tasks: [
        {
          id: 'done-open',
          title: 'Done',
          promptPath: 'docs/prompts/X.md',
          githubIssue: 41,
          linearId: null,
          size: 'M',
          status: 'archived',
          createdAt: '2026-05-01',
          archivedAt: '2026-05-10',
          archiveNotes: null,
          githubIssueClosedAt: null,
        },
        {
          id: 'done-closed',
          title: 'Closed',
          promptPath: 'docs/prompts/Y.md',
          githubIssue: 2,
          linearId: null,
          size: 'M',
          status: 'archived',
          createdAt: '2026-05-01',
          archivedAt: '2026-05-10',
          archiveNotes: null,
          githubIssueClosedAt: '2026-05-11',
        },
      ],
    });
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, 'done-open');
  });

  // ─── ретро #485 п.5: фаза не должна носить githubIssue своего эпика ──────────────

  it('findEpicIssueCollisions ловит фазу с Issue эпика', () => {
    const registry = {
      version: 1,
      tasks: [
        { ...phase('epic-x', null, 438), id: 'epic-x', parentEpic: null },
        phase('ph-own-issue', 'epic-x', 500),
        phase('ph-no-issue', 'epic-x', null),
        phase('ph-epic-issue', 'epic-x', 438),
      ],
    };
    const found = findEpicIssueCollisions(registry);
    assert.deepEqual(
      found.map((t) => t.id),
      ['ph-epic-issue'],
      'своя ручка и null — норма; номер эпика — коллизия',
    );
  });

  it('findEpicIssueCollisions не спотыкается о битый parentEpic и эпик без Issue', () => {
    const registry = {
      version: 1,
      tasks: [
        { ...phase('epic-no-issue', null, null), parentEpic: null },
        phase('ph-orphan', 'epic-which-does-not-exist', 438),
        phase('ph-under-issueless-epic', 'epic-no-issue', null),
      ],
    };
    // Эпика нет в реестре (в живом реестре такие есть) → сравнивать не с чем, не падаем.
    assert.deepEqual(findEpicIssueCollisions(registry), []);
  });

  it('listPendingGithubClose не берёт фазу с Issue эпика (закрыла бы весь эпик)', () => {
    const registry = {
      version: 1,
      tasks: [
        { ...phase('epic-x', null, 438), parentEpic: null },
        phase('ph-epic-issue', 'epic-x', 438),
        phase('ph-own-issue', 'epic-x', 500),
      ],
    };
    assert.deepEqual(
      listPendingGithubClose(registry).map((t) => t.id),
      // Сам эпик свой Issue закрывать обязан — гард только против ФАЗ-носителей.
      ['epic-x', 'ph-own-issue'],
      'фаза со своим Issue закрывается, носитель Issue эпика — нет',
    );
  });

  it('живой registry.json: в очередь закрытия не попадает ни один Issue эпика', () => {
    // Регрессия на реальных данных: на 2026-07-15 в реестре 189 фаз носят Issue
    // своего эпика, 33 из них — архивные и в очереди. Ни одна не должна закрыть эпик.
    const registry = loadRegistry(process.cwd());
    const byId = new Map(registry.tasks.map((t) => [t.id, t]));
    const leaking = listPendingGithubClose(registry).filter((t) => {
      const epic = t.parentEpic ? byId.get(t.parentEpic) : null;
      return epic && epic.githubIssue != null && epic.githubIssue === t.githubIssue;
    });
    assert.deepEqual(
      leaking.map((t) => `${t.id}→#${t.githubIssue}`),
      [],
      'очередь task:close-github закрыла бы Issue эпика',
    );
  });

  it('renderTasksReadme lists active and archived', () => {
    const md = renderTasksReadme({
      version: 1,
      tasks: [
        {
          id: 'active-one',
          title: 'Active',
          promptPath: 'docs/prompts/A_PROMPT.md',
          githubIssue: null,
          linearId: null,
          size: 'S',
          status: 'active',
          createdAt: '2026-05-15',
          archivedAt: null,
          archiveNotes: null,
        },
        {
          id: 'done-one',
          title: 'Done',
          promptPath: 'docs/prompts/B_PROMPT.md',
          githubIssue: 1,
          linearId: null,
          size: 'M',
          status: 'archived',
          createdAt: '2026-05-01',
          archivedAt: '2026-05-10',
          archiveNotes: null,
        },
      ],
    });
    assert.match(md, /active-one/);
    assert.match(md, /done-one/);
    assert.match(md, /Активные задачи/);
    assert.match(md, /Архив/);
  });
});

// ─── #476 п.5: task:register создаёт заготовку промпта ────────────────────────────

describe('renderTaskPromptStub', () => {
  const template = [
    '# Промпт: <краткое название задачи>',
    '> Скопируй блок. Размер задачи: **S | M | L**.',
    '> Реестр: `id` = `<slug>` в registry.',
    '**GitHub Issue:** #<номер> (после создания).',
    '## Проблема / наблюдение',
    '<!-- Что заметили в эпике, продукте или архитектуре? -->',
  ].join('\n');

  it('подставляет заголовок, размер, id и Issue', () => {
    const md = renderTaskPromptStub(template, {
      id: 'hot-repo-flow',
      title: 'hot-repo-flow: merge-driver + pr:ship',
      size: 'M',
      githubIssue: 510,
    });
    assert.match(md, /^# Промпт: hot-repo-flow: merge-driver \+ pr:ship$/mu);
    assert.match(md, /Размер задачи: \*\*M\*\*/u);
    assert.match(md, /`id` = `hot-repo-flow`/u);
    assert.match(md, /issues\/510/u);
    assert.match(md, /ЗАГОТОВКА, созданная yarn task:register/u);
  });

  it('без Issue — честная пометка, а не «#undefined»', () => {
    const md = renderTaskPromptStub(template, { id: 'x', title: 'X', size: 'S', githubIssue: null });
    assert.match(md, /\*\*GitHub Issue:\*\* — \(не заведён\)/u);
    assert.doesNotMatch(md, /undefined|null/u);
  });
});
