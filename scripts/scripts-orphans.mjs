#!/usr/bin/env node
/**
 * `yarn scripts:orphans` — прямой ответ мастерской скриптов: бесхозные есть или нет.
 *
 * Глагол `audit` мастерской (`scripts/workshop.manifest.json`). Ответ ВСЕГДА со статусом и
 * знаменателем: молчаливый пустой список читается как «чисто», хотя может значить «обход не
 * нашёл ни одного носителя» — §4 такое молчание запрещает прямо.
 *
 * Коды возврата: 0 — бесхозных нет · 1 — есть. Второе сегодня ожидаемо: §4 остаётся заявкой,
 * `scripts/` домом ещё не считается (см. RECONCILE_M3), и правдивый ответ — «почти всё
 * сиротское». Красный тут говорит о состоянии дома, а не о поломке прибора.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ORPHAN_REASONS } from './lib/belongs.mjs';
import { readRegistry, REGISTRY_STATES } from './lib/namespace-registry.mjs';
import { ORPHANS_STATUS, orphans } from './lib/scripts-workshop.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Человеческое имя ветви предиката и адрес, по которому её чинят. */
const REASON_SAY = Object.freeze({
  [ORPHAN_REASONS.NO_RULE]: 'ни дом, ни правило членства не совпали',
  [ORPHAN_REASONS.SUBJECT_UNRESOLVED]: 'тест, предмет которого не разрешён (§2)',
});

/**
 * Строка диагноза — **вывод из замера, а не из посылки**.
 *
 * ДЕФЕКТ, ЗАКРЫТЫЙ 02.08. Прежде здесь стояло «правил членства ноль — сиротство ниже означает
 * „правила ещё нет“», и печаталось оно по условию `namespaces.length === 0`, то есть по
 * состоянию реестра. Посылка была верна, вывод из неё — нет: замер 02.08 дал 51 сироту из
 * 1000, ВСЕ по ветви `subject_unresolved`, по `no_rule` — ноль. Прибор называл причиной
 * остатка ветвь, которая в этом прогоне не бежала вовсе, и читатель уходил чинить реестр
 * вместо резолвера предмета. Три дня подряд, пока не сверили руками.
 *
 * Молчания здесь нет ни в одной ветке: у каждого состояния своя строка, потому что «ничего
 * не сказал» читается как «всё в порядке».
 *
 * СОСТОЯНИЙ ЧЕТЫРЕ, и их число не произвольно — оно следует из закрытого `ORPHAN_REASONS`:
 *   1. реестр недоступен — о ветвях предиката вывода нет вовсе;
 *   2. сирот ноль — говорить не о чем;
 *   3. по `no_rule` ноль, остаток пришёл `subject_unresolved` — изъян в резолвере предмета;
 *   4. `no_rule` задействована — дальше разделяется тем, заведены ли правила вообще.
 * Расширится `ORPHAN_REASONS` — придётся расширить и здесь; пустого «зарезервировано» нет,
 * потому что пятой ветви предиката сегодня не существует.
 *
 * СЛОВА ВЫВЕРЕНЫ (разбор Ожегова 02.08): ветвь предиката называется своей константой рядом
 * с человеческим именем — иначе «по ветви „правила нет“» читается как «правила не завели»,
 * то есть ровно тем, чем эта строка врала раньше. Адрес починки подаётся диагнозом, а не
 * приказом: прибор вправе назвать изъян и место, но не распоряжаться работой читателя.
 *
 * @param {{state: string, namespaces?: unknown[], problems?: string[]}} registry
 * @param {{byReason: Record<string, number>, counted: number}} result
 * @returns {string|null} строка предупреждения либо `null`, если говорить не о чем
 */
