/**
 * Зуб #2147/№1 (класс #2009): App DI smoke обязан покрывать ВСЕ Nest-приложения.
 *
 * Повтор 24.08: смоук был у офиса и media, у кабинета — нет; HealthDeepService
 * с параметром-функцией в конструкторе уронил деплой, а не CI. Урок в коде:
 * Nest-приложение обнаруживается по зависимости @nestjs/core, и для каждого
 * ОБЯЗАНЫ существовать (а) src/app.module.smoke.test.ts и (б) строки гейта в
 * unit-tests.yml (build --filter и прогон смоука). Новое Nest-приложение без
 * регистрации — красный CI, не прод-контейнер.
 */

/**
 * Имена Nest-приложений по манифестам workspace-пакетов.
 * @param {Array<{path: string, json: { name?: string, dependencies?: Record<string,string> }}>} manifests
 * @returns {Array<{ name: string, dir: string }>} dir — posix-путь пакета от корня
 */
export function nestAppsFromManifests(manifests) {
  const apps = [];
  for (const { path, json } of manifests) {
    if (!json?.dependencies?.['@nestjs/core']) continue;
    const dir = path.replace(/\\/gu, '/').replace(/\/package\.json$/u, '');
    apps.push({ name: json.name ?? dir, dir });
  }
  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Проблемы покрытия: для каждого Nest-приложения — смоук-файл и строки CI-гейта.
 * @param {{
 *   apps: Array<{ name: string, dir: string }>,
 *   hasSmokeFile: (dir: string) => boolean,
 *   workflowText: string,
 * }} p
 * @returns {string[]} человекочитаемые проблемы; пусто = покрыто
 */
export function coverageProblems({ apps, hasSmokeFile, workflowText }) {
  const problems = [];
  if (apps.length === 0) {
    problems.push('не найдено ни одного Nest-приложения (@nestjs/core) — сканер сломан?');
    return problems;
  }
  for (const app of apps) {
    if (!hasSmokeFile(app.dir)) {
      problems.push(
        `${app.name}: нет ${app.dir}/src/app.module.smoke.test.ts — DI-граф судит прод-контейнер, а не CI (класс #2009). Образец: packages/background-office/src/app.module.smoke.test.ts`,
      );
    }
    if (!workflowText.includes(`--filter=${app.name}`)) {
      problems.push(
        `${app.name}: в unit-tests.yml нет сборки dist (--filter=${app.name}) для шага App DI smoke — смоук без dist скипается/падает`,
      );
    }
    if (!workflowText.includes(`yarn workspace ${app.name} test src/app.module.smoke.test.ts`)) {
      problems.push(
        `${app.name}: в unit-tests.yml нет прогона «yarn workspace ${app.name} test src/app.module.smoke.test.ts» под SMOKE_REQUIRE_DIST=1`,
      );
    }
  }
  return problems;
}
