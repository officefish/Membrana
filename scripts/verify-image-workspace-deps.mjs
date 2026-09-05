#!/usr/bin/env node
/**
 * verify:image-workspace-deps — зуб против «висячего симлинка в образе».
 *
 * ПОЧЕМУ ОН ЕСТЬ. Runtime-стадия Dockerfile'ов `background-*` копирует `dist` workspace-пакетов
 * ПОИМЁННЫМ списком, а `node_modules/@membrana/*` в образе — симлинки в `/app/packages/*`.
 * Пакет, которого нет в списке, даёт висячую ссылку: сборка зелёная, старт зелёный до первого
 * импорта, а потом `ERR_MODULE_NOT_FOUND` уже на проде. Вещдок 21.08: PR #2041 добавил в
 * `plugin-handlers` импорт `@membrana/fft-analyzer-service`, список отстал, media ушёл в
 * restart-loop; откат по метке образа (`docs/deploy/deploy-2026-08-21-media.md`).
 *
 * Смежный сторож `App DI smoke` (#2009) этот класс НЕ ловит по построению: он судит граф DI на
 * полных `node_modules` дерева — то есть «граф собирается», а не «файлы есть в образе».
 *
 * ЧТО ИМЕННО ПРОВЕРЯЕТСЯ: транзитивный граф workspace-зависимостей сервиса (из `package.json`,
 * не на глаз) ⊆ множество путей, которые runtime-стадия копирует. Обратное включение НЕ
 * требуется: лишняя копия — вес, а не ложь.
 *
 * Usage:
 *   node scripts/verify-image-workspace-deps.mjs                 # все объявленные сервисы
 *   node scripts/verify-image-workspace-deps.mjs --service media # один
 *   node scripts/verify-image-workspace-deps.mjs --json
 *
 * Exit: 0 — граф покрыт · 1 — есть непокрытые пакеты · 2 — ошибка входа.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { workspaceSearchPaths } from './lib/workspace-dirs.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Сервисы, чей образ несёт workspace-пакеты. Дом списка — здесь, рядом с предикатом. */
export const IMAGE_SERVICES = Object.freeze([
  { id: 'media', pkg: 'packages/background-media', dockerfile: 'packages/background-media/Dockerfile', stage: 'runtime' },
  // Кабинет внесён 22.08 после падения сборки на @membrana/plugin-contracts@npm:* (404): зуб
  // честно проверял то, что ему поручили, и молчал про всё остальное. Список из одного сервиса
  // ловит один сервис — класс чинится внесением, а не разбором случая.
  {
    id: 'cabinet',
    pkg: 'packages/background-cabinet',
    dockerfile: 'packages/background-cabinet/Dockerfile',
    stage: 'runtime',
    /*
      ДАННЫЕ, А НЕ КОД — второй способ, которым образ бывает неполон (#2287, прод 04.09).
      Симлинки тут ни при чём: файл в git, пакет собран, старт зелёный — и `grid_unavailable`
      на каждой попытке открыть тариф. Витрина #2286 это лишь вскрыла: промокод отвечал так же
      и молча с 29.07. Класс тот же, что у висячего симлинка, — «сборка зелёная, падение на
      проде», — поэтому живёт в этом же стороже, а не во втором рядом.
    */
    runtimeReads: [
      {
        constantsFrom: 'packages/background-cabinet/src/domain/tariff-grid-source.ts',
        why: 'сетка тарифов — носитель прав; без неё витрина и промокод отвечают grid_unavailable',
      },
    ],
  },
  // Офис 28.08: дом существовал с самого начала, а в списке его не было — та же дыра охвата.
  { id: 'office', pkg: 'packages/background-office', dockerfile: 'packages/background-office/Dockerfile', stage: 'runtime' },
  /*
    ВЕБ-ОБРАЗ КАБИНЕТА, 28.08 — и это не «ещё одна строка», а признание, что внесение по
    одному не работает.

    27.08 повторился ТОТ ЖЕ дефект НА ТОМ ЖЕ пакете, что и 22.08: `media-library` получил
    зависимость `@membrana/plugin-contracts`, `apps/cabinet/Dockerfile` её не копирует, yarn
    считает пакет внешним и падает 404. Пять вершин ствола красные. 22.08 этот класс закрыли
    внесением `packages/background-cabinet` — то есть починили дом, а не охват; `apps/*` в
    поле зрения зуба не было вовсе.

    СТАДИЯ У ВЕБ-ОБРАЗА ДРУГАЯ, и потому мало было дописать путь. У `background-*` рабочие
    пакеты нужны в runtime-стадии (симлинки `node_modules/@membrana/*` ведут в `/app/packages`).
    У веб-образа runtime — это nginx с готовым `dist`, а пакеты нужны СТАДИИ СБОРКИ: не
    скопировал в build — нечего собирать. Проверять у него runtime бессмысленно: там их не
    будет никогда, и зуб краснел бы всегда.
  */
  { id: 'cabinet-web', pkg: 'apps/cabinet', dockerfile: 'apps/cabinet/Dockerfile', stage: 'build' },
]);

