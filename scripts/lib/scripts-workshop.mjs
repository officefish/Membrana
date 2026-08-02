/**
 * Мастерская скриптов — ядро двух глаголов из [`CONTRACT.md §4`](../../docs/meeting/workshop-wires/CONTRACT.md).
 *
 * `orphans` — прямой ответ «бесхозные есть или нет». `setsOf` — обратный поиск «в каких
 * наборах лежит файл». Оба — **соседние** глаголы контура, не замена `tooling:overview`
 * и `scripts:registry`.
 *
 * СТАТУС §4 — ЗАЯВКА. Сверка [`RECONCILE_M3`](../../docs/meeting/workshop-wires/RECONCILE_M3.md)
 * показала: `scripts/` станет домом только после поправки к §3 (корень обхода мастерских
 * зашит на `docs/`). Пока поправки нет, `orphans` честно назовёт сиротами почти весь дом —
 * и это правдивый ответ на вопрос «припарковано ли», а не дефект глагола. Подкручивать его
 * «чтобы было зелено» запрещено: ровно так и рождается прибор, которому никто не верит.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { belongs, normalizePath } from './belongs.mjs';

/** Исходы обратного поиска (§4, список ЗАКРЫТ). */
export const SETS_OF_OUTCOMES = Object.freeze({
  FOUND: 'found',
  FOUND_MULTI: 'found_multi',
  NOT_IN_ANY_SET: 'not_in_any_set',
  UNKNOWN_PATH: 'unknown_path',
});

/**
 * Три молчания (§4). Схлопывать в пустой список запрещено: «кит объявлен, членов нет»,
 * «кита с таким id нет» и «файл проверен, ни в одном наборе» — три разных факта, и только
 * первые два говорят о ките, а третий о файле.
 */
export const SILENCES = Object.freeze({
  SET_EMPTY: 'set_empty',
  NOT_DECLARED: 'not_declared',
  NOT_IN_ANY_SET: 'not_in_any_set',
});

/** Статусы прямого ответа (§4). */
export const ORPHANS_STATUS = Object.freeze({ CLEAN: 'clean', HAS_ORPHANS: 'has_orphans' });

/** Носители мастерской: инструменты ∪ тесты (§2 — знаменатель, тесты не выкидываются). */
const CARRIER_RE = /\.mjs$/u;

/** Каталоги, в которые обход не заходит. */
const SKIP_DIRS = new Set(['node_modules', '.git', 'cache', 'dist', 'coverage']);

/**
 * Носители дома `scripts/`.
 * @param {string} repoRoot
 * @param {{includeTests?: boolean}} [opts]
 * @returns {string[]} пути от корня репозитория, слеши вперёд
 */
export function listCarriers(repoRoot, opts = {}) {
  const { includeTests = true } = opts;
  const root = join(repoRoot, 'scripts');
  const out = [];
  if (!existsSync(root)) return out;
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name));
      } else if (CARRIER_RE.test(e.name)) {
        const rel = normalizePath(relative(repoRoot, join(dir, e.name)));
        if (includeTests || !rel.endsWith('.test.mjs')) out.push(rel);
      }
    }
  };
  walk(root);
  return out.sort();
}

/** Дома репозитория: каталоги с `workshop.manifest.json`, включая корневые (§4). */
export function listHomes(repoRoot) {
  const homes = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name));
      } else if (e.name === 'workshop.manifest.json') {
        homes.push(normalizePath(relative(repoRoot, dir)) || '.');
      }
    }
  };
  for (const top of ['docs', 'scripts']) {
    const p = join(repoRoot, top);
    if (existsSync(p) && statSync(p).isDirectory()) walk(p);
  }
  return homes.sort();
}

/**
 * Глагол первый — прямой ответ «бесхозные есть или нет».
 *
 * Бесхозный — **только** `belongs(s) = orphan`. Не «вне китов» и не «вне pins»: §4 запрещает
 * подмену определения, потому что членство в ките есть поставка, а не принадлежность.
 *
 * Пустой ответ ВСЕГДА со статусом и знаменателем. Молчаливый пустой список — запрет §4:
 * он читается как «чисто», хотя может значить «обход не нашёл ни одного носителя».
 *
 * ПРИЧИНА ДОНОСИТСЯ ДО ВЫЗЫВАЮЩЕГО. Предикат называет причину исхода (`ORPHAN_REASONS`)
 * ровно затем, чтобы «сирота» не была неотличима от «предикат не справился», — а этот глагол
 * до 02.08 её выбрасывал фильтром по `kind` и отдавал голый список путей. Цена молчания
 * замерена: 51 сирота из 1000, все до единой по `subject_unresolved`, по `no_rule` — ноль,
 * и отчёт при этом три дня подряд называл причиной отсутствие правил членства. Читатель шёл
 * чинить реестр вместо резолвера предмета.
 *
 * `orphans` остаётся списком СТРОК: на него смотрят соседи и `--json`. Вердикты и сводка
 * добавлены рядом, а не вместо, — расширение формы, не смена.
 *
 * @returns {{status:string, orphans:string[], verdicts:{path:string, reason:string}[],
 *   byReason:Record<string, number>, counted:number, denominator:number}}
 */
