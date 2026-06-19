/**
 * Фаза D MCP: documentation tier (Mintlify, ChatPRD, Atlan).
 * Не требует API-ключей в репозитории. OAuth — при первом подключении в Cursor.
 *
 * yarn mcp:phase-d           — сгенерировать merged config + отчёт
 * yarn mcp:phase-d:install   — merge в ~/.cursor/mcp.json (сохраняет существующие серверы)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const TIER0 = resolve(root, 'docs/mcp/tier0-workstation.example.json');
const TIER4 = resolve(root, 'docs/mcp/tier4-documentation.fragment.json');
const OUT_DIR = resolve(root, 'docs/discussions');
const REPORT = resolve(OUT_DIR, 'mcp-phase-d-report.md');
const GENERATED = resolve(OUT_DIR, 'mcp-documentation.generated.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function buildDocumentationConfig(repoRoot) {
  const normalized = repoRoot.replace(/\\/g, '/');
  const tier0Raw = readFileSync(TIER0, 'utf8').replaceAll('__MEMBRANA_ROOT__', normalized);
  const tier0 = JSON.parse(tier0Raw);
  const tier4 = readJson(TIER4);
  return {
    mcpServers: {
      ...tier0.mcpServers,
      ...tier4,
    },
  };
}

function cursorMcpPath() {
  return resolve(homedir(), '.cursor', 'mcp.json');
}

function mergeIntoExisting(config, cursorPath) {
  if (!existsSync(cursorPath)) {
    return config;
  }
  try {
    const existing = readJson(cursorPath);
    return {
      mcpServers: {
        ...(existing.mcpServers ?? {}),
        ...config.mcpServers,
      },
    };
  } catch {
    return config;
  }
}

function writeReport({ repoRoot, cursorPath, wrote, serverNames }) {
  mkdirSync(OUT_DIR, { recursive: true });
  const lines = [
    '# MCP Phase D — documentation workstation',
    '',
    `> Сгенерировано: ${new Date().toISOString()} (\`yarn mcp:phase-d\`)`,
  '',
    '## Tier 4 серверы',
    '',
    '| Сервер | Назначение | Auth |',
    '|--------|------------|------|',
    '| mintlify-reference | Синтаксис Mintlify MDX / docs.json | нет |',
    '| mintlify-admin | Правка `apps/docs` через MCP | OAuth |',
    '| chatprd | PRD, search, alignment | OAuth / plan |',
    '| atlan-docs | Справка по Atlan product docs | нет |',
    '| atlan | Корп. glossary, semantic_search | OAuth / API key |',
    '',
    '## Сгенерированные файлы',
    '',
    `- Repo root: \`${repoRoot}\``,
    `- Generated: \`${GENERATED}\``,
    `- Cursor MCP: \`${cursorPath}\``,
    `- Written to Cursor: ${wrote ? 'yes' : 'no (use `yarn mcp:phase-d:install`)'}`,
    '',
    '## Серверы в merge',
    '',
    serverNames.map((name) => `- \`${name}\``).join('\n'),
    '',
    '## Ручная проверка',
    '',
    '1. Перезапустить Cursor.',
    '2. Settings → MCP — tier4 серверы active (OAuth для admin/chatprd/atlan).',
    '3. Composer: «Какие Mintlify components доступны?» (mintlify-reference).',
    '4. ChatPRD: «Найди PRD device board» (после sync `prd/device-board-mvp-docs.md`).',
    '',
    'Документация: [`docs/DOCUMENTATION_WORKFLOW.md`](../DOCUMENTATION_WORKFLOW.md).',
    '',
  ];
  writeFileSync(REPORT, lines.join('\n'), 'utf8');
  return REPORT;
}

function main() {
  const write = process.argv.includes('--write');
  const config = buildDocumentationConfig(root);
  const serverNames = Object.keys(config.mcpServers);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(GENERATED, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log('Generated:', GENERATED);

  const cursorPath = cursorMcpPath();
  let wrote = false;
  if (write) {
    const merged = mergeIntoExisting(config, cursorPath);
    mkdirSync(dirname(cursorPath), { recursive: true });
    writeFileSync(cursorPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
    wrote = true;
    console.log('Written:', cursorPath);
  } else {
    console.log('Dry: use --write to merge into', cursorPath);
  }

  const report = writeReport({ repoRoot: root, cursorPath, wrote, serverNames });
  console.log('Report:', report);
}

main();
