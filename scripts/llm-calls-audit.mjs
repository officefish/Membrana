#!/usr/bin/env node
/**
 * yarn llm-calls:audit | yarn llm-calls:decompose
 * Дом: docs/audit/llm-calls (GROUP_CONTAINERIZATION + HOME_WORKSHOP).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProcedureRegistry } from './lib/llm-procedure-registry.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const house = join(repoRoot, 'docs', 'audit', 'llm-calls');
const registryPath = join(house, 'registry', 'LLM_CALLS_LIST.md');

const FORBIDDEN = ['prompt', 'apiKey', 'rawResponse', 'messages', 'content'];
const DIRECT_PROVIDER_CALL_RE = /\b(anthropicPost|llmProxyPost)\b/gu;
const DIRECT_CALL_ALLOWLIST = new Set([
  'scripts/lib/llm-procedure-ritual.mjs',
  'scripts/_anthropic-env.mjs',
  'scripts/_llm-proxy-env.mjs',
]);

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

function lineAt(text, index) {
  return text.slice(0, index).split(/\r?\n/u).length;
}

/**
 * @param {string} relPath
 * @param {string} text
 * @returns {Array<{ file: string; line: number; symbol: string }>}
 */
export function scanDirectProviderCallsInText(relPath, text) {
  const normalized = relPath.replaceAll('\\', '/');
  if (DIRECT_CALL_ALLOWLIST.has(normalized)) return [];
  const hits = [];
  for (const match of text.matchAll(DIRECT_PROVIDER_CALL_RE)) {
    if (typeof match.index !== 'number') continue;
    hits.push({ file: normalized, line: lineAt(text, match.index), symbol: match[1] });
  }
  return hits;
}

/**
 * @param {{
 *   registry?: { procedures?: Array<{ entryMjs?: string }> };
 *   readFile?: (absPath: string) => string;
 *   exists?: (absPath: string) => boolean;
 *   root?: string;
 * }} [opts]
 */
export function scanProcedureEntryProviderCalls(opts = {}) {
  const root = opts.root ?? repoRoot;
  const reg = opts.registry ?? loadProcedureRegistry();
  const read = opts.readFile ?? ((absPath) => readFileSync(absPath, 'utf8'));
  const exists = opts.exists ?? existsSync;
  const hits = [];
  const seen = new Set();
  for (const p of reg.procedures ?? []) {
    const rel = typeof p.entryMjs === 'string' ? p.entryMjs.replaceAll('\\', '/') : '';
    if (!rel || seen.has(rel) || DIRECT_CALL_ALLOWLIST.has(rel)) continue;
    seen.add(rel);
    const abs = resolve(root, rel);
    if (!exists(abs)) continue;
    hits.push(...scanDirectProviderCallsInText(rel, read(abs)));
  }
  return hits;
}

function metaFromRegistry(md) {
  const date = md.match(/\|\s*Date\s*\|\s*([^|]+)\|/)?.[1]?.trim() ?? '—';
  const source = md.match(/\|\s*Source\s*\|\s*([^|]+)\|/)?.[1]?.trim() ?? '—';
  const granules = md.match(/\|\s*Granules\s*\|\s*([^|]+)\|/)?.[1]?.trim() ?? '—';
  return { date, source, granules };
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args) return 0;
  if (!existsSync(registryPath)) {
    console.error('✖ нет registry/LLM_CALLS_LIST.md');
    return 2;
  }
  if (args.mode === 'decompose' && !args.dim) {
    console.error(
      '✖ HARD GATE: yarn llm-calls:decompose требует --by procedure|provider|ok|day в текущем вызове',
    );
    return 2;
  }

  const md = readFileSync(registryPath, 'utf8');
  const forbidden = scanForbidden(md);
  const directProviderCalls = scanProcedureEntryProviderCalls();
  const meta = metaFromRegistry(md);
  const lines = [
    `# llm-calls:${args.mode}`,
    '',
    `Meta date=${meta.date} source=${meta.source} granules=${meta.granules}`,
    forbidden.length
      ? `✖ forbidden field traces: ${forbidden.join(', ')}`
      : '✅ no raw-body JSON keys in registry',
    directProviderCalls.length
      ? `✖ direct provider calls outside invokeProcedureLlm: ${directProviderCalls.map((h) => `${h.file}:${h.line} ${h.symbol}`).join('; ')}`
      : '✅ no direct provider calls in procedure entry scripts',
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
  return forbidden.length || directProviderCalls.length ? 1 : 0;
}

if (process.argv[1]?.endsWith('llm-calls-audit.mjs')) {
  process.exitCode = main();
}
