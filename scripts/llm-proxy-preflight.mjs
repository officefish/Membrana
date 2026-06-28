/**
 * Preflight: ключи и smoke для экспериментального LLM-контура.
 * yarn llm-proxy:preflight
 */
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { loadLlmProxyDotEnv } from './_llm-proxy-env.mjs';
import { loadDotEnv } from './_anthropic-env.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadLlmProxyDotEnv(repoRoot);
if (!process.env.PERPLEXITY_API_KEY?.trim()) {
  loadDotEnv(repoRoot);
}

const envPath = resolve(repoRoot, '.env.llm-proxy');
if (!existsSync(envPath)) {
  console.error('✗ .env.llm-proxy не найден');
  process.exit(1);
}

const checks = [
  ['FREEMODEL_DEV_API_KEY', process.env.FREEMODEL_DEV_API_KEY],
  ['OPENROUTER_API_KEY', process.env.OPENROUTER_API_KEY],
  ['PERPLEXITY_API_KEY (MCP)', process.env.PERPLEXITY_API_KEY],
];

for (const [name, val] of checks) {
  console.log(val?.trim() ? `✓ ${name}` : `· ${name} (не задан)`);
}

if (!process.env.OPENROUTER_API_KEY?.trim()) {
  console.error('\nДля fallback нужен OPENROUTER_API_KEY');
  process.exit(1);
}

function runSmoke(args) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, ['scripts/experimental/llm-proxy-smoke.mjs', ...args], {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: false,
    });
    child.on('exit', (code) => resolvePromise(code ?? 1));
  });
}

console.log('\n--- smoke: openrouter / haiku ---');
const code = await runSmoke(['--openrouter', '--haiku-4-5']);
process.exit(code);
