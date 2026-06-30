import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  archiveTask,
  buildLegacyArchiveMigrationManifest,
  findTask,
  listArchivedAll,
  listLegacyClosed,
  listPendingGithubClose,
  loadArchiveLog,
  loadRegistry,
  migrateLegacyClosedToArchiveLog,
  renderTasksReadme,
  rollbackLegacyClosedMigration,
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

describe('task archive migration', () => {
  it('migration manifest moves legacy closed rows to archive log', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'membrana-task-migrate-'));
    try {
      const registry = {
        version: 1,
        tasks: [
          {
            id: 'open-one',
            title: 'Open',
            promptPath: 'docs/prompts/OPEN.md',
            githubIssue: null,
            linearId: null,
            size: 'S',
            status: 'active',
            createdAt: '2026-06-01',
            archivedAt: null,
            archiveNotes: null,
          },
          {
            id: 'closed-one',
            title: 'Closed',
            promptPath: 'docs/prompts/CLOSED.md',
            githubIssue: 10,
            linearId: null,
            size: 'M',
            status: 'closed',
            createdAt: '2026-06-01',
            archivedAt: '2026-06-02',
            archiveNotes: 'Closed manually',
            githubIssueClosedAt: '2026-06-02',
          },
          {
            id: 'completed-one',
            title: 'Completed',
            promptPath: 'docs/prompts/DONE.md',
            githubIssue: null,
            linearId: null,
            size: 'M',
            status: 'completed',
            createdAt: '2026-06-01',
            archivedAt: '2026-06-03',
            archiveNotes: null,
          },
        ],
      };
      saveRegistry(registry, cwd);
      const manifest = buildLegacyArchiveMigrationManifest(registry, {
        id: 'test-migration',
        createdAt: '2026-06-30T00:00:00.000Z',
      });
      assert.equal(manifest.moveCount, 2);

      const result = migrateLegacyClosedToArchiveLog(registry, manifest, cwd);
      saveRegistry(registry, cwd);
      assert.equal(result.moved.length, 2);
      assert.equal(listLegacyClosed(loadRegistry(cwd)).length, 0);
      assert.equal(findTask(loadRegistry(cwd), 'open-one').status, 'active');

      const archiveLog = loadArchiveLog(cwd);
      assert.equal(archiveLog.length, 2);
      assert.equal(archiveLog.find((task) => task.id === 'closed-one').originalStatus, 'closed');
      assert.equal(archiveLog.find((task) => task.id === 'completed-one').originalStatus, 'completed');
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('migration rollback restores legacy rows and statuses', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'membrana-task-rollback-'));
    try {
      const registry = {
        version: 1,
        tasks: [
          {
            id: 'archived-one',
            title: 'Archived',
            promptPath: 'docs/prompts/A.md',
            githubIssue: null,
            linearId: null,
            size: 'M',
            status: 'archived',
            createdAt: '2026-06-01',
            archivedAt: '2026-06-02',
            archiveNotes: null,
          },
        ],
      };
      saveRegistry(registry, cwd);
      const manifest = buildLegacyArchiveMigrationManifest(registry, {
        id: 'test-rollback',
        createdAt: '2026-06-30T00:00:00.000Z',
      });
      migrateLegacyClosedToArchiveLog(registry, manifest, cwd);
      saveRegistry(registry, cwd);
      assert.equal(loadRegistry(cwd).tasks.length, 0);

      const restoredRegistry = loadRegistry(cwd);
      const result = rollbackLegacyClosedMigration(restoredRegistry, manifest, cwd);
      saveRegistry(restoredRegistry, cwd);
      assert.equal(result.restored.length, 1);
      assert.equal(findTask(loadRegistry(cwd), 'archived-one').status, 'archived');
      assert.equal(loadArchiveLog(cwd).length, 0);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
