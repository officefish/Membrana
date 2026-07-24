/**
 * Список задач из docs/tasks/registry.json
 *
 * yarn task:list
 * yarn task:sync-readme           — перезаписать README (карантин, нужен FORCE)
 * yarn task:sync-readme --check   — тонкая обёртка над computeReadmeMatchesRegistry (M4D)
 */
import {
  listActive,
  listArchived,
  loadRegistry,
  syncTasksReadme,
} from './lib/task-registry.mjs';
import { runSyncReadmeCheck } from './lib/task-readme-check.mjs';

/**
 * @param {string[]} argv
 * @param {{
 *   cwd?: string,
 *   load?: typeof loadRegistry,
 *   readReadme?: (cwd: string) => string,
 *   computeReadmeMatchesRegistry?: (cards: object[], readmeText: string) => boolean | 'unknown',
 * }} [deps]
 * @returns {number}
 */
export function runTaskList(argv = process.argv.slice(2), deps = {}) {
  const wantCheck = argv.includes('--check');
  const wantSync = argv.includes('--sync-readme');

  if (wantCheck) {
    const { code, report } = runSyncReadmeCheck(deps);
    if (code === 0) console.log(report);
    else console.error(report);
    return code;
  }

  const cwd = deps.cwd ?? process.cwd();
  const load = deps.load ?? loadRegistry;
  const registry = load(cwd);

  if (wantSync) {
    const res = syncTasksReadme(registry, cwd);
    if (res.written) console.log('Обновлён:', res.path);
    else console.error(`⚠ README НЕ обновлён — ${res.reason}`);
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
  return 0;
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/task-list.mjs')) {
  process.exitCode = runTaskList(process.argv.slice(2));
}
