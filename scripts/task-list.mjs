/**
 * Список задач из docs/tasks/registry.json
 */
import {
  listActive,
  listArchived,
  loadRegistry,
  syncTasksReadme,
} from './lib/task-registry.mjs';

const sync = process.argv.includes('--sync-readme');

const registry = loadRegistry();

if (sync) {
  const path = syncTasksReadme(registry);
  console.log('Обновлён:', path);
  console.log('');
}

const active = listActive(registry);
const archived = listArchived(registry);

console.log(`Активные (${active.length}):`);
if (active.length === 0) {
  console.log('  —');
} else {
  for (const t of active) {
    const gh = t.githubIssue != null ? ` #${t.githubIssue}` : '';
    console.log(`  • ${t.id} [${t.size}]${gh} — ${t.title}`);
  }
}

console.log('');
console.log(`Архив (${archived.length}):`);
if (archived.length === 0) {
  console.log('  —');
} else {
  for (const t of archived) {
    console.log(`  • ${t.id} (${t.archivedAt ?? '?'}) — ${t.title}`);
  }
}
