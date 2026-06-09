/**
 * Фаза A MCP: проверка runtime и генерация tier0 config для локальной станции.
 * Не требует API-ключей. Не пишет секреты.
 *
 * yarn mcp:phase-a           — проверки + путь к сгенерированному JSON
 * yarn mcp:phase-a --write   — записать в %USERPROFILE%\.cursor\mcp.json (Windows)
 *                              или ~/.cursor/mcp.json (Unix)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const TIER0 = resolve(root, 'docs/mcp/tier0-workstation.example.json');
const OUT_DIR = resolve(root, 'docs/discussions');
const REPORT = resolve(OUT_DIR, 'mcp-phase-a-report.md');

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', cwd: root, ...opts });
}

function versionOf(cmd, args) {
  const r = run(cmd, args);
  const line = (r.stdout || r.stderr || '').split('\n').find((l) => l.trim());
  return { ok: r.status === 0, line: line?.trim() ?? '', status: r.status };
}

function buildTier0Config(repoRoot) {
  const raw = readFileSync(TIER0, 'utf8');
  const normalized = repoRoot.replace(/\\/g, '/');
  const json = JSON.parse(raw.replaceAll('__MEMBRANA_ROOT__', normalized));
  return JSON.stringify(json, null, 2) + '\n';
}

function cursorMcpPath() {
  return resolve(homedir(), '.cursor', 'mcp.json');
}

function gitnexusSmoke() {
  const list = run('npx', ['-y', 'gitnexus@latest', 'list'], { timeout: 120_000 });
  const analyze = run('npx', ['-y', 'gitnexus@latest', 'analyze'], { timeout: 180_000 });
  return {
    list: { ok: list.status === 0, out: (list.stdout || list.stderr || '').slice(0, 500) },
    analyze: { ok: analyze.status === 0, out: (analyze.stdout || analyze.stderr || '').slice(0, 500) },
  };
}

function writeReport({ node, git, gitnexus, repoRoot, cursorPath, wrote }) {
  mkdirSync(OUT_DIR, { recursive: true });
  const lines = [
    '# MCP Phase A — отчёт workstation',
    '',
    `> Сгенерировано: ${new Date().toISOString()} (\`yarn mcp:phase-a\`)`,
    '',
    '## Runtime',
    '',
    `| Check | Result |`,
    `|-------|--------|`,
    `| Node | ${node.ok ? '✅' : '❌'} \`${node.line}\` |`,
    `| Git | ${git.ok ? '✅' : '❌'} \`${git.line}\` |`,
    `| OS | ${platform()} |`,
    '',
    '## gitnexus smoke',
    '',
    `| Command | Result |`,
    `|---------|--------|`,
    `| gitnexus list | ${gitnexus.list.ok ? '✅' : '⚠ skip/fail'} |`,
    `| gitnexus analyze | ${gitnexus.analyze.ok ? '✅' : '⚠ skip/fail'} |`,
    '',
    gitnexus.list.ok ? '' : '**Fallback:** `rg`, IDE search — см. [`MCP_USAGE.md`](../MCP_USAGE.md).',
    '',
    '## Локальный config',
    '',
    `- Repo root: \`${repoRoot}\``,
    `- Cursor MCP path: \`${cursorPath}\``,
    `- Written: ${wrote ? 'yes' : 'no (use --write)'}`,
    '',
    '## Следующий шаг',
    '',
    'Cursor → Settings → MCP → gitnexus / git / filesystem должны быть **active**.',
    'Issue #51: комментарий со скрином или ссылкой на этот файл.',
    '',
  ];
  writeFileSync(REPORT, lines.join('\n'), 'utf8');
  return REPORT;
}

function main() {
  const write = process.argv.includes('--write');
  const node = versionOf('node', ['--version']);
  const git = versionOf('git', ['--version']);

  console.log('Node:', node.line || '(fail)');
  console.log('Git:', git.line || '(fail)');

  if (!node.ok) {
    console.error('Node ≥18 required. Fallback: IDE only.');
    process.exit(1);
  }

  const config = buildTier0Config(root);
  const generated = resolve(OUT_DIR, 'mcp-tier0.generated.json');
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(generated, config, 'utf8');
  console.log('Generated:', generated);

  let wrote = false;
  const cursorPath = cursorMcpPath();
  if (write) {
    mkdirSync(dirname(cursorPath), { recursive: true });
    writeFileSync(cursorPath, config, 'utf8');
    wrote = true;
    console.log('Written:', cursorPath);
  } else {
    console.log('Dry: use --write to install to', cursorPath);
  }

  console.log('gitnexus list…');
  const gitnexus = gitnexusSmoke();
  console.log('gitnexus list:', gitnexus.list.ok ? 'OK' : 'skip/fail');
  console.log('gitnexus analyze:', gitnexus.analyze.ok ? 'OK' : 'skip/fail');

  const report = writeReport({ node, git, gitnexus, repoRoot: root, cursorPath, wrote });
  console.log('Report:', report);
}

main();
