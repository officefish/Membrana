#!/usr/bin/env node
/**
 * yarn deploy:when-green — дождаться зелёного workflow CI на HEAD ветки и
 * НАПЕЧАТАТЬ команду деплоя (по умолчанию `yarn cabinet:deploy:prod`).
 * БЕЗОПАСНОСТЬ: скрипт НЕ запускает деплой сам (прод — только руками).
 *
 * Usage: yarn deploy:when-green [--workflow CI] [--deploy "yarn cabinet:deploy:prod"]
 */
import { execFileSync } from 'node:child_process';

/** @returns {'pending'|'green'|'red'} */
export function classifyRun(run) {
  if (!run || run.status !== 'completed') return 'pending';
  return run.conclusion === 'success' ? 'green' : 'red';
}

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function latestRun(branch, workflow) {
  const out = execFileSync(
    'gh',
    ['run', 'list', '--branch', branch, '--workflow', workflow, '--limit', '1', '--json', 'databaseId,status,conclusion,headSha'],
    { encoding: 'utf8' },
  );
  const arr = JSON.parse(out);
  return arr[0] ?? null;
}

async function main() {
  const workflow = arg('--workflow', 'CI');
  const deployCmd = arg('--deploy', 'yarn cabinet:deploy:prod');
  const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim().slice(0, 8);
  console.log(`deploy:when-green: жду workflow "${workflow}" на ${branch}@${head}…`);

  for (let i = 0; i < 60; i += 1) {
    const run = latestRun(branch, workflow);
    const state = classifyRun(run);
    if (state === 'green') {
      console.log('\n✅ CI зелёный. Команда деплоя (запусти вручную):');
      console.log(`\n    ${deployCmd}\n`);
      return;
    }
    if (state === 'red') {
      console.error(`\n❌ CI красный (run ${run.databaseId}). Деплой НЕ запускаем.`);
      process.exit(1);
    }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 20_000));
  }
  console.error('\ndeploy:when-green: таймаут ожидания CI (20 мин).');
  process.exit(1);
}

if (process.argv[1]?.endsWith('deploy-when-green.mjs')) {
  main().catch((e) => {
    console.error(String(e.message ?? e));
    process.exit(1);
  });
}
