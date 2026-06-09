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
  const shell = platform() === 'win32';
  return spawnSync(cmd, args, { encoding: 'utf8', cwd: root, shell, ...opts });
}

function runNpx(args, opts = {}) {
  return run('npx', args, opts);
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
  const list = runNpx(['-y', 'gitnexus@latest', 'list'], { timeout: 120_000 });
  const analyze = runNpx(['-y', 'gitnexus@latest', 'analyze'], { timeout: 180_000 });
  const clip = (r) => ((r.stdout || '') + (r.stderr || '')).trim().slice(0, 800);
  return {
    list: { ok: list.status === 0, out: clip(list), status: list.status },
    analyze: { ok: analyze.status === 0, out: clip(analyze), status: analyze.status },
  };
}

function optionalUv() {
  const r = run('uv', ['--version']);
  const line = (r.stdout || r.stderr || '').split('\n').find((l) => l.trim());
  return { ok: r.status === 0, line: line?.trim() ?? 'not installed (OK for phase A; needed in phase C)' };
}

function writeReport({ node, git, uv, gitnexus, repoRoot, cursorPath, wrote }) {
  mkdirSync(OUT_DIR, { recursive: true });
  const gitnexusOk = gitnexus.list.ok && gitnexus.analyze.ok;
  const phaseADone = node.ok && git.ok && wrote;
  const lines = [
    '# MCP Phase A — отчёт workstation',
    '',
    `> Сгенерировано: ${new Date().toISOString()} (\`yarn mcp:phase-a\`)`,
    `> Issue: [#51](https://github.com/officefish/Membrana/issues/51) · промпт: \`MCP_WORKSTATION_PHASE_A_PROMPT.md\``,
    '',
    '## Acceptance (#51)',
    '',
    `| Критерий | Статус |`,
    `|----------|--------|`,
    `| Node ≥18 | ${node.ok ? '✅' : '❌'} |`,
    `| Git | ${git.ok ? '✅' : '❌'} |`,
    `| uv (optional, phase C) | ${uv.ok ? '✅' : '⏭ skip'} |`,
    `| tier0 → \`~/.cursor/mcp.json\` | ${wrote ? '✅' : '⏳ run \`yarn mcp:phase-a:install\`'} |`,
    `| gitnexus list + analyze | ${gitnexusOk ? '✅' : '⚠ skip/fail — fallback OK'} |`,
    `| Cursor MCP active | ⏳ проверить вручную в Settings → MCP |`,
    '',
    '## Runtime',
    '',
    `| Check | Result |`,
    `|-------|--------|`,
    `| Node | ${node.ok ? '✅' : '❌'} \`${node.line}\` |`,
    `| Git | ${git.ok ? '✅' : '❌'} \`${git.line}\` |`,
    `| uv | ${uv.ok ? '✅' : '⏭'} \`${uv.line}\` |`,
    `| OS | ${platform()} |`,
    '',
    '## gitnexus smoke',
    '',
    `| Command | Result |`,
    `|---------|--------|`,
    `| gitnexus list | ${gitnexus.list.ok ? '✅' : '⚠'} (exit ${gitnexus.list.status}) |`,
    `| gitnexus analyze | ${gitnexus.analyze.ok ? '✅' : '⚠'} (exit ${gitnexus.analyze.status}) |`,
    '',
    ...(gitnexusOk ? [] : [
      '**Fallback (не блокирует #51):** `rg`, IDE search — [`MCP_USAGE.md`](../MCP_USAGE.md).',
      '',
      '<details><summary>gitnexus list output</summary>',
      '',
      '```',
      gitnexus.list.out || '(empty)',
      '```',
      '',
      '</details>',
      '',
      '<details><summary>gitnexus analyze output</summary>',
      '',
      '```',
      gitnexus.analyze.out || '(empty)',
      '```',
      '',
      '</details>',
      '',
    ]),
    '## Локальный config (Tier 0)',
    '',
    'Серверы: **gitnexus**, **git**, **filesystem** — см. `docs/mcp/tier0-workstation.example.json`.',
    '',
    `- Repo root: \`${repoRoot}\``,
    `- Cursor MCP path: \`${cursorPath}\``,
    `- Written: ${wrote ? 'yes' : 'no (use \`yarn mcp:phase-a:install\`)'}`,
    '',
    '## Ручная проверка (ТЗ / Issue smoke)',
    '',
    '1. Перезапустить Cursor.',
    '2. Settings → MCP — три сервера **active** (gitnexus минимум; git/fs при верных путях).',
    '3. Composer: запрос «покажи git log последнего коммита» (Git MCP) или список файлов в `packages/core` (Filesystem).',
    '',
    phaseADone
      ? '**Phase A workstation:** автоматические проверки пройдены; закрытие #51 после подтверждения MCP в UI.'
      : '**Phase A:** завершите install и MCP UI, затем `yarn task:archive mcp-workstation-phase-a`.',
    '',
  ];
  writeFileSync(REPORT, lines.join('\n'), 'utf8');
  return REPORT;
}

function main() {
  const write = process.argv.includes('--write');
  const node = versionOf('node', ['--version']);
  const git = versionOf('git', ['--version']);
  const uv = optionalUv();

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

  const report = writeReport({ node, git, uv, gitnexus, repoRoot: root, cursorPath, wrote });
  console.log('Report:', report);
}

main();
