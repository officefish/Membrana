#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  backupRegistry,
  buildLegacyArchiveMigrationManifest,
  CLOSED_TASK_STATUSES,
  loadArchiveLog,
  loadRegistry,
  migrateLegacyClosedToArchiveLog,
  resolveTasksMigrationDir,
  rollbackLegacyClosedMigration,
  saveRegistry,
  syncTasksReadme,
  validateRegistryContract,
} from './lib/task-registry.mjs';

const [, , rawCommand = 'preflight', ...args] = process.argv;
const write = args.includes('--write');
const strict = args.includes('--strict');
const manifestArg = args.find((arg) => arg.startsWith('--manifest='));
const today = new Date().toISOString().slice(0, 10);
const stamp = today.replaceAll('-', '');

function gitStatusShort() {
  return execFileSync('git', ['status', '--short'], { encoding: 'utf8' }).trim();
}

function ensureCleanTree() {
  const status = gitStatusShort();
  if (status) {
    throw new Error(`Working tree must be clean before task archive migration.\n${status}`);
  }
}

function manifestPath() {
  if (manifestArg) return resolve(process.cwd(), manifestArg.slice('--manifest='.length));
  return resolve(resolveTasksMigrationDir(), `task-archive-migration-${today}.json`);
}

function loadManifest(path = manifestPath()) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function countByStatus(tasks) {
  const out = {};
  for (const task of tasks) out[task.status] = (out[task.status] ?? 0) + 1;
  return out;
}

function summarize(registry, archive, manifest) {
  return {
    registryRows: registry.tasks.length,
    archiveRows: archive.length,
    registryByStatus: countByStatus(registry.tasks),
    legacyClosedRows: registry.tasks.filter((task) => CLOSED_TASK_STATUSES.has(task.status)).length,
    manifestMoveCount: manifest?.moveCount ?? null,
  };
}

function runPreflight() {
  const status = gitStatusShort();
  if (write && status) {
    throw new Error(`Working tree must be clean before writing migration preflight artifacts.\n${status}`);
  }
  const registry = loadRegistry();
  const archive = loadArchiveLog();
  const validation = validateRegistryContract(registry, { allowLegacyClosed: !strict });
  if (validation.errors.length) {
    throw new Error(`Registry validation failed:\n${validation.errors.map((e) => `- ${e}`).join('\n')}`);
  }

  const manifest = buildLegacyArchiveMigrationManifest(registry, {
    id: `task-archive-migration-${today}`,
  });
  const path = manifestPath();
  const backupPath = resolve(process.cwd(), 'docs/tasks/backups', `registry-${stamp}.json`);

  console.log('# task archive migration preflight');
  console.log(JSON.stringify(summarize(registry, archive, manifest), null, 2));
  if (status) console.log(`workingTree: dirty (${status.split(/\r?\n/u).length} paths)`);
  console.log(`manifest: ${path}`);
  console.log(`backup: ${backupPath}`);

  if (write) {
    const actualBackupPath = backupRegistry(stamp);
    writeJson(path, manifest);
    console.log(`wrote backup: ${actualBackupPath}`);
    console.log(`wrote manifest: ${path}`);
  } else {
    console.log('dry-run: pass --write to create backup + manifest');
  }
}

function runMigrate() {
  ensureCleanTree();
  const path = manifestPath();
  if (!existsSync(path)) throw new Error(`Migration manifest not found: ${path}. Run preflight --write first.`);
  const manifest = loadManifest(path);
  const registry = loadRegistry();
  const archiveBefore = loadArchiveLog();
  const validation = validateRegistryContract(registry, { allowLegacyClosed: true });
  if (validation.errors.length) {
    throw new Error(`Registry validation failed:\n${validation.errors.map((e) => `- ${e}`).join('\n')}`);
  }

  const result = migrateLegacyClosedToArchiveLog(registry, manifest);
  saveRegistry(registry);
  syncTasksReadme(registry);
  const archiveAfter = loadArchiveLog();

  console.log('# task archive migration applied');
  console.log(JSON.stringify({
    manifest: path,
    moved: result.moved.length,
    kept: result.kept.length,
    archiveBefore: archiveBefore.length,
    archiveAfter: archiveAfter.length,
    legacyClosedRowsAfter: registry.tasks.filter((task) => CLOSED_TASK_STATUSES.has(task.status)).length,
  }, null, 2));
}

function runRollback() {
  ensureCleanTree();
  const path = manifestPath();
  if (!existsSync(path)) throw new Error(`Migration manifest not found: ${path}`);
  const manifest = loadManifest(path);
  const registry = loadRegistry();
  const result = rollbackLegacyClosedMigration(registry, manifest);
  saveRegistry(registry);
  syncTasksReadme(registry);
  console.log('# task archive migration rollback applied');
  console.log(JSON.stringify({
    manifest: path,
    restored: result.restored.length,
    remainingArchive: result.remainingArchive.length,
  }, null, 2));
}

try {
  if (rawCommand === 'preflight') runPreflight();
  else if (rawCommand === 'migrate') runMigrate();
  else if (rawCommand === 'rollback') runRollback();
  else {
    throw new Error(`Unknown command: ${rawCommand}. Use preflight | migrate | rollback.`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
