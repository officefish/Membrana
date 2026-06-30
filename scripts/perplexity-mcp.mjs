import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = resolve(root, '.env');

const parseEnvValue = (source, key) => {
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator < 0 || line.slice(0, separator).trim() !== key) continue;

    const value = line.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      return value.slice(1, -1);
    }
    return value;
  }
  return undefined;
};

const apiKey =
  process.env.PERPLEXITY_API_KEY?.trim() ||
  parseEnvValue(readFileSync(envFile, 'utf8'), 'PERPLEXITY_API_KEY')?.trim();

if (!apiKey) {
  console.error(`PERPLEXITY_API_KEY is missing in the environment and ${envFile}`);
  process.exit(1);
}

if (process.argv.includes('--check')) {
  console.log('PERPLEXITY_API_KEY is available.');
  process.exit(0);
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(command, ['-y', '@perplexity-ai/mcp-server'], {
  cwd: root,
  env: { ...process.env, PERPLEXITY_API_KEY: apiKey },
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`Failed to start Perplexity MCP: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
