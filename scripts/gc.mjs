#!/usr/bin/env node
/**
 * GC кладбища — исполнитель приговора (блок b3 спринта `angelina-hostess-impl`,
 * вердикт M5-GC заседания `angelina-hostess`, 21.07).
 *
 *   node scripts/gc.mjs [--dry] [--json]
 *
 * ЧТО ДЕЛАЕТ. Читает приговоры из жизненного цикла инсайта (ось решения `D`), переносит
 * приговорённые следы в `docs/void/` с эпитафией и печатает отчёт. Производные едут за
 * родителем ОДНОЙ операцией.
 *
 * ЧЕГО НЕ ДЕЛАЕТ. **Не судит.** Приговор выносит закрытый вердикт с ответственным
 * (`yarn insight decide <id> --set rejected --authority <ref>`); GC его исполняет. И не
 * удаляет: «затереть» значит убить читаемость мёртвого пути, а не историю — кладбище
 * растёт монотонно.
 *
 * ШУМНЫЙ ПО ТРЕБОВАНИЮ ВЕРДИКТА. «Перенесено 0» печатается тоже, и вместе с причиной:
 * молчаливый сборщик неотличим от сломанного. Отдельно называются приговорённые, которые
 * НЕ поехали, — с именами недостающих полей эпитафии.
 *
 * ЧЕЛОВЕК-ГЕЙТ — diff в PR: GC двигает файлы в рабочем дереве и ничего не коммитит.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { VOID_DIR, epitaph, gcReport, isDead, planVoidMove } from './lib/gc-void.mjs';
import { epitaphGaps, sentencesFromProjection } from './lib/void-sentence.mjs';
import { lifecyclePaths } from './lib/insight-lifecycle-store.mjs';

const EXIT_BLOCKED = 23;

/**
 * Прочитать проекцию цикла. Отсутствие стора — не поломка: приговоров просто не выносилось,
 * и сказать об этом надо словом, а не пустым отчётом.
 * @param {string} repoRoot
 * @returns {{projection: object|null, reason: string|null}}
 */
export function readProjection(repoRoot, io = { existsSync, readFileSync }) {
  const paths = lifecyclePaths(repoRoot);
  if (!io.existsSync(paths.currentView)) {
    return {
      projection: null,
      reason: `стор жизненного цикла не заведён (${relative(repoRoot, paths.currentView).replace(/\\/gu, '/')}) — приговоров не выносилось ни одного`,
    };
  }
  try {
    return { projection: JSON.parse(io.readFileSync(paths.currentView, 'utf8')), reason: null };
  } catch (error) {
    return { projection: null, reason: `проекция цикла нечитаема: ${error.message}` };
  }
}

/**
 * Где в дереве лежит след и что при нём производного.
 *
 * Приговор выносится мандату; мандат ссылается на ревизию, ревизия — на инсайт, а инсайт
 * живёт каталогом. Всё, что внутри каталога, едет вместе с ним и отдельным ходом не
 * считается — потому производные здесь только внешние.
 *
 * @param {string} repoRoot
 * @param {string} subjectRef
 * @param {object|null} baseContext
 * @returns {{parent: string|null, derivatives: string[]}}
 */
export function locateTrace(repoRoot, subjectRef, baseContext, io = { existsSync }) {
  const mandate = (baseContext?.mandates ?? []).find((m) => m.id === subjectRef);
  const revision = (baseContext?.insightRevisions ?? []).find((r) => r.id === mandate?.insightRevisionRef);
  const insightId = revision?.insightId ?? subjectRef;
  const parentRel = `docs/insights/${insightId}`;
  const parent = io.existsSync(join(repoRoot, parentRel)) ? parentRel : null;
  return { parent, derivatives: [], homeId: insightId };
}

/** Прочитать базовый контекст цикла (для разрешения мандат → инсайт). */
function readBaseContext(repoRoot) {
  const paths = lifecyclePaths(repoRoot);
  if (!existsSync(paths.baseContext)) return null;
  try {
    return JSON.parse(readFileSync(paths.baseContext, 'utf8'));
  } catch {
    return null;
  }
}

