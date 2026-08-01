/**
 * Дрейф справочника — **три разницы**, а не одна (§3 контракта `workshop-wires`).
 *
 * ```text
 * Δ1  обнаружение домов  ↔  индекс
 * Δ2  манифесты          ↔  workshop-записи индекса
 * Δ3  REGISTRY.json      ↔  проекция неймспейсов
 * ```
 *
 * ПОЧЕМУ ТРИ, А НЕ ОДНА. До этого `--check` делал плоское сравнение отрендеренного файла с
 * тем, что рендерится сейчас: разошлось — пересобери. Такая проверка отвечает «производные
 * несвежи» и молчит о том, **что именно** разъехалось. §3 признал её недостаточной прямо:
 * «нынешняя проверка "только против манифестов" после M2 недостаточна».
 *
 * Разница между «в дереве появился дом, которого нет в индексе» и «в реестре появилось
 * правило, которого нет в проекции» — это разные починки: первая правится пересборкой,
 * вторая может означать, что реестр не читается вовсе. Слить их в одно «дрейф» значит
 * заставить человека выяснять причину заново каждый раз.
 *
 * FAIL-CLOSED НА РАСХОЖДЕНИИ (§3), но **дом без мастерской падать не заставляет** — это
 * законное состояние, а не разница.
 */

/** Роды разниц. Список ЗАКРЫТ. */
export const DRIFT_KINDS = Object.freeze({
  DISCOVERY: 'discovery',
  MANIFESTS: 'manifests',
  NAMESPACES: 'namespaces',
});

/** Человеческие имена родов — для отчёта. */
export const DRIFT_TITLES = Object.freeze({
  discovery: 'Δ обнаружение домов ↔ индекс',
  manifests: 'Δ манифесты ↔ записи мастерских',
  namespaces: 'Δ реестр неймспейсов ↔ проекция',
});

/** Симметричная разница двух множеств строк. */
function diff(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  return {
    onlyLeft: [...A].filter((x) => !B.has(x)).sort(),
    onlyRight: [...B].filter((x) => !A.has(x)).sort(),
  };
}

/**
 * Посчитать три разницы.
 *
 * @param {{
 *   discovered: readonly {home: string, kind: string, hasManifest: boolean}[],
 *   indexed: readonly {home: string, kind: string}[],
 *   manifestHomes: readonly string[],
 *   registryIds: readonly string[],
 *   projectedIds: readonly string[],
 * }} input
 * @returns {{ok: boolean, diffs: {kind: string, title: string, missing: string[], extra: string[]}[]}}
 */
export function computeDrift(input) {
  const {
    discovered = [],
    indexed = [],
    manifestHomes = [],
    registryIds = [],
    projectedIds = [],
  } = input ?? {};

  const diffs = [];
  const add = (kind, { onlyLeft, onlyRight }) => {
    if (onlyLeft.length === 0 && onlyRight.length === 0) return;
    diffs.push({ kind, title: DRIFT_TITLES[kind], missing: onlyLeft, extra: onlyRight });
  };

  // Δ1: дом найден обходом, но в индекс не попал (или наоборот — индекс помнит снесённый дом).
  add(DRIFT_KINDS.DISCOVERY, diff(discovered.map((d) => d.home), indexed.map((i) => i.home)));

  // Δ2: манифест лежит в дереве, а записи мастерской нет. Сюда же обратное — запись
  // мастерской без манифеста. Дом БЕЗ манифеста в эту разницу не входит: он законен.
  const workshopHomes = indexed.filter((i) => i.kind === 'workshop').map((i) => i.home);
  add(DRIFT_KINDS.MANIFESTS, diff(manifestHomes, workshopHomes));

  // Δ3: правило есть в реестре, но не в проекции. Обычно значит, что реестр не прочитался
  // целиком — и это совсем другая починка, чем «пересобери индекс».
  add(DRIFT_KINDS.NAMESPACES, diff(registryIds, projectedIds));

  return { ok: diffs.length === 0, diffs };
}

/**
 * Отчёт словами.
 *
 * Каждая разница печатается СВОИМ родом и своими адресами. Общее «дрейф» без адресов
 * заставляло бы искать причину заново; §3 требует различать три, и отчёт обязан это
 * различие донести до читателя, а не схлопнуть при выводе.
 */
export function renderDrift(result) {
  if (result.ok) return ['tooling:atlas --check: OK — три разницы сошлись (обнаружение, манифесты, неймспейсы).'];
  const lines = [`tooling:atlas --check: ДРЕЙФ — разошлось разниц: ${result.diffs.length} из 3.`];
  for (const d of result.diffs) {
    lines.push(`  ${d.title}`);
    if (d.missing.length > 0) lines.push(`    есть слева, нет справа: ${d.missing.join(', ')}`);
    if (d.extra.length > 0) lines.push(`    есть справа, нет слева: ${d.extra.join(', ')}`);
  }
  lines.push('  Починка зависит от рода: обнаружение и манифесты — `--render`; неймспейсы — сначала проверить читаемость реестра.');
  return lines;
}
