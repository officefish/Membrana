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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Сервисы, чей образ несёт workspace-пакеты. Дом списка — здесь, рядом с предикатом. */
export const IMAGE_SERVICES = Object.freeze([
  { id: 'media', pkg: 'packages/background-media', dockerfile: 'packages/background-media/Dockerfile', stage: 'runtime' },
  // Кабинет внесён 22.08 после падения сборки на @membrana/plugin-contracts@npm:* (404): зуб
  // честно проверял то, что ему поручили, и молчал про всё остальное. Список из одного сервиса
  // ловит один сервис — класс чинится внесением, а не разбором случая.
  { id: 'cabinet', pkg: 'packages/background-cabinet', dockerfile: 'packages/background-cabinet/Dockerfile', stage: 'runtime' },
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

/** Каталоги, где живут воркспейсы (совпадает с `workspaces` корневого package.json). */
const WORKSPACE_DIRS = ['packages', 'packages/libs', 'packages/services', 'packages/services/detectors', 'apps'];

/** Карта «имя пакета → {dir, deps}». Читает ФС один раз; ядро ниже работает значением. */
export function readWorkspaceMap(root = ROOT) {
  const map = {};
  for (const dir of WORKSPACE_DIRS) {
    const abs = resolve(root, dir);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const pkgPath = join(abs, entry.name, 'package.json');
      if (!existsSync(pkgPath)) continue;
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (typeof pkg.name !== 'string') continue;
      map[pkg.name] = {
        dir: `${dir}/${entry.name}`,
        deps: Object.keys(pkg.dependencies ?? {}).filter((d) => d.startsWith('@membrana/')),
      };
    }
  }
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
export function dockerfileCopySources(dockerfileText, { runtimeOnly = false, localOnly = false } = {}) {
  const body = runtimeOnly ? runtimeStageTail(dockerfileText) : dockerfileText;
  const sources = [];
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
    for (const src of positional.slice(0, -1)) {
      const normalized = normalizeDockerfileSource(src);
      if (normalized) sources.push(normalized);
    }
  }
  return sources;
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

/** Вердикт по одному сервису значением: ни ФС, ни печати. */
export function serviceFindings(service, map, dockerfileText) {
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
    findings.push(...serviceFindings(service, map, readFileSync(dockerfile, 'utf8')));
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
