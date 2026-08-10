/**
 * vitest-workspace — граф воркспейса и отбор яруса `smoke` корпуса vitest
 * (блок b1 спринта `vitest-two-tier-gate`, карточка `cg2-two-tier-test-gate`).
 *
 * ДОМ ЯДРА — LIB, а CLI (`scripts/vitest-smoke-list.mjs`) тонкий: ровно идиома соседа
 * `scripts/tests-container.mjs` над `scripts/lib/tests-container.mjs`. Потребителей у
 * открытия пакетов двое — сам каталог smoke и провод мердж-гейта; будь ядро внутри
 * скрипта, второй потребитель полез бы импортом скрипт-к-скрипту, а это «тайное API»
 * (разбор в шапке `lib/sprint-cut/acts-trail-reader.mjs`).
 *
 * ВТОРАЯ СЛОВАРНАЯ СТАТЬЯ, НЕ РАСШИРЕНИЕ ПЕРВОЙ. «Test gate» — омоним: контейнер ADR-0018
 * стоит над корпусом scripts (`tests/test-scripts.catalog.json`, suffix `.test.mjs`), здесь —
 * корпус vitest (`packages/*`, `apps/*`). Общего кода нет намеренно: разные единицы (файл
 * против пакета) и разные графы (относительные импорты против зависимостей воркспейса).
 *
 * ПОЧЕМУ ФАН-ИН, А НЕ ЗАМЫКАНИЕ ОТ КЛИЕНТА. Первый предложенный признак — объединение
 * зависимостей `apps/client` и `packages/background-*` — посчитан по дереву 10.08 и дал
 * 27 пакетов из 38 (71% корпуса). Ярус, который не сужает, цели карточки не достигает.
 * Замер на 25 последних merge-коммитах показал настоящий рычаг: медиана affected — ОДИН
 * пакет, 10 мерджей из 25 не трогают пакеты вовсе. Значит сужает affected-селекция
 * (`lib/vitest-gate-scope.mjs`), а `smoke` нужен лишь как страховка от СИСТЕМНОГО слома.
 *
 * ГЕЙТ НЕ ЗАВИСИТ ОТ ТОГО, ЧТО ГЕЙТИТ (требование резчика): читаются только `package.json`-ы,
 * ни один модуль из `packages/*` не импортируется, сети нет, часов нет. Иначе поломка в
 * гейтимом пакете ломала бы сам гейт, и красный стал бы неотличим от отказа прибора.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Порог транзитивного фан-ина: пакет входит в `smoke`, если от него зависит СТОЛЬКО ИЛИ
 * БОЛЬШЕ пакетов воркспейса.
 *
 * Десять — не круглое число из головы, а место обрыва в графе на 10.08:
 * core 27 · audio-engine 16 · detector-base 11 · ЗДЕСЬ ОБРЫВ · fft-analyzer 9 · trends 6.
 * Порог назван константой, чтобы смена признака была видимой правкой одной строки, а не
 * молчаливым дрейфом списка. Если обрыв исчезнет (хвост станет пологим сплошь), признак
 * придётся пересматривать целиком — фан-ин перестанет отделять системное от рядового,
 * и никакое значение порога этого не починит.
 */
export const SMOKE_FANIN_THRESHOLD = 10;

/** Схема каталога. Отдельная от `test-scripts.catalog.json` — корпус другой. */
export const CATALOG_SCHEMA = 'vitest-smoke/1';

/** Адрес каталога в дереве. Дом яруса — `tests/`, как велит ADR-0018 пункт 5. */
export const CATALOG_REL = 'tests/vitest-smoke.catalog.json';

/**
 * Каталоги воркспейса по глобам корневого `package.json`.
 *
 * Открытие идёт по `workspaces`, а НЕ свободным обходом дерева: обход находит
 * `packages/background-cabinet/generated/prisma` и `.../background-media/...` —
 * сгенерированные клиенты Prisma со своим `name`, членами воркспейса не являющиеся.
 *
 * Поддержано ровно то, что в глобах и встречается: `dir/*` и литеральный путь. Экзотика
 * (`**`, `{a,b}`) не раскрывается — это признанный предел, и он заявлен ошибкой входа,
 * а не молчаливым пропуском каталога.
 */
export function expandWorkspaceGlobs(globs, io) {
  const out = [];
  const problems = [];
  for (const glob of globs) {
    const g = String(glob).split('\\').join('/');
    if (g.includes('**') || g.includes('{')) {
      problems.push(`глоб «${g}» не раскрывается: поддержаны только «dir/*» и литеральный путь`);
      continue;
    }
    if (!g.endsWith('/*')) {
      if (io.exists(g)) out.push(g);
      continue;
    }
    const base = g.slice(0, -2);
    if (!io.exists(base)) continue;
    for (const name of io.readdir(base)) {
      const dir = `${base}/${name}`;
      if (io.exists(`${dir}/package.json`)) out.push(dir);
    }
  }
  return { dirs: out.sort(), problems };
}

/**
 * Пакеты воркспейса значением: имя, каталог, есть ли скрипт `test`, зависимости.
 * `devDependencies` НЕ учитываются: сборочный инструмент в devDeps не делает пакет
 * системным, а нас интересует, чей слом ломает чужой РАНТАЙМ.
 */
