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
  { id: 'media', pkg: 'packages/background-media', dockerfile: 'packages/background-media/Dockerfile' },
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

/**
 * Пути, которые runtime-стадия Dockerfile действительно копирует.
 *
 * Разбор консервативный: берётся хвост файла ПОСЛЕ последнего `FROM … AS runtime`, оттуда —
 * `COPY --from=… <src> <dst>`. `packages/x/dist` и `packages/x` считаются покрытием `packages/x`.
 */
export function copiedPackageDirs(dockerfileText) {
  const runtimeStart = dockerfileText.search(/^FROM\s+\S+\s+AS\s+runtime\b/mu);
  const tail = runtimeStart === -1 ? dockerfileText : dockerfileText.slice(runtimeStart);
  const dirs = new Set();
  for (const m of tail.matchAll(/^COPY\s+(?:--from=\S+\s+)?(\S+)/gmu)) {
    const src = m[1].replace(/^\/app\//u, '').replace(/\\/gu, '/');
    const hit = /^(packages\/(?:libs\/|services\/(?:detectors\/)?)?[^/]+)/u.exec(src);
    if (hit) dirs.add(hit[1]);
  }
  return dirs;
}

/** Вердикт по одному сервису значением: ни ФС, ни печати. */
export function serviceFindings(service, map, dockerfileText) {
  const pkgName = Object.keys(map).find((n) => map[n].dir === service.pkg);
  if (!pkgName) return [{ service: service.id, kind: 'unreadable', detail: `не найден package.json в ${service.pkg}` }];
  const copied = copiedPackageDirs(dockerfileText);
  const findings = [];
  for (const dep of transitiveWorkspaceDeps(map, pkgName)) {
    const dir = map[dep].dir;
    if (!copied.has(dir)) {
      findings.push({ service: service.id, kind: 'missing-in-image', detail: `${dep} → ${dir} не копируется в runtime-стадию` });
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
    console.error('  лекарство: добавить COPY dist+package.json пакета в runtime-стадию Dockerfile');
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