export function orphans(repoRoot, ctx = {}) {
  const { includeTests = true, homes = listHomes(repoRoot), namespaces = [] } = ctx;
  const carriers = listCarriers(repoRoot, { includeTests });
  const exists = (p) => existsSync(join(repoRoot, p));
  const verdicts = [];
  for (const path of carriers) {
    const v = belongs(path, { homes, namespaces, exists });
    if (v.kind === 'orphan') verdicts.push({ path, reason: v.reason });
  }
  const byReason = {};
  for (const { reason } of verdicts) byReason[reason] = (byReason[reason] ?? 0) + 1;
  return {
    status: verdicts.length === 0 ? ORPHANS_STATUS.CLEAN : ORPHANS_STATUS.HAS_ORPHANS,
    orphans: verdicts.map((v) => v.path),
    verdicts,
    byReason,
    counted: verdicts.length,
    denominator: carriers.length,
  };
}

/** Прочитать манифесты китов: `kits/<id>/MANIFEST.json`. */
export function readKits(repoRoot) {
  const dir = join(repoRoot, 'kits');
  if (!existsSync(dir)) return [];
  const kits = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const manifest = join(dir, e.name, 'MANIFEST.json');
    if (!existsSync(manifest)) continue;
    try {
      const doc = JSON.parse(readFileSync(manifest, 'utf8'));
      kits.push({
        id: typeof doc?.id === 'string' ? doc.id : e.name,
        roots: (doc?.roots ?? []).map(normalizePath),
        pins: Object.keys(doc?.pins ?? {}).map(normalizePath),
      });
    } catch {
      // Битый манифест кита — не повод ронять обратный поиск целиком: он ответит по
      // остальным китам, а порча кита есть предмет проверки китов, не этого глагола.
    }
  }
  return kits.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

/**
 * Глагол второй — обратный поиск «в каких наборах лежит файл».
 *
 * Набором считается **только кит** (§4): не неймспейс и не дом. Членство — `roots ∪ pins`;
 * дубликат внутри одного кита даёт ОДИН `SetRef`, иначе один и тот же кит выглядел бы
 * двумя наборами и `found` подменился бы на `found_multi`.
 *
 * `found_multi` — не ошибка, а факт: файл законно состоит в нескольких китах.
 *
 * @returns {{path:string, sets:{kind:'kit',id:string}[], outcome:string}}
 */
export function setsOf(repoRoot, rawPath, ctx = {}) {
  const path = normalizePath(rawPath);
  const { kits = readKits(repoRoot) } = ctx;
  if (path === '' || !existsSync(join(repoRoot, path))) {
    // «Пути нет» отделено от «путь есть, наборов нет» намеренно: слить их значит ответить
    // «ни в одном наборе» на опечатку в имени файла.
    return { path, sets: [], outcome: SETS_OF_OUTCOMES.UNKNOWN_PATH };
  }
  const sets = kits
    .filter((k) => k.roots.includes(path) || k.pins.includes(path))
    .map((k) => ({ kind: /** @type {'kit'} */ ('kit'), id: k.id }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const outcome = sets.length === 0
    ? SETS_OF_OUTCOMES.NOT_IN_ANY_SET
    : sets.length === 1 ? SETS_OF_OUTCOMES.FOUND : SETS_OF_OUTCOMES.FOUND_MULTI;
  return { path, sets, outcome };
}

/**
 * Молчание КОНКРЕТНОГО набора — вторая сторона §4, отличающая «кита нет» от «кит пуст».
 * @returns {{id:string, silence:string|null, members:string[]}}
 */
export function inspectSet(repoRoot, id, ctx = {}) {
  const { kits = readKits(repoRoot) } = ctx;
  const kit = kits.find((k) => k.id === id);
  if (kit === undefined) return { id, silence: SILENCES.NOT_DECLARED, members: [] };
  const members = [...new Set([...kit.roots, ...kit.pins])].sort();
  return { id, silence: members.length === 0 ? SILENCES.SET_EMPTY : null, members };
}