export function readWorkspacePackages(dirs, io) {
  const packages = [];
  const problems = [];
  for (const dir of dirs) {
    const file = `${dir}/package.json`;
    let json;
    try {
      json = JSON.parse(io.read(file));
    } catch {
      problems.push(`${file}: не разбирается как JSON`);
      continue;
    }
    if (typeof json.name !== 'string' || json.name.trim() === '') {
      problems.push(`${file}: пакет без имени — в граф не встаёт`);
      continue;
    }
    packages.push({
      name: json.name,
      dir,
      hasTest: typeof json.scripts?.test === 'string' && json.scripts.test.trim() !== '',
      deps: Object.keys({ ...(json.dependencies ?? {}), ...(json.peerDependencies ?? {}) }),
    });
  }
  return { packages, problems };
}

/**
 * Обратный граф: имя → кто зависит НАПРЯМУЮ. Зависимости вне воркспейса отброшены —
 * фан-ин считается по своим, внешний `react` о системности пакета не говорит ничего.
 */
export function buildDependents(packages) {
  const own = new Set(packages.map((p) => p.name));
  const dependents = new Map();
  for (const p of packages) {
    for (const dep of p.deps) {
      if (!own.has(dep)) continue;
      dependents.set(dep, [...(dependents.get(dep) ?? []), p.name].sort());
    }
  }
  return dependents;
}

/**
 * Транзитивный фан-ин: сколько пакетов зависит от этого прямо или через цепочку.
 * Обход через `seen` — цикл в графе даёт конечный ответ, а не зависание: воркспейс
 * циклов не обязан не иметь, и падение прибора на цикле было бы отказом гейта.
 * Сам пакет в счёт не входит.
 */
export function transitiveFanIn(dependents, name) {
  const seen = new Set();
  const queue = [...(dependents.get(name) ?? [])];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === name || seen.has(cur)) continue;
    seen.add(cur);
    for (const next of dependents.get(cur) ?? []) if (!seen.has(next)) queue.push(next);
  }
  return seen.size;
}

/**
 * Отбор яруса. Возвращает и соседей у порога (`ranking`) — иначе порог придётся принимать
 * на веру, а обрыв проверять руками.
 *
 * Пакет без скрипта `test` в ярус не попадает даже при большом фан-ине: гонять нечего.
 * Это не «прошёл», а «нечего запускать» — такой пакет уходит в `withoutTests` под своим
 * именем, потому что системный пакет БЕЗ тестов есть отдельная новость, а не пустое место.
 */
export function selectSmoke(packages, threshold = SMOKE_FANIN_THRESHOLD) {
  const dependents = buildDependents(packages);
  const scored = packages
    .map((p) => ({ name: p.name, fanIn: transitiveFanIn(dependents, p.name), hasTest: p.hasTest }))
    .sort((a, b) => b.fanIn - a.fanIn || a.name.localeCompare(b.name));

  const above = scored.filter((r) => r.fanIn >= threshold);
  return {
    threshold,
    smoke: above.filter((r) => r.hasTest).map((r) => r.name),
    withoutTests: above.filter((r) => !r.hasTest).map((r) => r.name),
    corpus: packages.filter((p) => p.hasTest).map((p) => p.name).sort(),
    ranking: scored.filter((r) => r.fanIn > 0).map((r) => ({ name: r.name, fanIn: r.fanIn })),
  };
}

/** Тело каталога. Порядок ключей и сортировки фиксированы: диффы должны быть читаемыми. */
export function renderCatalog(selection) {
  return {
    $schema: CATALOG_SCHEMA,
    generatedBy: 'scripts/vitest-smoke-list.mjs',
    criterion: `транзитивный фан-ин >= ${selection.threshold} по dependencies+peerDependencies воркспейса`,
    threshold: selection.threshold,
    smoke: [...selection.smoke].sort(),
    withoutTests: [...selection.withoutTests].sort(),
    corpusSize: selection.corpus.length,
    ranking: selection.ranking,
  };
}

/** ФС только здесь; ядро выше остаётся чистым и подменяемым. */
export function defaultIo(root) {
  const at = (rel) => join(root, rel);
  return {
    exists: (rel) => existsSync(at(rel)),
    read: (rel) => readFileSync(at(rel), 'utf8'),
    readdir: (rel) => readdirSync(at(rel), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name),
  };
}

/** Разбор дерева одним вызовом. */
export function computeSelection(root, io = defaultIo(root), threshold = SMOKE_FANIN_THRESHOLD) {
  let rootPkg;
  try {
    rootPkg = JSON.parse(io.read('package.json'));
  } catch {
    return { ok: false, problems: ['package.json корня не разбирается как JSON'] };
  }
  const globs = Array.isArray(rootPkg.workspaces) ? rootPkg.workspaces : rootPkg.workspaces?.packages;
  if (!Array.isArray(globs) || globs.length === 0) {
    return { ok: false, problems: ['в корневом package.json нет поля workspaces — граф строить не из чего'] };
  }
  const expanded = expandWorkspaceGlobs(globs, io);
  const read = readWorkspacePackages(expanded.dirs, io);
  const problems = [...expanded.problems, ...read.problems];
  if (read.packages.length === 0) problems.push('пакетов воркспейса не найдено');
  if (problems.length) return { ok: false, problems };
  return { ok: true, selection: selectSmoke(read.packages, threshold), packages: read.packages };
}
