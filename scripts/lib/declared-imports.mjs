/**
 * Ядро зуба «импортируешь — объяви» (#2204-родня, находка 28.08).
 *
 * ЗАЧЕМ. `background-media` импортировал `@membrana/media-library-service`, не объявив его в
 * своём `package.json`. Локально это невидимо: `dist` соседа лежит от прежних сборок, и всё
 * резолвится. В CI дало четыре красных подряд — сборка образа, зуб графа, каталог smoke,
 * храповик линтера, — и ни один из них не назвал причину, потому что причина была не в них.
 *
 * ПОЧЕМУ СОСЕДНИЙ СТОРОЖ ЭТОГО НЕ ЛОВИТ И НЕ СЛОМАН. `verify:image-workspace-deps` ходит по
 * ОБЪЯВЛЕННОМУ графу: берёт `dependencies` и проверяет, что образ несёт их все. Импорт, не
 * попавший в манифест, ему невидим по устройству — он честно проверяет то, что ему поручено,
 * и остаётся зелёным. Это слепое пятно ровно там, где граница нарушается молча.
 *
 * СВИДЕТЕЛЬСТВО БЕРЁТСЯ ТАМ, ГДЕ ЖИВЁТ РИСК: не в манифесте (где написано намерение), а в
 * исходниках (где написан факт). Манифест сверяется с кодом, а не код с манифестом.
 *
 * Чистые функции; ФС и печать — у вызывающего.
 */

/** Формы, которыми пакет попадает в код. Динамический импорт тоже импорт. */
const IMPORT_PATTERNS = [
  // import … from 'x' / export … from 'x'
  /(?:^|[\s;}])(?:import|export)[\s\S]{0,200}?from\s*['"](@membrana\/[a-z0-9-]+)['"]/gu,
  // import 'x' (побочный эффект)
  /(?:^|[\s;}])import\s*['"](@membrana\/[a-z0-9-]+)['"]/gu,
  // import('x') — ровно так грузит ядро сервер, и это тоже связь
  /\bimport\s*\(\s*['"](@membrana\/[a-z0-9-]+)['"]/gu,
  // require('x')
  /\brequire\s*\(\s*['"](@membrana\/[a-z0-9-]+)['"]/gu,
];

/**
 * Имена рабочих пакетов, встречающиеся в тексте как импорт.
 * @param {string} text
 * @returns {Set<string>}
 */
export function importedWorkspaces(text) {
  const found = new Set();
  for (const re of IMPORT_PATTERNS) {
    for (const m of text.matchAll(re)) found.add(m[1]);
  }
  return found;
}

/**
 * Объявленные пакетом рабочие зависимости.
 *
 * Считаются ВСЕ три поля: `dependencies`, `peerDependencies`, `devDependencies`. Тестовый файл
 * законно тянет devDependency, и требовать от него runtime-объявления значило бы завести
 * ложный красный — а ложный красный глушат вместе с настоящими.
 * @param {Record<string, unknown>} pkg
 */
export function declaredWorkspaces(pkg) {
  const names = new Set();
  for (const field of ['dependencies', 'peerDependencies', 'devDependencies']) {
    for (const name of Object.keys(pkg?.[field] ?? {})) {
      if (name.startsWith('@membrana/')) names.add(name);
    }
  }
  return names;
}

/**
 * Находки одного пакета: что импортируется, но не объявлено.
 *
 * ОБРАТНОЕ НЕ ПРОВЕРЯЕТСЯ. Объявленное, но не импортируемое — лишний вес, а не ложь: пакет
 * может тянуться типами, ассетами или готовиться к работе. Тот же довод, по которому соседний
 * сторож не требует обратного включения.
 *
 * @param {string} pkgName имя проверяемого пакета
 * @param {Set<string>} imported фактические импорты из его исходников
 * @param {Set<string>} declared объявленное в его манифесте
 * @param {Set<string>} known имена всех рабочих пакетов репозитория
 */
export function undeclaredImports(pkgName, imported, declared, known) {
  const findings = [];
  for (const dep of [...imported].sort()) {
    if (dep === pkgName) continue; // самоимпорт по имени — не связь наружу
    if (!known.has(dep)) continue; // не наш пакет: судить нечем, это забота install
    if (declared.has(dep)) continue;
    findings.push({ pkg: pkgName, dep });
  }
  return findings;
}
