/**
 * Фаза B MCP: Perplexity (Tier 1) + Playwright (Tier 2) в локальный ~/.cursor/mcp.json.
 * Ключ Perplexity — из `.env` или process.env; не пишется в git и не логируется.
 *
 * yarn mcp:phase-b              — проверки + отчёт + generated JSON (dry)
 * yarn mcp:phase-b:install      — merge tier1+tier2 в существующий Cursor MCP config
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadDotEnv } from './_anthropic-env.mjs';
import { buildTier0Servers } from './mcp-tier0.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const TIER1 = resolve(root, 'docs/mcp/tier1-perplexity.fragment.json');
const TIER2 = resolve(root, 'docs/mcp/tier2-playwright.fragment.json');
const OUT_DIR = resolve(root, 'docs/discussions');
const REPORT = resolve(OUT_DIR, 'mcp-phase-b-report.md');
const GENERATED = resolve(OUT_DIR, 'mcp-tier1-tier2.generated.json');

function quoteShellArg(part) {
  return /[\s"&|<>^]/.test(part) ? `"${part.replace(/"/g, '\\"')}"` : part;
}

/** Windows: одна строка + shell (без DEP0190). Unix: cmd + args, shell: false. */
function run(cmd, args, opts = {}) {
  if (platform() === 'win32') {
    const line = [cmd, ...args].map(quoteShellArg).join(' ');
    return spawnSync(line, { encoding: 'utf8', cwd: root, shell: true, ...opts });
  }
  return spawnSync(cmd, args, { encoding: 'utf8', cwd: root, shell: false, ...opts });
}

