/**
 * Preview скрублированного содержимого сессии (первые 100 символов каждого turn'а).
 * Использование: yarn inspect:session <uuid>
 */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { readdirSync } from 'node:fs';

let svc;
try {
  svc = await import('../packages/services/session-archive/dist/index.js');
} catch {
  console.error(
    '❌ @membrana/session-archive-service не собран. Запустите: yarn turbo run build --filter=@membrana/session-archive-service',
  );
  process.exit(1);
}
const { parseClaudeCodeJSONL, scrubSecrets } = svc;

const uuid = process.argv[2];
if (!uuid) {
  console.error('Использование: yarn inspect:session <uuid>');
  process.exit(1);
}

// Найти JSONL
function findJsonl(uid) {
  const base = join(homedir(), '.claude', 'projects');
  if (!existsSync(base)) return null;
  for (const dir of readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(base, d.name))) {
    const p = join(dir, `${uid}.jsonl`);
    if (existsSync(p)) return p;
  }
  return null;
}

// Проверить .meta.json
const metaPath = resolve(process.cwd(), 'docs/sessions', `${uuid}.meta.json`);
if (existsSync(metaPath)) {
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  console.log('--- meta ---');
  console.log(JSON.stringify(meta, null, 2));
  console.log('------------');
}

const jsonlPath = findJsonl(uuid);
if (!jsonlPath) {
  console.error(`JSONL-файл для сессии ${uuid} не найден.`);
  process.exit(1);
}

const turns = parseClaudeCodeJSONL(readFileSync(jsonlPath));
const scrubbed = turns.map((t) => scrubSecrets(t));

console.log(`\n${scrubbed.length} turns (скрублено):\n`);
for (const t of scrubbed) {
  const preview = t.content.slice(0, 100).replace(/\n/g, ' ');
  const redact = t.wasRedacted ? ' [⚠ redacted]' : '';
  console.log(`[${t.role}] ${t.timestamp} ${redact}`);
  console.log(`  ${preview}${t.content.length > 100 ? '…' : ''}`);
}
