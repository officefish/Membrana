import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTaskEntry,
  findEpicIssueCollisions,
  findTask,
  listPendingGithubClose,
  loadRegistry,
  renderTaskPromptStub,
  renderTasksReadme,
  saveRegistry,
  syncTasksReadme,
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

// ─── карантин синка README: генератор не должен молча стирать ручные секции ───────

describe('syncTasksReadme — карантин (23.07)', () => {
  const registry = { version: 1, tasks: [] };

  /** Готовит временный docs/tasks/README.md с ручной секцией и возвращает пути. */
  const withReadme = () => {
    const dir = mkdtempSync(join(tmpdir(), 'tasks-readme-'));
    const path = join(dir, 'docs', 'tasks', 'README.md');
    mkdirSync(join(dir, 'docs', 'tasks'), { recursive: true });
    writeFileSync(path, '# Реестр\n\n## Мастерская дома (HOME_WORKSHOP)\nручная секция\n', 'utf8');
    return { dir, path };
  };

  it('по умолчанию НЕ пишет и называет причину — ручная секция цела', () => {
    const { dir, path } = withReadme();
    try {
      const res = syncTasksReadme(registry, dir, { env: {} });
      assert.equal(res.written, false);
      assert.match(res.reason, /карантин/iu);
      assert.match(res.reason, /tooling-atlas/u, 'причина называет правильный дом описания');
      assert.match(readFileSync(path, 'utf8'), /HOME_WORKSHOP/u, 'чужая секция не стёрта');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('обход осознанный: force / TASKS_README_SYNC_FORCE=1 пишет как раньше', () => {
    const { dir, path } = withReadme();
    try {
      const res = syncTasksReadme(registry, dir, { force: true, env: {} });
      assert.equal(res.written, true);
      assert.doesNotMatch(readFileSync(path, 'utf8'), /HOME_WORKSHOP/u, 'генератор перезаписал — это и есть класс дефекта');

      writeFileSync(path, '## Мастерская дома (HOME_WORKSHOP)\n', 'utf8');
      const viaEnv = syncTasksReadme(registry, dir, { env: { TASKS_README_SYNC_FORCE: '1' } });
      assert.equal(viaEnv.written, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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

  // T1 (#548): --prompt и --parent-epic реально применяются, а не игнорируются.
  it('buildTaskEntry: аватар кладётся в канон — роль и регистр приводятся к имени', () => {
    const e = buildTaskEntry(
      { id: 'x-y', title: 'T', size: 'S', lead: 'musician', support: ['Ozhegov', 'teamlead'] },
      '2026-07-18',
    );
    // Нормализация жила только на ЧТЕНИИ, поэтому реестр копил обе формы: 18.07 в нём
    // лежало 36 значений `musician` против 1 `kuryokhin` и записи в разном регистре.
    // Роутинг это переживал (PERSONA_ALIASES), прямой читатель реестра — нет.
    assert.equal(e.leadPersona, 'kuryokhin');
    assert.deepEqual(e.supportPersonas, ['ozhegov', 'vesnin']);
  });

  it('buildTaskEntry: аватара нет — остаётся null, пустой список пустым', () => {
    const e = buildTaskEntry({ id: 'x-y', title: 'T', size: 'S' }, '2026-07-18');
    assert.equal(e.leadPersona, null);
    assert.deepEqual(e.supportPersonas, []);
  });

  it('buildTaskEntry: --prompt → promptPath (не дефолтный id-путь)', () => {
    const e = buildTaskEntry(
      { id: 'my-epic', title: 'E', size: 'L', prompt: 'docs/prompts/SHARED_EPIC_PROMPT.md' },
      '2026-07-16',
    );
    assert.equal(e.promptPath, 'docs/prompts/SHARED_EPIC_PROMPT.md');
  });

  it('buildTaskEntry: promptPath имеет приоритет над prompt; иначе дефолт из id', () => {
    assert.equal(
      buildTaskEntry({ id: 'x-y', title: 'T', size: 'S', promptPath: 'a.md', prompt: 'b.md' }, '2026-07-16').promptPath,
      'a.md',
    );
    assert.equal(
      buildTaskEntry({ id: 'x-y', title: 'T', size: 'S' }, '2026-07-16').promptPath,
      'docs/prompts/X_Y_PROMPT.md',
    );
  });

  it('buildTaskEntry: --parent-epic/--parent → parentEpic; без него поля нет', () => {
    assert.equal(
      buildTaskEntry({ id: 'ph1', title: 'P', size: 'M', 'parent-epic': 'my-epic' }, '2026-07-16').parentEpic,
      'my-epic',
    );
    assert.equal(
      buildTaskEntry({ id: 'ph1', title: 'P', size: 'M', parent: 'my-epic' }, '2026-07-16').parentEpic,
      'my-epic',
    );
    assert.ok(!('parentEpic' in buildTaskEntry({ id: 'ph1', title: 'P', size: 'M' }, '2026-07-16')));
  });
});
