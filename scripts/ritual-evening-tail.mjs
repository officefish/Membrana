/**
 * Хвост вечернего ритуала: закрытие Issues + team evening feedback + сверка утверждений.
 *
 * Вызывается из yarn ritual:evening после save-code-review.
 *
 * Третий шаг заведён карточкой `feedback-claims-code-probe` (#1795, долг попугая
 * `#team-feedback-claims-code-unverified`): протокол вечера утверждает о коде и до 08.08
 * никем не сверялся, а на нём строится доклад союзникам. Порядок обязателен — probe идёт
 * ПОСЛЕ протокола (иначе нечего сверять) и ДО ласточки (иначе сверка бесполезна).
 */
import { spawnSync } from 'node:child_process';

function printHelp() {
  console.log(`Usage: node scripts/ritual-evening-tail.mjs [options]

Шаги:
  1. yarn task:close-github   (батч закрытия архивных задач)
  2. yarn team-evening-feedback
  3. yarn feedback:claims --append --state   (сверка утверждений протокола с деревом)

Options:
  --skip-close-github     Не закрывать Issues
  --skip-team-feedback    Не запускать team-evening-feedback
  --skip-claims-probe     Не сверять утверждения протокола
  --help, -h              Справка`);
}

function runStep(label, script, args = []) {
  console.error(`\n=== ritual-evening-tail: ${label} ===\n`);
  const res = spawnSync('yarn', [script, ...args], {
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
const skipClaims = argv.includes('--skip-claims-probe');

if (!skipClose) {
  runStep('task:close-github', 'task:close-github');
}

if (!skipFeedback) {
  runStep('team-evening-feedback', 'team-evening-feedback');
}

if (!skipClaims) {
  // Шаг НЕ роняет хвост: `feedback:claims` без `--strict` возвращает 0 даже на найденном
  // hard-нарушении. Красная сверка не отменяет протокол — он обязателен по CLAUDE.md; она
  // вписывает секцию в его тело и держит ОТПРАВКУ через предикат вечернего гейта.
  // Это не `|| true` на критичном шаге (инцидент 18.07): отказ самого инструмента —
  // нет протокола, битый реестр — остаётся exit 2 и роняет хвост честно.
  runStep('feedback:claims', 'feedback:claims', ['--append', '--state']);
}

console.error('\nritual-evening-tail: готово.');
