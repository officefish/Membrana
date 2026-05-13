/**
 * Локальный отчёт по git + тестам (без вызова внешних API).
 * Запись в системный temp; путь печатается в stdout.
 */
import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function run(cmd, args, opts = {}) {
  try {
    return execFileSync(cmd, args, {
      encoding: 'utf8',
      maxBuffer: 12 * 1024 * 1024,
      cwd: process.cwd(),
      ...opts,
    });
  } catch (e) {
    const err = e.stderr?.toString?.() ?? '';
    const out = e.stdout?.toString?.() ?? '';
    return err || out || e.message || '(ошибка команды)';
  }
}

function runYarnTest() {
  try {
    return execSync('yarn test -- --passWithNoTests --silent', {
      encoding: 'utf8',
      cwd: process.cwd(),
      maxBuffer: 12 * 1024 * 1024,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trimEnd();
  } catch (e) {
    const err = e.stderr?.toString?.() ?? '';
    const out = e.stdout?.toString?.() ?? '';
    return err || out || e.message || '(ошибка yarn test)';
  }
}

function main() {
  const report = {
    timestamp: new Date().toISOString(),
    git: {
      log: run('git', ['log', '--since=midnight', '--pretty=format:%h|%s|%an']).trimEnd(),
      diff: run('git', ['diff', '--name-status']).trimEnd(),
      branches: run('git', ['branch', '-vv']).trimEnd(),
    },
    tests: {
      status: runYarnTest(),
    },
  };

  const outDir = join(tmpdir(), 'membrana-code-review');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, 'code-review-context.json');
  writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
  console.log('Report saved to', outFile);
}

const isHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (isHelp) {
  console.log(`Usage: node scripts/generate_report.mjs [--help]

Пишет JSON в %TEMP%/membrana-code-review/code-review-context.json (Windows)
или \$TMPDIR/membrana-code-review/ на Unix. Без секретов и без обхода node_modules.`);
  process.exit(0);
}

main();
