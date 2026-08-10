/**
 * vitest-gate-scope — что мердж-гейт корпуса vitest гоняет на этом изменении и, главное,
 * ЧТО ОН НЕ ГОНЯЕТ (блок b2 спринта `vitest-two-tier-gate`, карточка `cg2-two-tier-test-gate`).
 *
 * ЧИСТОЕ ЯДРО: ни git, ни turbo, ни ФС, ни часов. Список изменённых файлов приходит
 * значением, пакеты приходят значением, ярус smoke приходит значением. Вызов turbo и
 * добыча diff живут в проводе (b3) — гейт, падающий вместе с тем, что он гейтит, не гейт.
 *
 * ПОЧЕМУ НЕ `turbo --filter='...[base]'` НАПРЯМУЮ. Это поправка резчика, и она по существу:
 * turbo метит пакет affected по ЛЮБОМУ изменённому файлу, включая markdown. Дефект #1168 —
 * правка `packages/device-board/DEVICE_BOARD_CONCEPT.md` метила device-board, `...` тянул
 * зависимых, их `^build` звал `vite` (не поставлен в воркспейсе), exit 127, push заблокирован;
 * сессия 24.07 форсила `--no-verify`, минуя заодно gitleaks. Поэтому список пакетов считается
 * ЗДЕСЬ, по отфильтрованным файлам, и уже он отдаётся turbo именами.
 *
 * ЧТО ОСТАЁТСЯ ЗА turbo. Транзитивное расширение «пакет и его зависимые» не дублируется:
 * фильтр `...<name>` турбо раскрывает сам по графу воркспейса, который он и так держит.
 * Свой второй граф здесь был бы ещё одним носителем той же истины — и разъехался бы.
 *
 * ОТЧЁТ «ЧТО НЕ ГОНЯЛОСЬ» — НЕ УКРАШЕНИЕ. ADR-0018: «выборочный гейт легален только вместе
 * с отчётом об исключённом», иначе решение узаконивает ровно тот дефект, который нашёлся
 * случайно 26.07 — 11 тестов в `scripts/lib/**` (81 проверка) не гонялись в CI неизвестно
 * сколько недель, и зелёный продолжал выглядеть полным. Поэтому `notRunPackages` считает
 * остаток не от НАМЕРЕНИЯ, а от того, что turbo реально прогнал (`--dry`): отчёт, выведенный
 * из плана, соврал бы вместе с планом.
 */
import { GLOBAL_CONFIGS, nonDocsFiles, touchesGlobalConfig } from './changed-files-scope.mjs';

export { GLOBAL_CONFIGS };

/** Режимы скоупа. Список закрыт: «прочее» здесь означало бы необъяснённый прогон. */
export const SCOPE_MODES = Object.freeze(['full', 'scoped', 'floor']);

const slash = (p) => String(p).split('\\').join('/');

/**
 * Пакеты, внутри которых лежит хотя бы один изменённый файл. Сравнение посегментное:
 * `packages/core-extras/x.ts` НЕ принадлежит `packages/core` — префикс без границы `/`
 * дал бы ложное попадание и раздул бы скоуп молча.
 */
export function directPackages(files, packages) {
  const hit = new Set();
  for (const f of files.map(slash)) {
    for (const p of packages) {
      const dir = slash(p.dir);
      if (f === dir || f.startsWith(`${dir}/`)) hit.add(p.name);
    }
  }
  return [...hit].sort();
}

/**
 * План мердж-гейта.
 *
 * Ярус `smoke` — ПОЛ, а не одна из веток: он в прогоне всегда. Мердж-гейт, который на
 * docs-правке не гоняет вовсе ничего, выдаёт зелёный, не утверждающий ничего; три пакета
 * с наибольшим фан-ином — цена того, чтобы зелёный оставался утверждением. Поэтому
 * `mode: 'floor'` означает «затронутых пакетов нет, идёт только пол», а НЕ «пропускаем».
 *
 * @param {{changedFiles: string[], packages: Array<{name: string, dir: string, hasTest: boolean}>,
 *          smoke: string[], globalConfigs?: readonly string[]}} input
 * @returns {{mode: 'full'|'scoped'|'floor', reason: string, scope: string[], filters: string[]}}
 */