export function diagnosisLine(registry, result) {
  if (registry.state !== REGISTRY_STATES.OK) {
    // Реестр недоступен → членство по правилам не проверялось вовсе. Промолчать здесь
    // значит выдать «сирота» там, где на деле «не спрашивали».
    return `⚠ реестр неймспейсов: ${registry.state} — членство по правилам НЕ проверялось: ${(registry.problems ?? []).join('; ')}`;
  }
  if (result.counted === 0) return null;

  const byNoRule = result.byReason[ORPHAN_REASONS.NO_RULE] ?? 0;
  const bySubject = result.byReason[ORPHAN_REASONS.SUBJECT_UNRESOLVED] ?? 0;

  if (byNoRule === 0) {
    return `⚠ ветвь «ни дом, ни правило не совпали» (${ORPHAN_REASONS.NO_RULE}) не дала НИ ОДНОЙ сироты: `
      + `все ${bySubject} пришли ветвью «предмет теста не разрешён» (${ORPHAN_REASONS.SUBJECT_UNRESOLVED}). `
      + 'Изъян, вероятно, в резолвере `subjectOf` (§2), а не в реестре неймспейсов';
  }
  if ((registry.namespaces ?? []).length === 0) {
    return `⚠ правил членства заведено ноль, и ветвью «${ORPHAN_REASONS.NO_RULE}» пришли ${byNoRule} из ${result.counted} — `
      + 'для них сиротство означает «правила ещё нет», а не «место потеряно»';
  }
  return `⚠ ветвью «${ORPHAN_REASONS.NO_RULE}» пришли ${byNoRule} из ${result.counted}: `
    + 'правила членства заведены, но этих носителей не покрывает ни одно';
}

/**
 * Тело отчёта строками. Вынесено из `main` затем, чтобы слова прибора проверялись зубом:
 * до 02.08 диагноз жил внутри `main` вперемешку с выводом и был непроверяем в принципе.
 *
 * @param {{status: string, orphans: string[], byReason: Record<string, number>, counted: number, denominator: number}} result
 * @param {{state: string, namespaces?: unknown[], problems?: string[]}} registry
 * @param {{includeTests?: boolean, limit?: number}} [opts]
 * @returns {string[]}
 */
export function reportLines(result, registry, opts = {}) {
  const { includeTests = true, limit = 20 } = opts;
  const lines = [
    `scripts:orphans · знаменатель ${result.denominator}${includeTests ? ' (инструменты ∪ тесты)' : ' (без тестов)'}`,
  ];

  const diagnosis = diagnosisLine(registry, result);
  if (diagnosis !== null) lines.push(diagnosis);

  lines.push(
    result.status === ORPHANS_STATUS.CLEAN
      ? `✓ бесхозных нет · проверено ${result.denominator}`
      : `✖ бесхозных ${result.counted} из ${result.denominator}`,
  );

  // Сводка по ветвям — прежде чем список путей: она и есть диагноз, а список лишь адреса.
  // Порядок ветвей детерминирован именем, иначе один и тот же прогон печатался бы по-разному.
  for (const reason of Object.keys(result.byReason).sort()) {
    lines.push(`    ${reason}: ${result.byReason[reason]} — ${REASON_SAY[reason] ?? 'причина вне известных'}`);
  }

  for (const p of result.orphans.slice(0, limit)) lines.push(`    ${p}`);
  if (result.orphans.length > limit) {
    lines.push(`    … и ещё ${result.orphans.length - limit} (полный список — \`--json\`)`);
  }
  return lines;
}

function main(argv) {
  const includeTests = !argv.includes('--no-tests');
  const asJson = argv.includes('--json');

  const registry = readRegistry(repoRoot);
  const namespaces = registry.state === REGISTRY_STATES.OK ? registry.namespaces : [];
  const result = orphans(repoRoot, { includeTests, namespaces });

  if (asJson) {
    process.stdout.write(`${JSON.stringify({ ...result, registryState: registry.state }, null, 2)}\n`);
    return result.status === ORPHANS_STATUS.CLEAN ? 0 : 1;
  }

  process.stdout.write(`${reportLines(result, registry, { includeTests }).join('\n')}\n`);
  return result.status === ORPHANS_STATUS.CLEAN ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('scripts-orphans.mjs')) {
  process.exit(main(process.argv.slice(2)));
}
