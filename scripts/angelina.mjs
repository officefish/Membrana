#!/usr/bin/env node
/**
 * Ангелина — прогон каскада ритуала на живом дереве. Строит снимок (git-версия + digest +
 * провенанс из заголовка), гонит через чистое ядро, печатает состояние каждого узла и
 * ВЫХОДИТ ГРОМКО (код 22) при любом блоке (`stale` или проблема провенанса). Никаких
 * `|| true`. Вердикт заседания M1.
 *
 *   node scripts/angelina.mjs [--json]
 *
 * NB: машинный заголовок `<!-- angelina {…} -->` или честная ручная чеканка
 * `<!-- angelina-manual {…} -->` (#999). Без обоих — громкий блок «нет провенанса».
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { orchestrateCascade, presentNode } from './lib/angelina-cascade.mjs';
import { buildSnapshot, gitFsIo } from './lib/angelina-adapter.mjs';
import { canSend, todayIso } from './lib/morning-gates.mjs';
import { entryLine, judgeMorningEntries } from './lib/morning-entry.mjs';

const EXIT_BLOCKED = 22;

/** Дневной каскад: горизонт → стендап → центральная задача. Рёбра = «потребитель читает производителя». */
export const CASCADE_DAY = {
  nodes: [
    { id: 'STRATEGY_DAY', path: 'docs/STRATEGY_DAY.md', label: 'Горизонт дня' },
    { id: 'DAILY_STANDUP', path: 'docs/DAILY_STANDUP.md', label: 'Стендап' },
    { id: 'MAIN_DAY_ISSUE', path: 'docs/MAIN_DAY_ISSUE.md', label: 'Центральная задача' },
  ],
  edges: [
    { from: 'STRATEGY_DAY', to: 'DAILY_STANDUP' },
    { from: 'STRATEGY_DAY', to: 'MAIN_DAY_ISSUE' },
    { from: 'DAILY_STANDUP', to: 'MAIN_DAY_ISSUE' },
  ],
};

/**
 * Наблюдение дверей в утро для предиката `|entry|=1` (вердикт M4-H). Порт: читает дерево,
 * решение выносит чистое ядро `lib/morning-entry.mjs`.
 *
 * Дверь — КОМАНДА, открывающая процедуру утра. Свидетели двери бывают трёх слоёв:
 *   command   — команда package.json, зовущая `procedure-run-record.mjs open --procedure
 *               ritual-day`. Шаги цепочки дверью не считаются: они исполняют начатое.
 *   skill     — живой скилл, ВЕЛЯЩИЙ запустить цепочку. Свидетель той же двери, а не вторая:
 *               ровно этого требовал вердикт M1 («ссылка, не копия»). Скилл, лишь называющий
 *               утро, не свидетель вовсе — в дереве таких три, и все три суть ЗАПРЕТЫ
 *               («утро вычеркнуто», «не меняет», «Do NOT use for»).
 *   autostart — хук или прогон CI, зовущий цепочку без человека. Строки-комментарии не в счёт.
 *
 * ЧЕСТНАЯ ГРАНИЦА НАБЛЮДЕНИЯ. Ловятся ОБЪЯВЛЕННЫЕ двери — те, что зовут цепочку её
 * собственным именем. Дверь, переписавшая утро своими словами и своими шагами, отсюда не
 * видна; такую ловит предикат разбиения канонов (`lib/skill-status.mjs`), а не этот. Оба
 * молчать одновременно не должны — потому и живут порознь.
 *
 * @param {string} repoRoot
 * @param {{readFileSync: Function, existsSync: Function, readdirSync: Function, join: Function}} io
 * @returns {Array<{layer: string, name: string, command: string}>}
 */
