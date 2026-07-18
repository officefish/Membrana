#!/usr/bin/env node
/**
 * main-day-probe — гейт посылок MAIN_DAY_ISSUE (#533, консилиум 2026-07-16).
 *
 * Read-only: собирает факты (есть ли маркер в дереве, статус Issue) и выносит
 * вердикт чистым ядром `scripts/lib/main-day-probe.mjs`. НИЧЕГО НЕ ЧИНИТ —
 * не закрывает Issue, не правит план, не пишет в реестр: автопочинка скрыла бы
 * находку «реестр протух», ради которой гейт и строится (запрет консилиума).
 *
 * Повод — 16.07 план назначил магистралью написать `fuseDetectorConfidences`,
 * слитый 13.07: развилка строилась на статусе «#415 open», а issue висел лишь
 * потому, что PR #417 дал «(#415)» вместо «Closes #415».
 * Разбор: docs/seanses/main-day-issue-drift-report-2026-07-16.md
 *
 * Посылки берутся из манифеста (по образцу `issues:audit`): генератор плана пока
 * не размечает развилки маркерами — это отдельная фаза PG5. Нет манифеста → нечего
 * проверять → exit 0: отсутствие данных не алерт (эталон drift-anchor-divergence #413).
 *
 * Usage: node scripts/main-day-probe.mjs [--assertions <path>] [--json]
 * Exit:  0 — посылки держатся / не проверены / манифеста нет
 *        2 — хоть одна ПОСЫЛКА НАРУШЕНА (генерация магистрали блокируется)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  dedupeByOrigin,
  formatOriginSummary,
  formatProbeReport,
  hasViolatedAssertion,
  probeAssertions,
} from './lib/main-day-probe.mjs';

export const DEFAULT_ASSERTIONS_REL = 'docs/tasks/main-day-assertions.json';

/** @param {string[]} argv */
export function parseMainDayProbeArgs(argv) {
  const o = { assertions: DEFAULT_ASSERTIONS_REL, json: false, force: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--assertions') o.assertions = argv[i + 1] ?? o.assertions;
    else if (a === '--json') o.json = true;
    else if (a === '--force') o.force = true;
    else if (a === '--help' || a === '-h') o.help = true;
  }
  return o;
}

/**
 * Исходники, где ищем символ.
 *
 * Префикс `:(glob)` обязателен: pathspec без него git трактует НЕ как shell-glob
 * и молча находит ноль. Первый прогон гейта 16.07 из-за этого объявил
 * `fuseDetectorConfidences` отсутствующим — то есть соврал ровно в том кейсе,
 * против которого построен, и ядро тут ни при чём (12 тестов были зелёные).
 * Ограничение на каталог `src` отсекает доки (`.mdx`): упоминание символа в
 * документации — не доказательство, что код есть.
 */
const SOURCE_PATHSPECS = [':(glob)packages/**/src/**', ':(glob)apps/**/src/**'];

