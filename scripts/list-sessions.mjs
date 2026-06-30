/**
 * Вывод таблицы архивированных сессий из docs/sessions/*.meta.json
 * Использование: yarn list:sessions [--all] [--filter YYYY-MM-DD] [--branch <name>]
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const SHOW_ALL = args.includes('--all');
const filterIdx = args.indexOf('--filter');
const dateFilter = filterIdx !== -1 ? args[filterIdx + 1] : null;
const branchIdx = args.indexOf('--branch');
const branchFilter = branchIdx !== -1 ? args[branchIdx + 1] : null;

const sessionsDir = resolve(process.cwd(), 'docs/sessions');
if (!existsSync(sessionsDir)) {
  console.log('docs/sessions/ не существует — нет архивированных сессий.');
  process.exit(0);
}

const files = readdirSync(sessionsDir).filter((f) => f.endsWith('.meta.json'));
if (files.length === 0) {
  console.log('Нет архивированных сессий.');
  process.exit(0);
}

const metas = files
  .map((f) => {
    try {
      return JSON.parse(readFileSync(join(sessionsDir, f), 'utf8'));
    } catch {
      return null;
    }
  })
  .filter(Boolean)
  .filter((m) => SHOW_ALL || !m.isIncomplete)
  .filter((m) => !dateFilter || (m.openedAt ?? '').startsWith(dateFilter))
  .filter((m) => !branchFilter || m.branch === branchFilter);

if (metas.length === 0) {
  console.log('Нет сессий по заданному фильтру.');
  process.exit(0);
}

const headers = ['UUID', 'Branch', 'Date', 'Turns', 'Secrets', 'Ref'];
const rows = metas.map((m) => [
  (m.sessionId ?? '').slice(0, 8),
  m.branch ?? '—',
  (m.openedAt ?? '').slice(0, 10),
  String(m.turnCount ?? 0),
  String(m.secretsRedacted ?? 0),
  m.archiveRef ? m.archiveRef.slice(0, 8) : m.isIncomplete ? '⚠ incomplete' : '—',
]);

const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
const line = widths.map((w) => '-'.repeat(w)).join('-+-');
const fmt = (row) => row.map((v, i) => (v ?? '').padEnd(widths[i]!)).join(' | ');

console.log(fmt(headers));
console.log(line);
for (const row of rows) console.log(fmt(row));