export function observeMorningEntries(repoRoot, io) {
  const found = [];
  const read = (p) => {
    try {
      return io.existsSync(p) ? io.readFileSync(p, 'utf8') : null;
    } catch {
      return null; // нечитаемый файл дверью не объявляем — молчаливой двери не бывает
    }
  };
  const list = (p) => {
    try {
      return io.existsSync(p) ? io.readdirSync(p) : [];
    } catch {
      return [];
    }
  };

  // Слой команд: кто открывает процедуру утра.
  const commands = [];
  const pkgRaw = read(io.join(repoRoot, 'package.json'));
  if (pkgRaw) {
    try {
      const scripts = JSON.parse(pkgRaw).scripts ?? {};
      for (const [name, body] of Object.entries(scripts)) {
        if (typeof body === 'string' && /procedure-run-record\.mjs open[^&|]*--procedure ritual-day/u.test(body)) {
          const command = `yarn ${name}`;
          commands.push(command);
          found.push({ layer: 'command', name: command, command });
        }
      }
    } catch { /* битый package.json — о нём скажет своя проверка, не эта */ }
  }

  // Слой скиллов: кто велит запустить команду. Свидетель известной двери — не новая дверь.
  const skillsDir = io.join(repoRoot, '.cursor', 'skills');
  for (const dir of list(skillsDir)) {
    const body = read(io.join(skillsDir, dir, 'SKILL.md'));
    if (!body || !/^status:\s*live\s*$/mu.test(body)) continue;
    for (const command of commands) {
      if (body.includes(command)) found.push({ layer: 'skill', name: dir, command });
    }
  }

  // Слой автозапуска: кто начинает утро без человека.
  for (const rel of [['.husky'], ['.github', 'workflows']]) {
    const dir = io.join(repoRoot, ...rel);
    for (const name of list(dir)) {
      const body = read(io.join(dir, name));
      if (!body) continue;
      const live = body.split('\n').filter((line) => !/^\s*#/u.test(line)).join('\n');
      for (const command of commands) {
        if (live.includes(command)) found.push({ layer: 'autostart', name: `${rel.join('/')}/${name}`, command });
      }
    }
  }

  return found;
}

/** Состояние гейтов утра (сопровождение по фронтиру, M4-H). Файл пишет morning-gate CLI. */
export const GATES_STATE_REL = 'docs/tasks/morning-gates-state.json';

function readGatesState(repoRoot) {
  const p = join(repoRoot, GATES_STATE_REL);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return { corrupt: true };
  }
}

/**
 * Встреча — первая реплика дня (вердикт M4-H, ратифицирован): имя, ревизия head,
 * состояние фронтира (каскад + два гейта). Молчаливый старт запрещён.
 */
function greet(repoRoot) {
  let head = '—';
  try {
    head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch { /* head остаётся «—» — честная неизвестность */ }
  const state = readGatesState(repoRoot);
  let gatesLine;
  if (!state) gatesLine = 'гейты: состояние не заведено (magistral и swallow ждут; yarn morning:gate)';
  else if (state.corrupt) gatesLine = 'гейты: файл состояния битый — считаю оба закрытыми';
  else {
    const gate = canSend(state, todayIso());
    gatesLine = gate.ok
      ? 'гейты: оба пройдены — отправка разрешена'
      : `гейты: ${gate.blockedBy.join(' · ')}`;
  }
  const entries = judgeMorningEntries(
    observeMorningEntries(repoRoot, { readFileSync, existsSync, readdirSync, join }),
  );
  console.log(`Доброе утро. Ведёт Ангелина · head ${head}.`);
  console.log(entryLine(entries));
  console.log(gatesLine);
}

function main() {
  const json = process.argv.includes('--json');
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const io = gitFsIo(repoRoot, { execFileSync, readFileSync, existsSync, join });
  const snapshot = buildSnapshot(CASCADE_DAY, io);
  const report = orchestrateCascade(CASCADE_DAY, snapshot);

  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    greet(repoRoot);
    console.log('=== Ангелина · каскад дня ===');
    for (const id of report.order) console.log(presentNode(id, report.results[id]));
    const blocked = Object.values(report.results).filter((r) => r.blocked).length;
    console.log(
      report.ok
        ? '\nАнгелина: каскад дня чист — все документы свежи и подписаны. Можно начинать день.'
        : `\n✖ Ангелина: каскад заблокирован (${blocked} узл., первый — ${report.firstBlocked}). День НЕ начинаем на протухшем — чинить.`,
    );
  }

  process.exit(report.ok ? 0 : EXIT_BLOCKED);
}

// Прямой запуск (не импорт из теста).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
