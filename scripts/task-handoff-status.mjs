#!/usr/bin/env node
/**
 * yarn task:handoff — актуальный хендоф со сверкой каждой строки (tw-handoff-status).
 *
 * Обвязка чистого ядра scripts/lib/task-handoff-status.mjs: читает docs/HANDOFF.md,
 * штамп последней правки берёт у git, карточки — из реестра (активные + архив),
 * состояния Issue — батчем task-states (норма #1322: списком, не поштучно; сеть не
 * ответила → honest unknown, не «open» и не «closed»).
 *
 *   yarn task:handoff                показать сверенный хендоф
 *   yarn task:handoff --no-network   без сети: Issue честно ❓, реестр работает
 *
 * Exit: 0 — отчёт показан (❓/⚠ — данные отчёта, не сбой); 2 — вход нечитаем.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseHandoffQueue, renderHandoffStatus, resolveRow } from './lib/task-handoff-status.mjs';
import { fetchStatesBatch } from './lib/task-states-batch.mjs';
import { loadRegistry } from './lib/task-registry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HANDOFF_REL = 'docs/HANDOFF.md';

/** Штамп последней правки файла — у git, не у mtime (checkout врёт про время). */
export function readFileCommit(root, rel) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%H%x09%as%x09%s', '--', rel], {
      cwd: root, encoding: 'utf8',
    }).trim();
    if (!out) return null;
    const [sha, date, subject] = out.split('\t');
    return { sha, date, subject };
  } catch {
    return null;
  }
}

/** Карточки реестра: активные из registry.tasks, архивные там же (status=archived). */
export function buildCardsIndex(registry) {
  const cards = new Map();
  for (const t of registry.tasks ?? []) {
    cards.set(t.id, {
      status: t.status,
      archivedAt: t.archivedAt ?? null,
      archiveNotes: t.archiveNotes && t.archiveNotes !== '—' ? t.archiveNotes : null,
    });
  }
  return cards;
}

async function main() {
  const argv = process.argv.slice(2);
  const noNetwork = argv.includes('--no-network');
  const unknownArg = argv.find((a) => a !== '--no-network');
  if (unknownArg) {
    console.error(`task:handoff — неизвестный аргумент «${unknownArg}»`);
    return 2;
  }

  const text = readFileSync(resolve(ROOT, HANDOFF_REL), 'utf8');
  const { title, rows } = parseHandoffQueue(text);
  const fileCommit = readFileCommit(ROOT, HANDOFF_REL);
  // Невалидная дата коммита → staleDays null (не 0: «сегодняшний» — тоже утверждение).
  const parsedDate = fileCommit ? Date.parse(`${fileCommit.date}T00:00:00Z`) : NaN;
  const staleDays = Number.isNaN(parsedDate)
    ? null
    : Math.max(0, Math.round((Date.now() - parsedDate) / 86_400_000));

  const registry = loadRegistry();
  const cards = buildCardsIndex(registry);

  const numbers = [...new Set(rows.flatMap((r) => r.issues))];
  const issueStates = new Map();
  if (!noNetwork && numbers.length > 0) {
    // Сеть не ответила → honest unknown: отчёт выходит с ❓, а не падает и не гадает.
    // fetchStatesBatch — СИНХРОННЫЙ (execFileSync внутри), await не нужен; имя
    // провоцирует прочтение «async» — поймано ревью PR #1922.
    const batch = fetchStatesBatch(numbers);
    if (batch.unknown) {
      console.error(`task:handoff — состояния Issue не добыты: ${batch.reason}; показываю с ❓`);
    } else {
      for (const [n, state] of Object.entries(batch.states)) issueStates.set(Number(n), state);
    }
  }

  const resolved = rows.map((r) => ({ ...r, ...resolveRow(r, { cards, issueStates }) }));
  console.log(renderHandoffStatus({ title, fileCommit, staleDays, rows: resolved }));
  return 0;
}

if (process.argv[1]?.endsWith('task-handoff-status.mjs')) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(`task:handoff — вход нечитаем: ${error.message}`);
      process.exitCode = 2;
    },
  );
}
