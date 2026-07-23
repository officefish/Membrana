#!/usr/bin/env node
/**
 * yarn llm-calls:audit | yarn llm-calls:decompose
 * Дом: docs/audit/llm-calls (GROUP_CONTAINERIZATION + HOME_WORKSHOP).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const house = join(repoRoot, 'docs', 'audit', 'llm-calls');
const registryPath = join(house, 'registry', 'LLM_CALLS_LIST.md');

const FORBIDDEN = ['prompt', 'apiKey', 'rawResponse', 'messages', 'content'];

function parseArgs(argv) {
  const mode = argv.includes('decompose') || argv.includes('--decompose') ? 'decompose' : 'audit';
  let report = false;
  let dim = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--report') report = true;
    if (a === '--by' || a.startsWith('--by=')) {
      dim = a.includes('=') ? a.split('=')[1] : argv[++i];
    }
    if (a === '--help' || a === '-h') {
      console.log(`Usage:
  yarn llm-calls:audit [--report]
  yarn llm-calls:decompose --by procedure|provider|ok|day [--report]
HARD GATE decompose: --by обязателен в текущем вызове.`);
      process.exitCode = 0;
      return null;
    }
  }
  return { mode, report, dim };
}

function scanForbidden(text) {
  const hits = [];
  for (const k of FORBIDDEN) {
    const re = new RegExp(`(^|\\W)${k}(\\W|$)`, 'm');
    if (re.test(text) && /```[\s\S]*?```/.test(text) === false) {
      // soft: flag markdown table headers that look like raw field dumps
    }
    if (text.includes(`"${k}"`) || text.includes(`\`${k}\``) && text.includes('SECRET')) {
      hits.push(k);
    }
  }
  // Explicit forbidden: fenced JSON with prompt key
  if (/"prompt"\s*:/.test(text) || /"rawResponse"\s*:/.test(text)) {
    hits.push('raw-body-json');
  }
  return [...new Set(hits)];
}

function metaFromRegistry(md) {
  const date = md.match(/\|\s*Date\s*\|\s*([^|]+)\|/)?.[1]?.trim() ?? '—';
  const source = md.match(/\|\s*Source\s*\|\s*([^|]+)\|/)?.[1]?.trim() ?? '—';
  const granules = md.match(/\|\s*Granules\s*\|\s*([^|]+)\|/)?.[1]?.trim() ?? '—';
  return { date, source, granules };
}

const args = parseArgs(process.argv.slice(2));
if (!args) {
  /* help */
} else if (!existsSync(registryPath)) {
  console.error('✖ нет registry/LLM_CALLS_LIST.md');
  process.exitCode = 2;
} else if (args.mode === 'decompose' && !args.dim) {
  console.error(
    '✖ HARD GATE: yarn llm-calls:decompose требует --by procedure|provider|ok|day в текущем вызове',
  );
  process.exitCode = 2;
} else {
  const md = readFileSync(registryPath, 'utf8');
  const forbidden = scanForbidden(md);
  const meta = metaFromRegistry(md);
  const lines = [
    `# llm-calls:${args.mode}`,
    '',
    `Meta date=${meta.date} source=${meta.source} granules=${meta.granules}`,
    forbidden.length
      ? `✖ forbidden field traces: ${forbidden.join(', ')}`
      : '✅ no raw-body JSON keys in registry',
  ];
  if (args.mode === 'decompose') {
    lines.push('', `Decompose dimension: ${args.dim}`, '(полный парсинг гранул — после W3 snapshot)');
  }
  const body = `${lines.join('\n')}\n`;
  process.stdout.write(body);
  if (args.report) {
    const outDir = join(house, 'analysis');
    mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10);
    const out = join(outDir, `${stamp}-${args.mode}.md`);
    writeFileSync(out, body, 'utf8');
    console.error(`wrote ${out}`);
  }
  process.exitCode = forbidden.length ? 1 : 0;
}
