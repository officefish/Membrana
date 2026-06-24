/**
 * Фаза C MCP: Glyph (Tier 3) — outline символов через benmyles/glyph (Go).
 * Устанавливает бинарник через `go install`, merge в ~/.cursor/mcp.json.
 *
 * yarn mcp:phase-c              — install glyph + dry-run config
 * yarn mcp:phase-c:install      — записать glyph в Cursor MCP config
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const TIER3 = resolve(root, 'docs/mcp/tier3-glyph.fragment.json');
const GLYPH_MODULE = 'github.com/benmyles/glyph@latest';
const OUT_DIR = resolve(root, 'docs/discussions');
const REPORT = resolve(OUT_DIR, 'mcp-phase-c-report.md');
const GENERATED = resolve(OUT_DIR, 'mcp-tier3-glyph.generated.json');

function quoteShellArg(part) {
  return /[\s"&|<>^]/.test(part) ? `"${part.replace(/"/g, '\\"')}"` : part;
}

function run(cmd, args, opts = {}) {
  const cwd = opts.cwd ?? root;
  if (platform() === 'win32') {
    const line = [cmd, ...args].map(quoteShellArg).join(' ');
    return spawnSync(line, { encoding: 'utf8', cwd, shell: true, ...opts });
  }
  return spawnSync(cmd, args, { encoding: 'utf8', cwd, shell: false, ...opts });
}

function cursorMcpPath() {
  return resolve(homedir(), '.cursor', 'mcp.json');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function resolveGoCommand() {
  if (platform() !== 'win32') return 'go';
  const candidates = [
    'C:/Program Files/Go/bin/go.exe',
    join(process.env.LOCALAPPDATA ?? '', 'Programs/Go/bin/go.exe'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c.replace(/\\/g, '/');
  }
  const r = run('where', ['go']);
  if (r.status === 0) {
    const line = (r.stdout || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => /go(\.exe)?$/i.test(l));
    if (line) return line.replace(/\\/g, '/');
  }
  return 'go';
}

function defaultGlyphBinPaths() {
  const home = homedir();
  if (platform() === 'win32') {
    return [
      join(home, 'go', 'bin', 'glyph.exe'),
      'C:/Program Files/Go/bin/glyph.exe',
    ];
  }
  return [join(home, 'go', 'bin', 'glyph'), '/usr/local/bin/glyph'];
}

function resolveGlyphBin() {
  for (const p of defaultGlyphBinPaths()) {
    if (existsSync(p)) return p.replace(/\\/g, '/');
  }
  if (platform() === 'win32') {
    const r = run('where', ['glyph']);
    if (r.status === 0) {
      const line = (r.stdout || '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => /glyph(\.exe)?$/i.test(l));
      if (line) return line.replace(/\\/g, '/');
    }
  }
  return null;
}

function resolveGccOnPath() {
  if (platform() !== 'win32') return process.env.CC ?? 'gcc';
  const wingetGcc = join(
    homedir(),
    'AppData/Local/Microsoft/WinGet/Packages/BrechtSanders.WinLibs.POSIX.MSVCRT_Microsoft.Winget.Source_8wekyb3d8bbwe/mingw64/bin/gcc.exe',
  );
  const candidates = [
    wingetGcc,
    'C:/Program Files/WinLibs/mingw64/bin/gcc.exe',
    'C:/winlibs/mingw64/bin/gcc.exe',
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c.replace(/\\/g, '/');
  }
  const r = run('where', ['gcc']);
  if (r.status === 0) {
    const line = (r.stdout || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => /gcc(\.exe)?$/i.test(l));
    if (line) return line.replace(/\\/g, '/');
  }
  return null;
}

function installGlyph() {
  const go = resolveGoCommand();
  const gopath = process.env.GOPATH ?? join(homedir(), 'go');
  const gomodcache = process.env.GOMODCACHE ?? join(gopath, 'pkg', 'mod');
  const gcc = resolveGccOnPath();
  const env = {
    ...process.env,
    GOPATH: gopath,
    GOMODCACHE: gomodcache,
    CGO_ENABLED: '1',
  };
  if (gcc) {
    env.CC = gcc;
    const binDir = dirname(gcc);
    env.PATH = `${binDir};${process.env.PATH ?? ''}`;
  }
  const r = run(go, ['install', GLYPH_MODULE], {
    timeout: 300_000,
    env,
  });
  const out = ((r.stdout || '') + (r.stderr || '')).trim().slice(0, 600);
  const bin = resolveGlyphBin();
  return { ok: Boolean(bin), out, status: r.status, go, bin };
}

function glyphVersionSmoke(bin) {
  const r = run(bin, ['--help'], { timeout: 30_000 });
  const out = ((r.stdout || '') + (r.stderr || '')).trim().slice(0, 400);
  return { ok: r.status === 0 || /glyph|mcp|cli/i.test(out), out, status: r.status };
}

function glyphServerEntry(bin) {
  return {
    command: bin,
    args: ['mcp'],
  };
}

function loadCursorConfig(cursorPath) {
  if (!existsSync(cursorPath)) return null;
  return JSON.parse(readFileSync(cursorPath, 'utf8'));
}

function mergeGlyphConfig(cursorPath, bin) {
  const existing = loadCursorConfig(cursorPath);
  if (!existing?.mcpServers) {
    throw new Error(`Нет ${cursorPath}. Сначала: yarn mcp:phase-b:install`);
  }
  return { mcpServers: { ...existing.mcpServers, glyph: glyphServerEntry(bin) } };
}

function writeReport({ cursorPath, wrote, install, help, bin }) {
  mkdirSync(OUT_DIR, { recursive: true });
  const glyphReady = Boolean(bin) && help.ok;
  const lines = [
    '# MCP Phase C — отчёт workstation (Glyph)',
    '',
    `> Сгенерировано: ${new Date().toISOString()} (\`yarn mcp:phase-c\`)`,
    `> Issue: [#53](https://github.com/officefish/Membrana/issues/53)`,
    '',
    '## Acceptance (#53)',
    '',
    '| Критерий | Статус |',
    '|----------|--------|',
    `| Go (\`go install\`) | ${install.ok ? '✅' : '❌'} |`,
    `| glyph binary | ${bin ? '✅' : '❌'} |`,
    `| \`glyph --help\` | ${help.ok ? '✅' : '❌'} |`,
    `| glyph → MCP config | ${wrote ? '✅' : '⏳ \`yarn mcp:phase-c:install\`'} |`,
    '',
    '## Пути',
    '',
    `- Glyph binary: \`${bin ?? '(not found)'}\``,
    `- Cursor MCP: \`${cursorPath}\``,
    `- Go: \`${install.go}\``,
    '',
    '## Smoke в Composer',
    '',
    '«Через Glyph покажи outline символов в `packages/services/detectors`»',
    '',
    glyphReady
      ? '**Phase C:** готово → перезапуск Cursor → `yarn task:archive mcp-workstation-phase-c`'
      : '**Fallback:** gitnexus + `rg` — MCP_USAGE § Tier 3',
    '',
  ];
  writeFileSync(REPORT, lines.join('\n'), 'utf8');
  return REPORT;
}

function main() {
  const write = process.argv.includes('--write');
  const cursorPath = cursorMcpPath();

  let bin = resolveGlyphBin();
  let install = { ok: Boolean(bin), go: resolveGoCommand(), bin, out: '', status: 0 };

  if (!bin) {
    console.log('Installing glyph via go install…');
    install = installGlyph();
    bin = install.bin;
    console.log('go install:', install.ok ? 'OK' : 'FAIL');
    if (!install.ok) {
      console.error(install.out || 'go install failed.');
      console.error('Windows: Go + MinGW (gcc) required. winget install GoLang.Go; winget install BrechtSanders.WinLibs.POSIX.MSVCRT');
      process.exit(1);
    }
  } else {
    console.log('glyph binary:', bin);
  }

  const help = glyphVersionSmoke(bin);
  console.log('glyph --help:', help.ok ? 'OK' : 'FAIL');
  if (!help.ok) {
    console.error(help.out || 'glyph smoke failed');
    process.exit(1);
  }

  const config = mergeGlyphConfig(cursorPath, bin);
  writeFileSync(GENERATED, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log('Generated preview:', GENERATED);

  let wrote = false;
  if (write) {
    writeFileSync(cursorPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    wrote = true;
    console.log('Written:', cursorPath);
    console.log('Servers:', Object.keys(config.mcpServers).join(', '));
  } else {
    console.log('Dry: use --write to install to', cursorPath);
  }

  console.log('Report:', writeReport({ cursorPath, wrote, install, help, bin }));
}

main();