/**
 * Каталоги воркспейсов — у корневого манифеста, а не копией.
 *
 * Копия «совпадала с workspaces» только на словах: корень объявляет ещё
 * `apps/demos/Research-Tree`, и этого пакета сторож не видел (ревью #2233).
 */
const SEARCH = workspaceSearchPaths(JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')));

/** Карта «имя пакета → {dir, deps}». Читает ФС один раз; ядро ниже работает значением. */
export function readWorkspaceMap(root = ROOT) {
  const map = {};
  const put = (dir) => {
    const pkgPath = join(resolve(root, dir), 'package.json');
    if (!existsSync(pkgPath)) return;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (typeof pkg.name !== 'string') return;
    map[pkg.name] = {
      dir,
      deps: Object.keys(pkg.dependencies ?? {}).filter((d) => d.startsWith('@membrana/')),
    };
  };
  for (const parent of SEARCH.parents) {
    const abs = resolve(root, parent);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.isDirectory()) put(`${parent}/${entry.name}`);
    }
  }
  for (const exact of SEARCH.packages) put(exact);
  return map;
}

/** Транзитивное замыкание workspace-зависимостей — чистая функция над картой. */
export function transitiveWorkspaceDeps(map, rootPkgName) {
  const seen = new Set();
  const queue = [...(map[rootPkgName]?.deps ?? [])];
  while (queue.length > 0) {
    const name = queue.shift();
    if (seen.has(name) || !map[name]) continue;
    seen.add(name);
    queue.push(...map[name].deps);
  }
  return [...seen].sort();
}

function runtimeStageTail(dockerfileText) {
  const runtimeStart = dockerfileText.search(/^FROM\s+\S+\s+AS\s+runtime\b/mu);
  return runtimeStart === -1 ? dockerfileText : dockerfileText.slice(runtimeStart);
}

function dockerfileWords(line) {
  return [...line.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/gu)].map((m) => m[1] ?? m[2] ?? m[3]);
}

