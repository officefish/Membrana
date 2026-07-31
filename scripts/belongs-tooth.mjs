#!/usr/bin/env node
/**
 * `belongs-tooth` — прибор инварианта принадлежности (§5 контракта `workshop-wires`).
 *
 * Два места проверки, одна лемма:
 *
 * | место | область | поведение |
 * |---|---|---|
 * | pre-push | затронутое пушем (`--scope-from`) | строгий: падает на приросте |
 * | CI и ритуал дня | полный знаменатель | отчёт: прирост + счётчик наследства |
 *
 * ВТОРОЕ НЕ ПОДМЕНЯЕТ ПЕРВОЕ. Полный отчёт видит больше, но приходит позже и никого не
 * останавливает; строгий по затронутому останавливает вовремя, но слеп ко всему, чего пуш не
 * касался. Оставить одно — потерять либо своевременность, либо охват.
 *
 * ЗУБ ЗДЕСЬ НЕ ВКЛЮЧЁН. В `.githooks/pre-push` этот файл не вписан: разблокирование §5
 * (утро 31.07, поправка `AMENDMENT_S3`) включением не является. До слова владельца прибор
 * зовётся руками и в CI — и уже говорит правду, просто никого не роняет по дороге.
 *
 * Коды возврата: 0 — инвариант держится · 1 — нарушен · 2 — проверка НЕ состоялась
 * (зуб не включён, порча baseline, испорченный вход). Слить 1 и 2 нельзя: «нарушен» и
 * «не проверяли» — разные новости.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BASELINE_REL, INVARIANT_PHASES, checkInvariant, freezeBaseline, readBaseline } from './lib/belongs-invariant.mjs';
import { partitionWaivers, renderWaiverLine } from './lib/orphan-waiver.mjs';
import { readRegistry, REGISTRY_STATES } from './lib/namespace-registry.mjs';
import { orphans } from './lib/scripts-workshop.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Освобождения живут рядом с baseline — один дом у обоих носителей инварианта. */
export const WAIVERS_REL = 'docs/namespaces/ORPHAN_WAIVERS.json';

const EXIT_OK = 0;
const EXIT_VIOLATED = 1;
const EXIT_NOT_PERFORMED = 2;

/** Прочитать JSON или вернуть null. Отсутствие файла — не ошибка чтения, а факт. */
function readJson(rel) {
  const p = join(repoRoot, rel);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return { __broken: true };
  }
}

export function parseArgs(argv) {
  const out = { scopeFrom: null, phase: INVARIANT_PHASES.GROWTH, now: null, json: false, freeze: false, reason: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--scope-from') out.scopeFrom = argv[++i] ?? null;
    else if (a === '--phase') out.phase = argv[++i] ?? null;
    else if (a === '--now') out.now = argv[++i] ?? null;
    else if (a === '--reason') out.reason = argv[++i] ?? null;
    else if (a === '--json') out.json = true;
    else if (a === '--freeze') out.freeze = true;
  }
  return out;
}

/**
 * Отчёт словами.
 *
 * Знаменатель печатается ВСЕГДА и рядом с областью: «прироста нет» без знаменателя
 * неотличимо от «ничего не проверяли». Тот же запрет, что у глагола `orphans`.
 */
export function renderToothReport(res, part, extra = {}) {
  const lines = [];
  const where = res.scoped ? `затронутое пушем (${extra.scopeSize ?? 0} путей)` : 'полный знаменатель';
  lines.push(`belongs-tooth · фаза ${res.phase} · область: ${where} · сирот всего ${res.denominator}`);
  if (res.problems.length > 0) {
    lines.push('✖ проверка НЕ состоялась:');
    for (const p of res.problems) lines.push(`    ${p}`);
    return lines.join('\n');
  }
  lines.push(renderWaiverLine(part));
  lines.push(`наследство ${res.inherited.length} — само по себе не блокирует`);
  if (res.ok) {
    lines.push(`✓ прироста бесхозного нет${res.scoped ? ' в затронутом' : ''}`);
  } else {
    const failing = res.phase === INVARIANT_PHASES.ABSOLUTE ? [...res.growth, ...res.inherited] : res.growth;
    lines.push(`✖ инвариант нарушен: ${failing.length}`);
    for (const p of failing.slice(0, 20)) lines.push(`    ${p}`);
    if (failing.length > 20) lines.push(`    … и ещё ${failing.length - 20}`);
    lines.push('Законные ходы: припарковать в дом или неймспейс · убрать путь из диффа ·');
    lines.push('выдать освобождение со сроком. SKIP_PREPUSH освобождением НЕ является.');
  }
  return lines.join('\n');
}

function main(argv) {
  const args = parseArgs(argv);

  const registry = readRegistry(repoRoot);
  const namespaces = registry.state === REGISTRY_STATES.OK ? registry.namespaces : [];
  const current = orphans(repoRoot, { namespaces }).orphans;

  // --freeze: явный акт со следом (§5). Печатает документ в stdout и НЕ пишет файл сам —
  // заморозка попадает в дерево через коммит человека, а не побочным эффектом прогона.
  if (args.freeze) {
    process.stdout.write(`${JSON.stringify(freezeBaseline(current, args.now, args.reason), null, 2)}\n`);
    return EXIT_OK;
  }

  const baselineDoc = readJson(BASELINE_REL);
  const baseline = readBaseline(baselineDoc?.__broken ? {} : baselineDoc);
  const waiversDoc = readJson(WAIVERS_REL);
  const waivers = Array.isArray(waiversDoc?.waivers) ? waiversDoc.waivers : [];

  let scope = null;
  if (args.scopeFrom !== null) {
    // Список затронутого приходит ФАЙЛОМ, а не из git внутри прибора: так один и тот же
    // прогон воспроизводится вне хука, и красный можно повторить, не имитируя пуш.
    const raw = existsSync(args.scopeFrom) ? readFileSync(args.scopeFrom, 'utf8') : '';
    scope = raw.split(/\r?\n/).map((s) => s.trim()).filter((s) => s !== '');
  }

  const res = checkInvariant({ orphans: current, baseline, waivers, now: args.now, phase: args.phase, scope });
  const part = partitionWaivers(waivers, args.now);

  if (args.json) {
    process.stdout.write(`${JSON.stringify({ ...res, waiversActive: part.active.length, waiversExpired: part.expired.length }, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderToothReport(res, part, { scopeSize: scope?.length ?? 0 })}\n`);
  }

  if (res.problems.length > 0) return EXIT_NOT_PERFORMED;
  return res.ok ? EXIT_OK : EXIT_VIOLATED;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('belongs-tooth.mjs')) {
  process.exit(main(process.argv.slice(2)));
}
