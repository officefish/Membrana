/**
 * Фасад архивации AI-сессии Claude Code.
 * Использование: yarn archive:session [--uuid <uuid>] [--dry-run]
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';

// Динамический импорт пакета (build required)
let svc;
try {
  svc = await import('../packages/services/session-archive/dist/index.js');
} catch {
  console.error(
    '❌ @membrana/session-archive-service не собран. Запустите: yarn turbo run build --filter=@membrana/session-archive-service',
  );
  process.exit(1);
}

const { parseClaudeCodeJSONL, scrubSecrets, deduplicateTurns } = svc;

// ---------------------------------------------------------------------------
// Аргументы
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const uuidIdx = args.indexOf('--uuid');
const targetUuid = uuidIdx !== -1 ? args[uuidIdx + 1] : null;

// ---------------------------------------------------------------------------
// Вспомогательные
// ---------------------------------------------------------------------------
function currentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function claudeProjectDirs() {
  const base = join(homedir(), '.claude', 'projects');
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(base, d.name));
}

function findSessionFiles(targetUid) {
  const found = [];
  for (const dir of claudeProjectDirs()) {
    const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
    for (const f of files) {
      const uuid = f.replace('.jsonl', '');
      if (!targetUid || uuid === targetUid) {
        found.push({ uuid, path: join(dir, f) });
      }
    }
  }
  return found;
}

async function uploadSession(sessionId, turns, meta) {
  const endpoint = process.env.BACKGROUND_MEDIA_URL ?? 'http://localhost:3001';
  const url = `${endpoint}/api/sessions/upload`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, turns, meta }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return { status: 'uploaded', archiveRef: data.archiveRef ?? null };
  } catch (err) {
    return { status: 'error', error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const branch = currentBranch();
const sessionsDir = resolve(process.cwd(), 'docs/sessions');
mkdirSync(sessionsDir, { recursive: true });

const sessionFiles = findSessionFiles(targetUuid);
if (sessionFiles.length === 0) {
  console.log(targetUuid ? `Сессия ${targetUuid} не найдена.` : 'Нет JSONL-сессий в ~/.claude/projects/.');
  process.exit(0);
}

const rows = [];

for (const { uuid, path } of sessionFiles) {
  const metaPath = join(sessionsDir, `${uuid}.meta.json`);
  if (existsSync(metaPath) && !DRY_RUN && !targetUuid) continue;

  const buffer = readFileSync(path);
  const raw = parseClaudeCodeJSONL(buffer);
  const scrubbed = raw.map((t) => scrubSecrets(t));
  const unique = deduplicateTurns(scrubbed);

  const secretsCount = scrubbed.filter((t) => t.wasRedacted).length;
  const dedupedCount = raw.length - unique.length;

  const meta = {
    sessionId: uuid,
    tool: 'claude-code',
    projectPath: path,
    branch,
    openedAt: unique[0]?.timestamp ?? new Date().toISOString(),
    closedAt: unique[unique.length - 1]?.timestamp ?? null,
    turnCount: unique.length,
    secretsRedacted: secretsCount,
    deduplicatedTurns: dedupedCount,
    isIncomplete: unique.length === 0,
    archiveRef: null,
    correlatedAudioSegment: null,
  };

  let uploadStatus = 'dry-run';
  if (!DRY_RUN) {
    const result = await uploadSession(uuid, unique, meta);
    uploadStatus = result.status;
    if (result.archiveRef) meta.archiveRef = result.archiveRef;
    if (result.error) meta.uploadError = result.error;
  }

  writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  const statusIcon = uploadStatus === 'uploaded' ? '✓' : uploadStatus === 'dry-run' ? '○' : '✗';
  rows.push([
    uuid.slice(0, 8),
    branch ?? '—',
    meta.openedAt.slice(0, 10),
    String(unique.length),
    String(secretsCount),
    `${statusIcon} ${uploadStatus}`,
  ]);
}

if (rows.length === 0) {
  console.log('Все сессии уже архивированы.');
  process.exit(0);
}

const headers = ['UUID', 'Branch', 'Date', 'Turns', 'Secrets', 'Status'];
const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
const line = widths.map((w) => '-'.repeat(w)).join('-+-');
const fmt = (row) => row.map((v, i) => (v ?? '').padEnd(widths[i]!)).join(' | ');

console.log(fmt(headers));
console.log(line);
for (const row of rows) console.log(fmt(row));
