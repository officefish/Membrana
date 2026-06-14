/**
 * Проверка MCP bootstrap без API-ключей и без запуска MCP-процессов.
 * yarn mcp:verify-bootstrap
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const REQUIRED_FILES = [
  'docs/MCP_INTEGRATION_STRATEGY.md',
  'docs/MCP_ROLLOUT_PLAN.md',
  'docs/MCP_USAGE.md',
  'docs/TZ_MCP_Servers_Membrana.md',
  'docs/claude_desktop_config.example.json',
  'docs/mcp/tier0-workstation.example.json',
  'docs/mcp/tier1-perplexity.fragment.json',
  'docs/mcp/tier2-playwright.fragment.json',
  'docs/mcp/tier3-glyph.fragment.json',
  'datasets/.gitkeep',
  '.cursor/mcp.json',
];

const SECRET_PATTERNS = [
  /\bpplx-[a-zA-Z0-9]{10,}\b/,
  /\bsk-ant-[a-zA-Z0-9-]{10,}\b/,
];

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8');
}

function assertJson(rel) {
  JSON.parse(read(rel));
}

function assertNoSecrets(rel) {
  const text = read(rel);
  for (const re of SECRET_PATTERNS) {
    if (re.test(text)) {
      throw new Error(`${rel}: похоже на реальный API-ключ`);
    }
  }
  if (text.includes('pplx-') && !text.includes('REPLACE') && !text.includes('ЗАМЕНИТЬ')) {
    // allow placeholder-only fragments
    const withoutPlaceholders = text.replace(/pplx-REPLACE[^\s"]*/g, '');
    if (/\bpplx-[a-zA-Z0-9]{8,}\b/.test(withoutPlaceholders)) {
      throw new Error(`${rel}: подозрительный Perplexity key`);
    }
  }
}

function assertGitignore() {
  const gi = read('.gitignore');
  if (!gi.includes('.gitnexus/')) {
    throw new Error('.gitignore: нет .gitnexus/');
  }
}

function assertCursorMcpKeyless() {
  const cfg = JSON.parse(read('.cursor/mcp.json'));
  const servers = cfg.mcpServers ?? {};
  for (const [name, entry] of Object.entries(servers)) {
    if (entry.env?.PERPLEXITY_API_KEY || entry.env?.ANTHROPIC_API_KEY) {
      throw new Error(`.cursor/mcp.json: сервер "${name}" не должен содержать секреты`);
    }
  }
}

function main() {
  let ok = true;
  for (const rel of REQUIRED_FILES) {
    if (!existsSync(resolve(root, rel))) {
      console.error('MISSING', rel);
      ok = false;
    }
  }
  if (!ok) process.exit(1);

  assertGitignore();
  assertCursorMcpKeyless();

  for (const rel of REQUIRED_FILES.filter((f) => f.endsWith('.json'))) {
    assertJson(rel);
    assertNoSecrets(rel);
  }

  console.log('MCP bootstrap OK:', REQUIRED_FILES.length, 'files, no secrets in examples');
}

main();
