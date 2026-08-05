/**
 * prisma-docker-guard — инвариант docker-сборок Prisma-пакетов (шот #1724, 05.08).
 *
 * ПОВОД. Коммит 18299ad3 (02.08, #1632) верно вылечил гонку turbo: `prisma generate`
 * вынесен из `build`/`typecheck`/`test` в отдельную turbo-задачу с зависимостью.
 * Но docker-сборки turbo НЕ ЗОВУТ — они дёргают `yarn workspace <pkg> build` напрямую,
 * а он теперь голый `tsc -b`. Каталог `generated/` закрыт .gitignore, значит внутри
 * образа клиента Prisma нет: TS2305/TS2339, образ кабинета красный трое суток.
 *
 * ЗАЧЕМ ЗУБ, А НЕ ПРАВКА ДВУХ ФАЙЛОВ. Дыра воспроизводима: следующий пакет со схемой
 * получит её молча, а видна она только там, где образ собирает CI (у media — не собирает,
 * и провал ждёт первой ручной выкладки). Инвариант проверяем — значит должен проверяться.
 *
 * СЛЕПОТА НАЗВАНА ПОЛЕМ: разбор текстовый (`blind: 'text-scan'`). Судим наличие вызова
 * generate в том же Dockerfile, а не факт его исполнения; multi-stage и порядок команд
 * не моделируются. Настоящее доказательство — зелёная сборка образа, зуб лишь не даёт
 * забыть.
 *
 * Чистое ядро: ФС снаружи (CLI подаёт снимок).
 */

/** Пакет объявляет схему Prisma → его сборке нужен сгенерированный клиент. */
export const PRISMA_SCHEMA_REL = 'prisma/schema.prisma';

/**
 * Зовёт ли Dockerfile сборку именно этого пакета.
 * @param {string} dockerfile содержимое
 * @param {string} pkgName имя воркспейса (@membrana/…)
 */
export function buildsPackage(dockerfile, pkgName) {
  if (!pkgName) return false;
  const escaped = pkgName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`yarn\\s+workspace\\s+${escaped}\\s+build\\b`, 'u').test(String(dockerfile ?? ''));
}

/**
 * Зовёт ли Dockerfile генерацию клиента для этого пакета: либо глаголом воркспейса
 * (`yarn workspace <pkg> prisma:generate`), либо turbo-задачей с фильтром на него,
 * либо прямым `prisma generate` (последнее — законно в однопакетном образе).
 * @param {string} dockerfile @param {string} pkgName
 */
export function generatesPrismaClient(dockerfile, pkgName) {
  const text = String(dockerfile ?? '');
  const escaped = String(pkgName ?? '').replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  if (escaped && new RegExp(`yarn\\s+workspace\\s+${escaped}\\s+prisma:generate\\b`, 'u').test(text)) return true;
  if (escaped && new RegExp(`turbo\\s+run\\s+prisma:generate[^\\n]*--filter[= ]${escaped}`, 'u').test(text)) return true;
  return /(^|[\s&|])(npx\s+)?prisma\s+generate\b/mu.test(text);
}

/**
 * Находки инварианта по снимку.
 *
 * @param {Array<{name: string, dir: string, hasPrismaSchema: boolean}>} packages
 * @param {Array<{path: string, content: string}>} dockerfiles
 * @returns {{ok: boolean, findings: Array<{dockerfile: string, pkg: string, reason: string}>, blind: 'text-scan'}}
 */
export function auditPrismaDockerfiles(packages, dockerfiles) {
  const findings = [];
  const withSchema = (packages ?? []).filter((p) => p?.hasPrismaSchema && p?.name);
  for (const df of dockerfiles ?? []) {
    for (const pkg of withSchema) {
      if (!buildsPackage(df.content, pkg.name)) continue;
      if (generatesPrismaClient(df.content, pkg.name)) continue;
      findings.push({
        dockerfile: df.path,
        pkg: pkg.name,
        reason:
          `собирает ${pkg.name} (схема Prisma есть), но не зовёт prisma generate — ` +
          'клиент генерируется turbo-задачей, а docker через turbo не ходит: в образе клиента не будет',
      });
    }
  }
  return { ok: findings.length === 0, findings, blind: 'text-scan' };
}