function normalizeDockerfileSource(src) {
  return src.replace(/^\/app\//u, '').replace(/\\/gu, '/').replace(/^\.\//u, '').replace(/\/$/u, '');
}

/**
 * Источники COPY-инструкций Dockerfile.
 *
 * `localOnly` оставляет только COPY из build context (без `--from`): это ровно то, что
 * локальная грязь может ложно казаться «уезжающим в прод», хотя сервер соберёт origin/main.
 * `runtimeOnly` берёт только runtime-стадию для зуба состава образа.
 */
export function dockerfileCopySources(dockerfileText, options = {}) {
  return dockerfileCopyPairs(dockerfileText, options).map((pair) => pair.source);
}

/**
 * COPY-инструкции ПАРАМИ «источник → назначение».
 *
 * Заведено #2287: зуб состава образа судил только источники, а вопрос «найдёт ли рантайм файл»
 * решает НАЗНАЧЕНИЕ. `COPY docs/tariffs docs/tariffs` при `WORKDIR /app/packages/background-cabinet`
 * кладёт каталог ВНУТРЬ пакета, а резолвер идёт вверх — источник тот же, поведение
 * противоположное. Разбор одних источников такую правку пропустил бы молча.
 *
 * `destination` сохраняется КАК НАПИСАНО: относительный остаётся относительным, потому что куда
 * он разрешится — знает только WORKDIR, действующий на этой строке. Это дело вызывающего.
 */
export function dockerfileCopyPairs(dockerfileText, { runtimeOnly = false, localOnly = false } = {}) {
  const body = runtimeOnly ? runtimeStageTail(dockerfileText) : dockerfileText;
  const pairs = [];
  for (const raw of body.split(/\r?\n/u)) {
    const line = raw.trim();
    if (!/^COPY\s/u.test(line)) continue;
    const tokens = dockerfileWords(line.replace(/^COPY\s+/u, ''));
    let i = 0;
    let hasFrom = false;
    while (i < tokens.length && tokens[i].startsWith('--')) {
      const flag = tokens[i];
      if (flag === '--from') {
        hasFrom = true;
        i += 2;
      } else {
        if (flag.startsWith('--from=')) hasFrom = true;
        i += 1;
      }
    }
    if (localOnly && hasFrom) continue;
    const positional = tokens.slice(i);
    if (positional.length < 2) continue;
    const destination = positional[positional.length - 1];
    for (const src of positional.slice(0, -1)) {
      const normalized = normalizeDockerfileSource(src);
      if (normalized) pairs.push({ source: normalized, destination, hasFrom });
    }
  }
  return pairs;
}

/** Локальные источники build context: COPY без --from во всём Dockerfile. */
export function copiedLocalBuildSources(dockerfileText) {
  return dockerfileCopySources(dockerfileText, { localOnly: true });
}
/**
 * Пути, которые runtime-стадия Dockerfile действительно копирует.
 *
 * Разбор консервативный: берётся хвост файла ПОСЛЕ последнего `FROM … AS runtime`, оттуда —
 * `COPY --from=… <src> <dst>`.
 *
 * ПОКРЫТИЕМ СЧИТАЕТСЯ ТОЛЬКО КОД: каталог пакета целиком (`packages/x`) либо его сборка
 * (`packages/x/dist`). Один `packages/x/package.json` покрытием НЕ является.
 *
 * Ужесточено 22.08 контрольной пробой. Прежняя версия засчитывала ЛЮБОЙ путь внутри пакета —
 * и образ с манифестом, но без `dist`, проходил зуб зелёным. Это ровно тот висячий симлинк,
 * ради которого зуб заведён: `node_modules/@membrana/x` ведёт в каталог, где `package.json`
 * указывает на `dist/index.js`, которого нет. Сборка зелёная, старт зелёный, падение — на первом
 * импорте, уже на проде.
 *
 * Найдено так: из готового Dockerfile убрана одна строка `COPY … plugin-handlers/dist`, и зуб НЕ
 * покраснел. Предикат, который не краснеет на внесённом дефекте, не удостоверяет ничего.
 */
export function copiedPackageDirs(dockerfileText) {
  const dirs = new Set();
  for (const src of dockerfileCopySources(dockerfileText, { runtimeOnly: true })) {
    const hit = /^(packages\/(?:libs\/|services\/(?:detectors\/)?)?[^/]+)(\/.*)?$/u.exec(src);
    if (!hit) continue;
    const rest = hit[2] ?? '';
    if (rest === '' || rest === '/' || /^\/dist(\/|$)/u.test(rest)) dirs.add(hit[1]);
  }
  return dirs;
}
/** Часть Dockerfile ДО первой runtime-стадии — то, где веб-образ собирается. */
function buildStageHead(dockerfileText) {
  const runtimeStart = dockerfileText.search(/^FROM\s+\S+\s+AS\s+runtime\b/mu);
  return runtimeStart === -1 ? dockerfileText : dockerfileText.slice(0, runtimeStart);
}

/**
 * Каталоги рабочих пакетов, скопированные в стадию СБОРКИ.
 *
 * Покрытием считается каталог целиком (`COPY packages/x packages/x`): стадии сборки нужны
 * исходники, а не `dist` — она их и собирает. Этим правило отличается от runtime-стадии, где
 * покрытием служит именно `dist`.
 */
export function buildStagePackageDirs(dockerfileText) {
  const dirs = new Set();
  for (const src of dockerfileCopySources(buildStageHead(dockerfileText), { localOnly: true })) {
    if (/^(packages\/(?:libs\/|services\/(?:detectors\/)?)?[^/]+|apps\/[^/]+)$/u.test(src)) dirs.add(src);
  }
  return dirs;
}

/**
 * Пакеты, перечисленные в `yarn workspaces focus …` — ВТОРОЙ рукописный список того же образа.
 *
 * Он существует отдельно от COPY и отстаёт независимо: можно скопировать каталог и забыть имя
 * в focus. Поэтому зуб судит оба списка, а не один.
 */
export function focusedWorkspaces(dockerfileText) {
  const names = new Set();
  for (const m of buildStageHead(dockerfileText).matchAll(/yarn\s+workspaces\s+focus\s+([^\n\\]*)/gu)) {
    for (const word of m[1].split(/\s+/u)) {
      if (word.startsWith('@membrana/')) names.add(word);
    }
  }
  return names;
}

/**
 * Рабочий каталог, действующий в конце runtime-стадии.
 *
 * Берётся ПОСЛЕДНИЙ `WORKDIR` этой стадии: именно он станет `cwd` процесса, а от `cwd` и пляшет
 * поиск данных в рантайме. Без него назначения COPY читать нельзя — относительное назначение
 * без WORKDIR ничего не значит.
 */
export function runtimeWorkdir(dockerfileText) {
  const matches = [...runtimeStageTail(dockerfileText).matchAll(/^WORKDIR\s+(\S+)/gmu)];
  const last = matches.at(-1);
  return last ? last[1].replace(/\/$/u, '') : null;
}

/** Абсолютный путь в образе для назначения COPY, с учётом действующего WORKDIR. */
function absoluteInImage(destination, workdir) {
  const clean = destination.replace(/\\/gu, '/').replace(/^\.\//u, '');
  if (clean.startsWith('/')) return clean.replace(/\/$/u, '');
  return `${workdir}/${clean}`.replace(/\/+/gu, '/').replace(/\/$/u, '');
}

/**
 * Куда репозиторный файл ЛЯЖЕТ в образе — или `null`, если он в образ не едет.
 *
 * Семантика docker: `COPY <каталог> <назначение>` кладёт СОДЕРЖИМОЕ каталога в назначение,
 * поэтому к назначению приписывается путь файла ОТНОСИТЕЛЬНО источника. Для источника-файла
 * назначение и есть итоговый путь.
 */
export function imagePathOfRepoFile(repoPath, copyPairs, workdir) {
  for (const pair of copyPairs) {
    if (pair.source === repoPath) return absoluteInImage(pair.destination, workdir);
    if (repoPath.startsWith(`${pair.source}/`)) {
      const rest = repoPath.slice(pair.source.length + 1);
      return `${absoluteInImage(pair.destination, workdir)}/${rest}`;
    }
  }
  return null;
}

/**
 * НАЙДЁТ ЛИ РАНТАЙМ ФАЙЛ В ОБРАЗЕ — модель подъёма резолвера, а не поиск строки COPY глазами.
 *
 * Разница несущая. Проверка «в Dockerfile есть строка про docs/tariffs» — это проверка
 * ПРАВОПИСАНИЯ: она останется зелёной, если назначение сделать относительным, и каталог уедет
 * внутрь пакета, куда резолвер не заглядывает. Здесь же считается ровно то, что делает
 * `resolveGridPath`: подъём по предкам `cwd` не глубже `maxLookupDepth`, на каждом шаге —
 * попытка `<предок>/<lookupPath>`.
 *
 * Возвращает `{ found, imagePath, depth, checked }` — глубина и перебранные пути нужны в тексте
 * находки: «файл в образе есть, но лежит не там» и «файла нет вовсе» лечатся по-разному.
 */
export function runtimeFindsFile({ workdir, copyPairs, repoPath, lookupPath, maxLookupDepth }) {
  const imagePath = imagePathOfRepoFile(repoPath, copyPairs, workdir);
  const checked = [];
  let dir = workdir;
  for (let depth = 0; depth < maxLookupDepth; depth += 1) {
    const candidate = `${dir}/${lookupPath}`.replace(/\/+/gu, '/');
    checked.push(candidate);
    if (imagePath !== null && candidate === imagePath) {
      return { found: true, imagePath, depth, checked };
    }
    const parent = dir.slice(0, dir.lastIndexOf('/')) || '/';
    if (parent === dir) break;
    dir = parent;
  }
  return { found: false, imagePath, depth: null, checked };
}

/**
 * Константы поиска — ИЗ ИСХОДНИКА рантайма, а не переписанные сюда.
 *
 * Копия здесь была бы вторым мнением о том же правиле: смени кто-нибудь путь сетки или глубину
 * подъёма — зуб остался бы зелёным, проверяя вчерашнюю договорённость. Не разобрали исходник —
 * это находка, а не молчаливое умолчание (норма «пустая проверка хуже отсутствующей»).
 */
export function lookupConstantsFromSource(sourceText) {
  const path = /TARIFF_GRID_PATH\s*=\s*['"]([^'"]+)['"]/u.exec(sourceText);
  const depth = /MAX_LOOKUP_DEPTH\s*=\s*(\d+)/u.exec(sourceText);
  if (!path || !depth) return null;
  return { lookupPath: path[1], maxLookupDepth: Number(depth[1]) };
}

/** Находки по данным, которые образ обязан нести (#2287). */
export function runtimeReadFindings(service, dockerfileText, sources) {
  const findings = [];
  for (const need of service.runtimeReads ?? []) {
    const workdir = runtimeWorkdir(dockerfileText);
    if (!workdir) {
      findings.push({ service: service.id, kind: 'unreadable', detail: `в runtime-стадии нет WORKDIR — куда лягут данные, неизвестно` });
      continue;
    }
    const sourceText = sources[need.constantsFrom];
    if (typeof sourceText !== 'string') {
      findings.push({ service: service.id, kind: 'unreadable', detail: `не прочитан источник констант ${need.constantsFrom}` });
      continue;
    }
    const constants = lookupConstantsFromSource(sourceText);
    if (!constants) {
      findings.push({ service: service.id, kind: 'unreadable', detail: `в ${need.constantsFrom} не найдены TARIFF_GRID_PATH / MAX_LOOKUP_DEPTH — правило поиска изменилось, зуб судить не вправе` });
      continue;
    }
    const verdict = runtimeFindsFile({
      workdir,
      copyPairs: dockerfileCopyPairs(dockerfileText, { runtimeOnly: true }),
      repoPath: constants.lookupPath,
      lookupPath: constants.lookupPath,
      maxLookupDepth: constants.maxLookupDepth,
    });
    if (verdict.found) continue;
    const detail = verdict.imagePath === null
      ? `${constants.lookupPath} НЕ копируется в образ (${need.why}); рантайм ищет из ${workdir} вверх: ${verdict.checked.join(' · ')}`
      : `${constants.lookupPath} копируется в ${verdict.imagePath}, но рантайм туда не заглядывает (${need.why}); ищет из ${workdir} вверх: ${verdict.checked.join(' · ')}`;
    findings.push({ service: service.id, kind: 'runtime-data-missing', detail });
  }
  return findings;
}

/** Вердикт по одному сервису значением: ни ФС, ни печати. */
export function serviceFindings(service, map, dockerfileText, sources = {}) {
  const pkgName = Object.keys(map).find((n) => map[n].dir === service.pkg);
  if (!pkgName) return [{ service: service.id, kind: 'unreadable', detail: `не найден package.json в ${service.pkg}` }];
  const onBuildStage = service.stage === 'build';
  const copied = onBuildStage ? buildStagePackageDirs(dockerfileText) : copiedPackageDirs(dockerfileText);
  const focused = onBuildStage ? focusedWorkspaces(dockerfileText) : null;
  const where = onBuildStage ? 'стадию сборки' : 'runtime-стадию';
  const findings = [];
  for (const dep of transitiveWorkspaceDeps(map, pkgName)) {
    const dir = map[dep].dir;
    if (!copied.has(dir)) {
      findings.push({ service: service.id, kind: 'missing-in-image', detail: `${dep} → ${dir} не копируется в ${where}` });
    }
    // Второй список того же образа отстаёт независимо от первого: каталог скопирован, а имя
    // в focus забыто — yarn такой пакет не поставит. Пустой focus не судим: его может не быть.
    if (focused !== null && focused.size > 0 && !focused.has(dep)) {
      findings.push({ service: service.id, kind: 'missing-in-focus', detail: `${dep} не назван в yarn workspaces focus` });
    }
  }
  findings.push(...runtimeReadFindings(service, dockerfileText, sources));
  return findings;
}

function main(argv) {
  const asJson = argv.includes('--json');
  const only = argv.includes('--service') ? argv[argv.indexOf('--service') + 1] : null;
  const map = readWorkspaceMap();
  const findings = [];
  for (const service of IMAGE_SERVICES) {
    if (only && service.id !== only) continue;
    const dockerfile = resolve(ROOT, service.dockerfile);
    if (!existsSync(dockerfile)) {
      findings.push({ service: service.id, kind: 'unreadable', detail: `нет ${service.dockerfile}` });
      continue;
    }
    // Источники констант читаются здесь: предикаты выше остаются чистыми и проверяемыми
    // значением. Нечитаемый источник не глотается — он приезжает находкой из предиката.
    const sources = {};
    for (const need of service.runtimeReads ?? []) {
      const abs = resolve(ROOT, need.constantsFrom);
      if (existsSync(abs)) sources[need.constantsFrom] = readFileSync(abs, 'utf8');
    }
    findings.push(...serviceFindings(service, map, readFileSync(dockerfile, 'utf8'), sources));
  }
  if (asJson) {
    console.log(JSON.stringify({ ok: findings.length === 0, findings }, null, 2));
  } else if (findings.length === 0) {
    console.log('verify:image-workspace-deps — ✓ образы несут весь транзитивный граф workspace-зависимостей');
  } else {
    console.error(`verify:image-workspace-deps — находок: ${findings.length} (висячий симлинк в образе = ERR_MODULE_NOT_FOUND на проде):`);
    for (const f of findings) console.error(`  ✗ [${f.service}] ${f.detail}`);
    console.error('  лекарство runtime-образов: COPY dist+package.json пакета в runtime-стадию');
    console.error('  лекарство веб-образов: COPY каталога пакета в стадию сборки И имя в yarn workspaces focus');
  }
  return findings.length === 0 ? 0 : 1;
}

if (process.argv[1]?.endsWith('verify-image-workspace-deps.mjs')) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(`verify:image-workspace-deps — ошибка входа: ${error?.message ?? error}`);
    process.exit(2);
  }
}
