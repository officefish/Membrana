/**
 * Утренний обзор открытых PR night-hunt → docs/NIGHT_HUNT_PR_REVIEW.md
 * для main-day-issue. Optional: без gh — пустой файл, exit 0.
 *
 * yarn night-hunt:pr-review
 * yarn night-hunt:pr-review --dry-run
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadDotEnv } from './_anthropic-env.mjs';

const OUTPUT_REL = 'docs/NIGHT_HUNT_PR_REVIEW.md';
const LABEL = 'night-hunt';

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function ghAvailable() {
  try {
    execFileSync('gh', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function listNightHuntPrs() {
  const raw = execFileSync(
    'gh',
    [
      'pr',
      'list',
      '--label',
      LABEL,
      '--state',
      'open',
      '--json',
      'number,title,url,body,files,createdAt',
      '--limit',
      '20',
    ],
    { encoding: 'utf8' },
  );
  return JSON.parse(raw);
}

function main() {
  const cli = parseArgs(process.argv.slice(2));
  if (cli.help) {
    console.log(`Usage: yarn night-hunt:pr-review [--dry-run]

Пишет ${OUTPUT_REL} — сводка открытых PR с label "${LABEL}" для yarn main-day-issue.`);
    process.exit(0);
  }

  loadDotEnv();
  const cwd = process.cwd();
  const stamp = new Date().toISOString();
  const lines = [
    '# Night Hunt — утренний обзор PR',
    '',
    `Сгенерировано: ${stamp}`,
    '',
    'Отчёты ночной охоты (OpenRouter proxy → background-office → PR). После merge попадают в `docs/seanses/night-hunt/`.',
    '',
  ];

  if (!ghAvailable()) {
    lines.push('*(gh CLI недоступен — пропуск списка PR)*', '');
    writeOutput(cwd, lines.join('\n'), cli.dryRun);
    process.exit(0);
  }

  let prs = [];
  try {
    prs = listNightHuntPrs();
  } catch (e) {
    lines.push('*(не удалось получить PR через gh — optional skip)*', '', String(e?.message ?? e), '');
    writeOutput(cwd, lines.join('\n'), cli.dryRun);
    process.exit(0);
  }

  if (prs.length === 0) {
    lines.push('## Открытые PR', '', '*(нет открытых PR с label `night-hunt` — норма)*', '');
  } else {
    lines.push('## Открытые PR', '');
    for (const pr of prs) {
      lines.push(`### #${pr.number} — ${pr.title}`, '', `- URL: ${pr.url}`, `- Created: ${pr.createdAt}`, '');
      const files = (pr.files ?? []).map((f) => f.path).filter((p) => p?.includes('night-hunt'));
      if (files.length) {
        lines.push('**Файлы night-hunt:**', ...files.map((p) => `- \`${p}\``), '');
      }
      const body = (pr.body ?? '').trim();
      if (body) {
        lines.push('**Описание PR (кратко):**', '', body.slice(0, 2_000), '');
      }
    }
    lines.push(
      '## Для планирования дня',
      '',
      '- Ревьюьте PR выше; merge по LGTM.',
      '- Значимые находки включайте в MAIN_DAY_ISSUE / standup.',
      '- Пропуск PR не блокирует день.',
      '',
    );
  }

  writeOutput(cwd, lines.join('\n'), cli.dryRun);
}

function writeOutput(cwd, body, dryRun) {
  const abs = resolve(cwd, OUTPUT_REL);
  if (dryRun) {
    console.log(body);
    return;
  }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body, 'utf8');
  console.error(`→ ${OUTPUT_REL}`);
}

main();