/** Есть ли символ в исходниках. `null` — узнать не удалось (git недоступен). */
function symbolExists(value, cwd) {
  try {
    execFileSync('git', ['grep', '-l', '--fixed-strings', value, '--', ...SOURCE_PATHSPECS], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return true;
  } catch (error) {
    // git grep: exit 1 — «не найдено» (это факт), остальное — «узнать не удалось».
    return error?.status === 1 ? false : null;
  }
}

/** Статус Issue через gh. `null` — gh недоступен / нет сети / issue не найден. */
function issueState(number) {
  if (number === undefined || number === null) return null;
  try {
    const out = execFileSync('gh', ['issue', 'view', String(number), '--json', 'state'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const state = JSON.parse(String(out))?.state;
    return typeof state === 'string' ? state.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Текущий SHA — провенанс строки-доказательства. */
function headSha(cwd) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return undefined;
  }
}

/**
 * Собрать факты по одной посылке. Read-only.
 *
 * @param {{marker?: {kind?: string, value?: string}, issue?: number}} assertion
 */
export function collectEvidence(assertion, cwd = process.cwd(), sha = undefined) {
  const kind = assertion?.marker?.kind ?? 'symbol';
  const value = assertion?.marker?.value ?? '';
  let markerExists = null;
  if (value) {
    markerExists =
      kind === 'file' || kind === 'test' ? existsSync(resolve(cwd, value)) : symbolExists(value, cwd);
  }
  return { markerExists, issueState: issueState(assertion?.issue), sha };
}

function main() {
  const cli = parseMainDayProbeArgs(process.argv.slice(2));
  if (cli.help) {
    console.log(
      [
        'Usage: yarn main-day-probe [--assertions <path>] [--json]',
        '',
        'Гейт посылок MAIN_DAY_ISSUE: маркер в коде первичен, Issue вторичен.',
        'Read-only — ничего не чинит и не закрывает.',
        '',
        `  --assertions <path>  манифест посылок (по умолчанию ${DEFAULT_ASSERTIONS_REL})`,
        '  --json               машиночитаемый вывод',
        '',
        'Exit: 0 — держатся / не проверены / манифеста нет; 2 — посылка нарушена.',
      ].join('\n'),
    );
    return 0;
  }

  const cwd = process.cwd();
  const path = resolve(cwd, cli.assertions);
  if (!existsSync(path)) {
    // Генератор ещё не размечает развилки маркерами (PG5) — это не повод ронять ритуал.
    console.log(`main-day-probe: манифест посылок не найден (${cli.assertions}) — проверять нечего.`);
    return 0;
  }

  let assertions;
  let parsedManifest = null;
  try {
    parsedManifest = JSON.parse(readFileSync(path, 'utf8'));
    assertions = Array.isArray(parsedManifest) ? parsedManifest : (parsedManifest?.assertions ?? []);
  } catch (error) {
    console.error(`main-day-probe: манифест не читается: ${error?.message ?? error}`);
    return 2;
  }

  const sha = headSha(cwd);
  const results = probeAssertions(
    assertions.map((assertion) => ({ assertion, evidence: collectEvidence(assertion, cwd, sha) })),
  );

  // Источники обоснования — отдельный список: голоса считаются по различным
  // первоисточникам, а не по строкам таблицы (эхо-камера 16.07: три строки = один
  // снимок от 06.07, и план счёл это консенсусом).
  const sources = Array.isArray(parsedManifest?.sources) ? parsedManifest.sources : [];

  if (cli.json) {
    console.log(JSON.stringify({ sha, results, sources: dedupeByOrigin(sources) }, null, 2));
  } else {
    console.log('\n--- посылки MAIN_DAY_ISSUE ---\n');
    console.log(formatProbeReport(results));
    if (sources.length > 0) {
      console.log(`\n--- источники обоснования ---\n\n${formatOriginSummary(sources)}`);
    }
    const stale = results.filter((r) => r.staleRegistry);
    if (stale.length > 0) {
      console.log(
        `\n⚠ Реестр протух: код есть, issue открыт (${stale.length}). Это НАХОДКА — закрой issue вручную,` +
          '\n  гейт этого не делает намеренно: автопочинка скрыла бы расхождение.',
      );
    }
  }

  if (hasViolatedAssertion(results)) {
    console.error(
      '\nПОСЫЛКА НАРУШЕНА: план строится на утверждении, которое опровергается кодом.' +
        '\nГенерация магистрали заблокирована — пересмотри развилку.' +
        '\nЖивой прецедент: 16.07 план звал написать fuseDetectorConfidences, слитый 13.07.',
    );
    if (cli.force) {
      // Обход разрешён консилиумом только со СЛЕДОМ: молчаливый --force запрещён,
      // иначе гейт превращается в формальность, которую привычно продавливают.
      console.error(
        '\n--force: гейт продавлен. Обязательно: пометка «посылки не проверены» в теле' +
          '\nMAIN_DAY_ISSUE и запись в резюме дня. Без следа обход считается нарушением нормы.',
      );
      return 0;
    }
    return 2;
  }
  return 0;
}

// ESM-эквивалент require.main === module
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('main-day-probe.mjs')) {
  process.exit(main());
}
