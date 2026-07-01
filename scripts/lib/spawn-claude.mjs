/**
 * Shared launcher for Claude Code CLI across all proxy scripts.
 *
 * On Linux/Mac: resolves the `claude` binary via `which` and uses shell:false,
 * eliminating shell-metacharacter injection from user-supplied CLI args.
 * On Windows: .cmd files cannot run without a shell; shell:true is an accepted
 * limitation — args originate from developer CLI, not untrusted sources.
 */
import { spawn, execFileSync } from 'node:child_process';

function resolveClaudeCmd() {
  if (process.platform === 'win32') {
    return { bin: 'claude', shell: true };
  }
  try {
    const bin = execFileSync('which', ['claude'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (bin) return { bin, shell: false };
  } catch { /* claude not on PATH — fall through */ }
  return { bin: 'claude', shell: false };
}

/**
 * @param {string[]} args  - CLI args forwarded to claude
 * @param {NodeJS.ProcessEnv} env - environment for the child process
 * @returns {import('node:child_process').ChildProcess}
 */
export function spawnClaude(args, env) {
  const { bin, shell } = resolveClaudeCmd();
  const child = spawn(bin, args, { env, stdio: 'inherit', shell });

  child.on('error', (err) => {
    console.error('Не удалось запустить claude:', err.message);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });

  return child;
}
