/**
 * Хвост вечернего ритуала: закрытие Issues + team evening feedback.
 *
 * Вызывается из yarn ritual:evening после save-code-review.
 */
import { spawnSync } from 'node:child_process';

function printHelp() {
  console.log(`Usage: node scripts/ritual-evening-tail.mjs [options]

Шаги:
  1. yarn task:close-github   (батч закрытия архивных задач)
  2. yarn team-evening-feedback

Options:
  --skip-close-github     Не закрывать Issues
  --skip-team-feedback    Не запускать team-evening-feedback
  --help, -h              Справка`);
}

function runStep(label, script) {
  console.error(`\n=== ritual-evening-tail: ${label} ===\n`);
  const res = spawnSync('yarn', [script], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  printHelp();
  process.exit(0);
}

const skipClose = argv.includes('--skip-close-github');
const skipFeedback = argv.includes('--skip-team-feedback');

if (!skipClose) {
  runStep('task:close-github', 'task:close-github');
}

if (!skipFeedback) {
  runStep('team-evening-feedback', 'team-evening-feedback');
}

console.error('\nritual-evening-tail: готово.');