export function planVitestGate({ changedFiles, packages, smoke, globalConfigs = GLOBAL_CONFIGS }) {
  const testable = packages.filter((p) => p.hasTest);
  const floor = [...new Set(smoke)].sort();
  const nonDocs = nonDocsFiles(changedFiles ?? []);

  if (touchesGlobalConfig(nonDocs, globalConfigs)) {
    return withHazard({
      mode: 'full',
      reason: `изменён корневой конфиг (${globalConfigs.join(' · ')}) — затронут весь воркспейс`,
      scope: testable.map((p) => p.name).sort(),
      filters: [],
    });
  }

  // Пакет БЕЗ скрипта `test` из скоупа НЕ выпадает. Своих тестов у него нет, но у его
  // зависимых они есть, и сломать их он может ровно так же. Ревью 10.08 поймало обратное
  // поведение живым замером: правка `packages/libs/audioDataViz/**` давала `mode=floor,
  // прогнано 3 из 38`, а зависящий от неё `@membrana/client` со своими тестами уходил в
  // «не гонялось». Фильтр `...<name>` на пакете без задачи `test` законен: turbo прогонит
  // зависимых, а сам пакет пропустит.
  const scope = directPackages(nonDocs, packages);

  if (scope.length === 0) {
    const reason =
      nonDocs.length === 0
        ? 'изменения только в .md/.mdx — код не затронут, идёт пол smoke'
        : 'изменения вне пакетов воркспейса (корневые скрипты, доки, CI) — идёт пол smoke';
    return withHazard({ mode: 'floor', reason, scope: [], filters: floor.map((n) => `--filter=${n}`) });
  }

  // `...<name>` — пакет И его зависимые; раскрывает turbo по своему графу.
  //
  // ДЕДУП ИДЁТ В СТОРОНУ ПОЛА, А НЕ СКОУПА. Пакет, который И затронут, И стоит в полу,
  // обязан получить `...` — иначе его зависимые молча выпадут. Живой прогон 10.08 поймал
  // ровно это: правка `detectors/base` дала «прогнано 3 из 38» (один лишь пол), и
  // одиннадцать зависимых detector-base не гонялись, хотя изменён был именно их фундамент.
  // Обратный дедуп выглядел безобиднее и был тем самым тихим сужением набора, против
  // которого написано условие честности ADR-0018.
  const scoped = new Set(scope);
  const filters = [
    ...floor.filter((n) => !scoped.has(n)).map((n) => `--filter=${n}`),
    ...scope.map((n) => `--filter=...${n}`),
  ];
  const silent = scope.filter((n) => !testable.some((p) => p.name === n));
  const tail = silent.length ? ` · своих тестов нет у: ${silent.join(', ')} — идут зависимые` : '';
  return withHazard({
    mode: 'scoped',
    reason: `затронуто пакетов: ${scope.length} (плюс их зависимые и пол smoke)${tail}`,
    scope,
    filters,
  });
}

/**
 * ПУСТОЙ СПИСОК ФИЛЬТРОВ ЧИТАЕТСЯ turbo КАК «ГОНЯТЬ ВСЁ» — и это опаснее, чем кажется:
 * прогон всего корпуса приехал бы в отчёт под шапкой `mode=floor · прогнано 40 из 38`,
 * то есть отчёт о выборке соврал бы в сторону, обратную обычной. Такое бывает ровно при
 * пустом ярусе smoke — случай, который шапка `vitest-workspace.mjs` прямо допускает
 * (обрыв в графе может исчезнуть). Поэтому опасность объявляется полем, а потребитель
 * обязан на ней остановиться, а не «просто прогнать больше».
 */
function withHazard(plan) {
  return { ...plan, runsEverything: plan.mode !== 'full' && plan.filters.length === 0 };
}

/**
 * Остаток корпуса — то, что мердж-гейт НЕ прогнал. Считается от фактически прогнанного,
 * а не от плана: план и факт расходятся ровно там, где отчёт нужнее всего.
 *
 * Пустой список — утверждение «прогнан весь корпус», и оно должно быть ЗАРАБОТАНО.
 * @param {string[]} corpus все пакеты со скриптом `test`
 * @param {string[]} ran имена, которые turbo действительно взял в работу
 */
export function notRunPackages(corpus, ran) {
  const done = new Set(ran);
  return [...new Set(corpus)].filter((n) => !done.has(n)).sort();
}

/**
 * Строки отчёта для job summary. Тихо пустой результат запрещён (дефект №3 паттерна
 * HOME_WORKSHOP — «немой отказ оснастки»): когда не прогнано НИЧЕГО, это тоже строка.
 */
export function formatNotRunReport({ mode, reason, ran, notRun, corpusSize }) {
  const head = `vitest merge gate: mode=${mode} · прогнано ${ran.length} из ${corpusSize} · ${reason}`;
  if (notRun.length === 0) return `${head}\nnot run in merge gate: — (прогнан весь корпус)`;
  return [head, ...notRun.map((n) => `not run in merge gate: ${n} — reason: вне скоупа изменений и вне яруса smoke`)].join('\n');
}