/** Рекурсивно перечислить файлы каталога относительными путями. */
function walk(root, prefix = '') {
  const out = [];
  for (const name of readdirSync(root)) {
    const full = join(root, name);
    const rel = prefix === '' ? name : `${prefix}/${name}`;
    if (statSync(full).isDirectory()) out.push(...walk(full, rel));
    else out.push(rel);
  }
  return out;
}

/**
 * Исполнить план переноса: подвинуть и надписать эпитафию.
 *
 * Эпитафия — барьер №1 вердикта M5: она первое, что видит читатель, и потому кладётся в
 * НАЧАЛО каждого перенесённого markdown-файла, а не рядом с ними.
 */
function applyMove(repoRoot, plan, sentence) {
  const touched = [];
  for (const move of plan.moves) {
    const from = join(repoRoot, move.from);
    const to = join(repoRoot, move.to);
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
    const files = statSync(to).isDirectory() ? walk(to).map((r) => join(to, r)) : [to];
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      writeFileSync(file, epitaph(sentence) + readFileSync(file, 'utf8'), 'utf8');
      touched.push(relative(repoRoot, file).replace(/\\/gu, '/'));
    }
  }
  return touched;
}

/**
 * Прогон прохода над ЗАДАННЫМ деревом. Вынесен из `main`, чтобы зуб гонял его на фикстурном
 * дереве: проход, умеющий работать только над собственным репозиторием, проверяется лишь
 * тем, что в этом репозитории сегодня лежит, — то есть почти ничем.
 *
 * @param {string} repoRoot
 * @param {{dry?: boolean, today?: string}} [opts]
 */
export function runGc(repoRoot, opts = {}) {
  const dry = opts.dry === true;
  const today = opts.today ?? new Date().toISOString().slice(0, 10);

  const { projection, reason } = readProjection(repoRoot);
  const sentences = projection ? sentencesFromProjection(projection) : [];
  const baseContext = readBaseContext(repoRoot);

  const moved = [];
  const held = [];
  for (const sentence of sentences) {
    const gaps = epitaphGaps(sentence);
    if (!isDead(sentence) || gaps.length > 0) {
      // Приговорён, но эпитафия неполна либо вердикт не закрыт — не едет и НЕ молчит.
      held.push({ id: sentence.subjectRef, gaps });
      continue;
    }
    const where = locateTrace(repoRoot, sentence.subjectRef, baseContext);
    const plan = planVoidMove(sentence, where, VOID_DIR);
    if (!plan.ok) {
      held.push({ id: sentence.subjectRef, gaps: [plan.reason] });
      continue;
    }
    const files = dry ? [] : applyMove(repoRoot, plan, sentence);
    moved.push({ id: where.homeId ?? sentence.subjectRef, subjectRef: sentence.subjectRef, rejectedAt: sentence.rejectedAt, moves: plan.moves, files });
  }

  return { today, dry, moved, held, reason, unreadable: projection === null && reason !== null && !reason.includes('не заведён') };
}

/**
 * Отчёт прохода словами. Шумность — требование вердикта: «перенесено 0» печатается тоже, и
 * вместе с причиной; молчаливый сборщик неотличим от сломанного.
 * @param {ReturnType<typeof runGc>} result
 * @returns {string}
 */
export function presentGc(result) {
  const lines = [gcReport(result.moved, result.today) + (result.dry ? '  (сухой прогон — файлы не тронуты)' : '')];
  if (result.reason) lines.push(`  причина: ${result.reason}`);
  for (const h of result.held) lines.push(`  ⚠ ${h.id} — приговорён, но не перенесён: ${h.gaps.join('; ')}`);
  if (result.moved.length === 0 && result.held.length === 0 && !result.reason) {
    lines.push('  приговорённых нет — все следы живы');
  }
  return lines.join('\n');
}

function main() {
  const repoRoot = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
  const result = runGc(repoRoot, { dry: process.argv.includes('--dry') });
  if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else console.log(presentGc(result));

  // Задержанный приговорённый — находка, а не поломка: вечер её видит, но на ней не встаёт.
  // Красным проход делает только нечитаемая проекция: тогда неизвестно, что осталось живым.
  process.exit(result.unreadable ? EXIT_BLOCKED : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
