#!/usr/bin/env node
import { loadRegistry, loadArchiveLog, validateRegistryContract } from './lib/task-registry.mjs';

function countBy(items, keyFn) {
  const out = new Map();
  for (const item of items) {
    const key = keyFn(item);
    out.set(key, (out.get(key) ?? 0) + 1);
  }
  return [...out.entries()].sort(([a], [b]) => String(a).localeCompare(String(b)));
}

function printList(title, items, render) {
  console.log(`\n${title} (${items.length})`);
  if (items.length === 0) {
    console.log('  —');
    return;
  }
  for (const item of items) console.log(`  • ${render(item)}`);
}

const json = process.argv.includes('--json');
const strict = process.argv.includes('--strict');

const registry = loadRegistry();
const archive = loadArchiveLog();
const tasks = registry.tasks ?? [];
const validation = validateRegistryContract(registry, { allowLegacyClosed: !strict });
const promptless = tasks.filter((t) => t.promptPath == null || t.promptPath === '');
const promptlessHot = promptless.filter((t) => ['active', 'review', 'paused'].includes(t.status));
const legacyClosed = tasks.filter((t) => ['archived', 'closed', 'completed'].includes(t.status));
const deferred = tasks.filter((t) => t.status === 'deferred');

const report = {
  generatedAt: new Date().toISOString(),
  registry: {
    total: tasks.length,
    byStatus: Object.fromEntries(countBy(tasks, (t) => t.status ?? '(missing)')),
    promptless: promptless.map((t) => ({ id: t.id, status: t.status, title: t.title })),
    promptlessHot: promptlessHot.map((t) => ({ id: t.id, status: t.status, title: t.title })),
    legacyClosed: legacyClosed.map((t) => ({ id: t.id, status: t.status, title: t.title })),
    deferred: deferred.map((t) => ({ id: t.id, title: t.title })),
  },
  archiveLog: {
    total: archive.length,
    byStatus: Object.fromEntries(countBy(archive, (t) => t.status ?? '(missing)')),
  },
  validation,
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('# Task registry audit');
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Registry tasks: ${report.registry.total}`);
  for (const [status, count] of countBy(tasks, (t) => t.status ?? '(missing)')) {
    console.log(`- ${status}: ${count}`);
  }
  console.log(`Archive log records: ${report.archiveLog.total}`);
  printList('Promptless hot tasks (block ritual excerpts)', promptlessHot, (t) => `${t.id} [${t.status}] — ${t.title}`);
  printList('All promptless tasks', promptless, (t) => `${t.id} [${t.status}] — ${t.title}`);
  printList('Legacy closed rows still in registry', legacyClosed, (t) => `${t.id} [${t.status}] — ${t.title}`);
  if (validation.warnings.length) {
    printList('Warnings', validation.warnings, (w) => w);
  }
  if (validation.errors.length) {
    printList('Errors', validation.errors, (e) => e);
  }
}

if (!validation.ok) process.exitCode = 1;