function cursorMcpPath() {
  return resolve(homedir(), '.cursor', 'mcp.json');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function perplexityKey() {
  const key = process.env.PERPLEXITY_API_KEY?.trim() ?? '';
  if (!key || key.includes('REPLACE') || key.includes('ЗАМЕНИТЬ')) return null;
  if (!key.startsWith('pplx-')) return null;
  return key;
}

function perplexityServerEntry(key) {
  const fragment = readJson(TIER1).perplexity;
  if (platform() === 'win32') {
    return {
      command: 'cmd',
      args: ['/c', 'npx', '-y', '@perplexity-ai/mcp-server'],
      env: { PERPLEXITY_API_KEY: key },
    };
  }
  return {
    ...fragment,
    env: { PERPLEXITY_API_KEY: key },
  };
}

function playwrightServerEntry() {
  const fragment = readJson(TIER2).playwright;
  if (platform() === 'win32') {
    return {
      command: 'cmd',
      args: ['/c', 'npx', '-y', '@playwright/mcp@latest'],
    };
  }
  return fragment;
}

function mergePhaseBConfig({ repoRoot }) {
  const servers = { ...buildTier0Servers(repoRoot) };
  const key = perplexityKey();
  const perplexityIncluded = Boolean(key);
  const playwrightIncluded = true;

  if (key) {
    servers.perplexity = perplexityServerEntry(key);
  } else {
    delete servers.perplexity;
  }
  servers.playwright = playwrightServerEntry();

  return {
    config: { mcpServers: servers },
    perplexityIncluded,
    playwrightIncluded,
    keyPresent: perplexityIncluded,
  };
}

function packageResolvable(pkg) {
  const r = run('npm', ['view', pkg, 'version'], { timeout: 60_000 });
  const version = (r.stdout || '').trim().split('\n')[0]?.trim();
  return { ok: r.status === 0 && Boolean(version), version: version ?? '' };
}

function npxSmoke(args, label) {
  const r = run('npx', args, { timeout: 120_000 });
  const clip = ((r.stdout || '') + (r.stderr || '')).trim().slice(0, 400);
  return { ok: r.status === 0, out: clip, status: r.status, label };
}

function writeReport({
  repoRoot,
  cursorPath,
  wrote,
  perplexityIncluded,
  keyPresent,
  perplexityPkg,
  playwrightPkg,
  perplexitySmoke,
  playwrightSmoke,
}) {
  mkdirSync(OUT_DIR, { recursive: true });
  const phaseBDone = wrote && (perplexityIncluded || !keyPresent);
  const lines = [
    '# MCP Phase B — отчёт workstation',
    '',
    `> Сгенерировано: ${new Date().toISOString()} (\`yarn mcp:phase-b\`)`,
    `> Issue: [#52](https://github.com/officefish/Membrana/issues/52) · промпт: \`MCP_WORKSTATION_PHASE_B_PROMPT.md\``,
    '',
    '## Acceptance (#52)',
    '',
    '| Критерий | Статус |',
    '|----------|--------|',
    `| PERPLEXITY_API_KEY в .env | ${keyPresent ? '✅' : '⏭ skip — добавь в .env'} |`,
    `| perplexity в MCP config | ${perplexityIncluded ? '✅' : '⏭ skip (нет ключа)'} |`,
    `| playwright в MCP config | ✅ |`,
    `| tier1+tier2 → \`~/.cursor/mcp.json\` | ${wrote ? '✅' : '⏳ run \`yarn mcp:phase-b:install\`'} |`,
    `| npm: @perplexity-ai/mcp-server | ${perplexityPkg.ok ? '✅' : '⚠'} |`,
    `| npm: @playwright/mcp | ${playwrightPkg.ok ? '✅' : '⚠'} |`,
    '| Cursor MCP UI smoke | ⏳ перезапустить Cursor → Settings → MCP |',
    '',
    '## Ключ Perplexity',
    '',
    keyPresent
      ? 'Ключ найден (формат `pplx-…`). Значение **не** записывается в отчёт.'
      : 'Ключ не найден. Добавь `PERPLEXITY_API_KEY=pplx-…` в корневой `.env` (см. `.env.example`). Fallback: [`MCP_USAGE.md`](../MCP_USAGE.md) § Tier 1.',
    '',
    '## npm resolve',
    '',
    `| Package | Version |`,
    `|---------|---------|`,
    `| @perplexity-ai/mcp-server | ${perplexityPkg.ok ? perplexityPkg.version : '⚠ fail'} |`,
    `| @playwright/mcp | ${playwrightPkg.ok ? playwrightPkg.version : '⚠ fail'} |`,
    '',
    '## Локальный config',
    '',
    `- Repo root: \`${repoRoot}\``,
    `- Cursor MCP path: \`${cursorPath}\``,
    `- Written: ${wrote ? 'yes' : 'no'}`,
    `- Generated preview: \`docs/discussions/mcp-tier1-tier2.generated.json\` (без реального ключа в dry-run)`,
    '',
    '## Ручная проверка (ТЗ §6)',
    '',
    '1. Перезапустить Cursor.',
    '2. Settings → MCP — **perplexity** и **playwright** active (или documented skip для perplexity).',
    '3. Composer smoke Perplexity: «MCP news last 7 days» (3 источника).',
    '4. Composer smoke Playwright: example.com title + screenshot.',
    '',
    ...(perplexityIncluded
      ? []
      : [
          '**Perplexity skip:** research вручную или `yarn analyzers:research:week` (Anthropic).',
          '',
        ]),
    phaseBDone
      ? '**Phase B workstation:** config записан; закрытие #52 после UI smoke.'
      : '**Phase B:** добавь ключ → `yarn mcp:phase-b:install` → UI smoke → `yarn task:archive mcp-workstation-phase-b`.',
    '',
  ];
  writeFileSync(REPORT, lines.join('\n'), 'utf8');
  return REPORT;
}

function main() {
  loadDotEnv(root);
  const write = process.argv.includes('--write');
  const cursorPath = cursorMcpPath();
  const { config, perplexityIncluded, keyPresent } = mergePhaseBConfig({ repoRoot: root });

  const preview = JSON.parse(JSON.stringify(config));
  if (preview.mcpServers?.perplexity?.env?.PERPLEXITY_API_KEY) {
    preview.mcpServers.perplexity.env.PERPLEXITY_API_KEY = 'pplx-REDACTED';
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(GENERATED, JSON.stringify(preview, null, 2) + '\n', 'utf8');
  console.log('Generated preview:', GENERATED);

  if (!keyPresent) {
    console.warn(
      'PERPLEXITY_API_KEY not set — playwright only. Add pplx-… to .env, then re-run install.',
    );
  }

  let wrote = false;
  if (write) {
    mkdirSync(dirname(cursorPath), { recursive: true });
    writeFileSync(cursorPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    wrote = true;
    console.log('Written:', cursorPath);
    console.log(
      'Servers:',
      Object.keys(config.mcpServers).join(', '),
    );
  } else {
    console.log('Dry: use --write to install to', cursorPath);
  }

  console.log('Resolving npm packages…');
  const perplexityPkg = packageResolvable('@perplexity-ai/mcp-server');
  const playwrightPkg = packageResolvable('@playwright/mcp');
  console.log('perplexity pkg:', perplexityPkg.ok ? perplexityPkg.version : 'fail');
  console.log('playwright pkg:', playwrightPkg.ok ? playwrightPkg.version : 'fail');

  const report = writeReport({
    repoRoot: root,
    cursorPath,
    wrote,
    perplexityIncluded,
    keyPresent,
    perplexityPkg,
    playwrightPkg,
    perplexitySmoke: null,
    playwrightSmoke: null,
  });
  console.log('Report:', report);

  if (write && !keyPresent) {
    console.log('Install OK (playwright); perplexity skipped until key in .env.');
    process.exit(0);
  }
}

main();
