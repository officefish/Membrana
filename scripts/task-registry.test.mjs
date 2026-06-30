import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  archiveTask,
  findTask,
  listArchivedAll,
  listPendingGithubClose,
  loadArchiveLog,
  loadRegistry,
  renderTasksReadme,
  saveRegistry,
  validateTaskId,
  validateRegistryContract,
  writeArchiveCard,
} from './lib/task-registry.mjs';

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
    const cwd = mkdtempSync(join(tmpdir(), 'membrana-task-'));
    try {
      const registry = {
        version: 1,
        tasks: [
          {
            id: 'done-legacy-open',
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
        ],
      };
      saveRegistry(registry, cwd);
      const archived = archiveTask(registry, 'done-legacy-open', { cwd, force: true });
      saveRegistry(registry, cwd);
      assert.equal(archived.status, 'archived');
      const pending = listPendingGithubClose(loadRegistry(cwd));
      assert.equal(pending.length, 1);
      assert.equal(pending[0].id, 'done-legacy-open');
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('archiveTask moves hot task to archive.jsonl and removes it from registry', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'membrana-task-'));
    try {
      const registry = {
        version: 1,
        tasks: [
          {
            id: 'done-open',
            title: 'Done',
            promptPath: 'docs/prompts/X.md',
            githubIssue: 41,
            linearId: null,
            size: 'M',
            status: 'active',
            createdAt: '2026-05-01',
            archivedAt: null,
            archiveNotes: null,
          },
        ],
      };
      saveRegistry(registry, cwd);
      const archived = archiveTask(registry, 'done-open', { cwd, notes: 'Merged PR #1' });
      saveRegistry(registry, cwd);
      assert.equal(findTask(loadRegistry(cwd), 'done-open'), null);
      assert.equal(archived.archiveNotes, 'Merged PR #1');
      const archiveLog = loadArchiveLog(cwd);
      assert.equal(archiveLog.length, 1);
      assert.equal(archiveLog[0].id, 'done-open');
      assert.equal(listArchivedAll(loadRegistry(cwd), cwd)[0].id, 'done-open');
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('validateRegistryContract rejects hot promptless tasks but allows deferred promptless tasks', () => {
    const validation = validateRegistryContract({
      version: 1,
      tasks: [
        {
          id: 'deferred-no-prompt',
          title: 'Deferred',
          promptPath: null,
          githubIssue: null,
          linearId: null,
          size: 'S',
          status: 'deferred',
          createdAt: '2026-06-30',
        },
        {
          id: 'active-no-prompt',
          title: 'Active',
          promptPath: null,
          githubIssue: null,
          linearId: null,
          size: 'S',
          status: 'active',
          createdAt: '2026-06-30',
        },
      ],
    });
    assert.equal(validation.ok, false);
    assert.match(validation.errors.join('\n'), /active-no-prompt/);
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
