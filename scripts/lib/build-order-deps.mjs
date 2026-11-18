/**
 * Ядро зуба «порядок сборки объявлен там, где его читает turbo» (#2436).
 *
 * ЗАЧЕМ. Два случая за три дня: CI краснел в пакете, которого дифф не касался
 * (`@membrana/cabinet#typecheck` на `dist` соседа), и зеленел с простого перезапуска.
 * Порядок держался на удаче.
 *
 * ГДЕ ИМЕННО РАСХОДИТСЯ. Порядок сборки объявляется дважды и в разных местах:
 *   - `tsconfig*.json` пакета — через `references` и `paths`: это читает `tsc`;
 *   - `package.json` пакета — через зависимости: это читает `turbo`, и только это.
 * `turbo.json` велит `typecheck` ждать `^build`, но «^» разворачивается по ОБЪЯВЛЕННОМУ в
 * манифесте графу. Сосед, названный только в `tsconfig`, для turbo невидим: его сборку
 * никто не заказывал, и попадёт ли она раньше — вопрос порядка в очереди. Локально
 * незаметно (`dist` соседа лежит от прежних сборок), в CI — красный через раз.
 *
 * ПОЧЕМУ СОСЕДНИЙ ЗУБ ЭТОГО НЕ ЛОВИТ И НЕ СЛОМАН. `verify:declared-imports` берёт
 * свидетельство из ИСХОДНИКОВ: что импортируется, то и объяви. Связь, существующая только
 * как `references` в `tsconfig` (типы, project references, сборка деклараций), в исходниках
 * не видна — импорта нет, а порядок сборки нужен. Это соседнее слепое пятно, не дубль.
 *
 * ОБРАТНОЕ НЕ ПРОВЕРЯЕТСЯ: объявленное в манифесте, но не названное в `tsconfig` — лишний
 * вес, а не ложь. Тот же довод, что у соседа.
 *
 * Чистые функции; ФС и печать — у вызывающего.
 */

/** Имена рабочих пакетов, названные в `paths` файла tsconfig. */
export function pathsWorkspaces(text) {
  const found = new Set();
  for (const m of String(text).matchAll(/"(@membrana\/[a-z0-9-]+)(?:\/\*)?"\s*:/gu)) found.add(m[1]);
  return found;
}

/** Относительные цели `references` файла tsconfig (как написаны). */
export function referencePaths(text) {
  const found = [];
  for (const m of String(text).matchAll(/"path"\s*:\s*"([^"]+)"/gu)) found.push(m[1]);
  return found;
}

/** Зависимости пакета — все три поля, как у соседнего зуба. */
export function declaredDependencies(pkg) {
  const names = new Set();
  for (const field of ['dependencies', 'peerDependencies', 'devDependencies']) {
    for (const name of Object.keys(pkg?.[field] ?? {})) {
      if (name.startsWith('@membrana/')) names.add(name);
    }
  }
  return names;
}

/**
 * Соседи, названные порядком сборки, но не объявленные манифестом.
 *
 * @param {string} pkgName имя проверяемого пакета
 * @param {Set<string>|Iterable<string>} namedByTsconfig кого называет tsconfig (paths + references)
 * @param {Set<string>} declared что объявлено в манифесте
 * @param {Set<string>} known имена всех рабочих пакетов репозитория
 * @returns {string[]} отсортированный список расхождений
 */
export function undeclaredBuildOrder(pkgName, namedByTsconfig, declared, known) {
  const out = [];
  for (const dep of [...namedByTsconfig].sort()) {
    if (dep === pkgName) continue; // ссылка пакета на себя порядком наружу не является
    if (!known.has(dep)) continue; // не наш пакет — судить нечем
    if (declared.has(dep)) continue;
    out.push(dep);
  }
  return out;
}

/**
 * Задачи turbo, которым положено ждать сборки соседей.
 *
 * Предмет зуба над `turbo.json`: проверка без предмета не проверка, поэтому сначала
 * утверждается, что задача в файле ЕСТЬ, и лишь потом — что у неё стоит `^build`.
 *
 * @param {Record<string, unknown>} turbo разобранный turbo.json
 * @param {string[]} required имена задач, обязанных нести `^build`
 * @returns {{missingTask: string[], missingDependsOn: string[]}}
 */
export function buildOrderGaps(turbo, required = ['build', 'typecheck', 'test', 'test:integration']) {
  const tasks = turbo?.tasks ?? turbo?.pipeline ?? {};
  const missingTask = [];
  const missingDependsOn = [];
  for (const name of required) {
    const task = tasks?.[name];
    if (!task) {
      missingTask.push(name);
      continue;
    }
    const dependsOn = Array.isArray(task.dependsOn) ? task.dependsOn : [];
    if (!dependsOn.includes('^build')) missingDependsOn.push(name);
  }
  return { missingTask, missingDependsOn };
}
