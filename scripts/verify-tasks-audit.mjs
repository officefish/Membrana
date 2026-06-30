#!/usr/bin/env node
import {
  CLOSED_TASK_STATUSES,
  loadArchiveLog,
  loadRegistry,
  validateRegistryContract,
} from './lib/task-registry.mjs';

const strict = process.argv.includes('--strict');
const registry = loadRegistry();
const archive = loadArchiveLog();
const validation = validateRegistryContract(registry, { allowLegacyClosed: !strict });
const legacyClosed = registry.tasks.filter((task) => CLOSED_TASK_STATUSES.has(task.status));

for (const record of archive) {
  if (record.status !== 'archived') {
    validation.errors.push(`${record.id ?? '(missing id)'}: archive record status must be "archived"`);
  }
  if (!record.archivedAt) {
    validation.errors.push(`${record.id ?? '(missing id)'}: archive record must include archivedAt`);
  }
}

if (validation.warnings.length) {
  console.warn('Task registry warnings:');
  for (const warning of validation.warnings.slice(0, 20)) console.warn(`- ${warning}`);
  if (validation.warnings.length > 20) console.warn(`- … ${validation.warnings.length - 20} more`);
}

if (!strict && legacyClosed.length > 0) {
  console.warn(`Legacy closed rows still in registry: ${legacyClosed.length} (allowed during archive.jsonl migration)`);
}

if (validation.errors.length) {
  console.error('Task registry verification failed:');
  for (const error of validation.errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Task registry OK: ${registry.tasks.length} registry rows, ${archive.length} archive.jsonl rows.`);
