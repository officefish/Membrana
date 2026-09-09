/**
 * Пересев тарифной сетки — чистое ядро (спринт tariff-matrix-2331, блок b4).
 *
 * Единственный источник правды тарифа — релиз матрицы в контейнере strategic-docs
 * (T13–T16 шторма 08.09): `releases/tariff-matrix/release.json` (pins гранул) и
 * `granules/tariff-<id>/resource.json` (паспорт + значения по трём тарифам).
 * Сетка `docs/tariffs/tariff-grid.json` — ПРОИЗВОДНАЯ: proj(R). Здесь — проекция.
 *
 * Детерминизм — предмет зуба «сетка совпадает с релизом»: порядок реестра = порядок
 * pins, строки — по rank, ячейки — в порядке реестра; дат генерации в теле нет.
 * Один и тот же вход обязан давать байт-в-байт одну сетку — иначе зуб красен зря.
 *
 * Без fs и сети: ФС — в `scripts/tariff-reseed.mjs`.
 */

/** Закрытый список правил пересева (ратифицированная нарезка + поправка координатора 08.09). */
export const RESEED_RULES = Object.freeze([
  'exact-bytes', // квота в МиБ → байты
  'exact-count', // квота в штуках (устройства, сценарии)
  'catalog-id', // ссылка на каталог
  'enabled-flag', // инструмент включён/выключен
  'gated-by-precondition', // возможность с предусловием
  'produce-scope', // право производить своё (+ scope)
  'matrix-only', // живёт только в матрице, в сетку НЕ проецируется (T2/T10)
]);

/** Какой род ячейки рождает каждое правило (matrix-only ячейки не рождает). */
const KIND_BY_RULE = Object.freeze({
  'exact-bytes': 'quota',
  'exact-count': 'quota',
  'catalog-id': 'catalog',
  'enabled-flag': 'instrument',
  'gated-by-precondition': 'gated',
  'produce-scope': 'produce',
});

/**
 * Закрытый список трёх тарифов владельца (T1): порядок = rank. Строка сетки — композиция
 * значений гранул по этому sku; тариф вне списка релиз не описывает.
 */
export const TARIFF_ROWS = Object.freeze([
  Object.freeze({ sku: 'free-v1', productName: 'Датчик', rank: 0 }),
  Object.freeze({ sku: 'checkpoint-v1', productName: 'Блокпост', rank: 1 }),
  Object.freeze({ sku: 'observatory-v1', productName: 'Наблюдательный пункт', rank: 2 }),
]);

export const GRID_VERSION = 1;

/** Ошибка проекции — инструментальная (вход не читается), не «находка зуба». */
export class ReseedError extends Error {
  constructor(message, where) {
    super(where ? `${where}: ${message}` : message);
    this.name = 'ReseedError';
    this.where = where ?? null;
  }
}

const MIB = 1024 * 1024;

/**
 * Записи гранулы: одиночная гранула ресурса — одна запись; гранула с `entries[]`
 * (например tariff-instruments) — несколько. Поля записи наследуют поля гранулы.
 * @param {string} granuleId @param {object} resource
 */
export function granuleEntries(granuleId, resource) {
  if (!resource || typeof resource !== 'object') {
    throw new ReseedError('resource.json не объект', granuleId);
  }
  if (Array.isArray(resource.entries)) {
    return resource.entries.map((entry, i) => ({
      ...entry,
      id: entry.id ?? `${granuleId}#${i}`,
      granuleId,
    }));
  }
  return [{ ...resource, id: resource.id ?? granuleId, granuleId }];
}

/** Ячейка сетки из значения гранулы по правилу пересева. */
function projectCell(entry, sku, value) {
  const where = `${entry.granuleId}.${entry.resource}.${sku}`;
  if (!value || typeof value !== 'object') {
    throw new ReseedError('нет значения для тарифа — полнота матрицы обязательна', where);
  }
  switch (entry.reseedRule) {
    case 'exact-bytes':
      if (typeof value.MiB !== 'number') throw new ReseedError('exact-bytes ждёт число MiB', where);
      return { kind: 'quota', limit: value.MiB * MIB, unit: 'bytes' };
    case 'exact-count':
      if (typeof value.count !== 'number') throw new ReseedError('exact-count ждёт число count', where);
      return { kind: 'quota', limit: value.count, unit: 'count' };
    case 'catalog-id':
      if (typeof value.catalogId !== 'string') throw new ReseedError('catalog-id ждёт catalogId', where);
      return { kind: 'catalog', catalogId: value.catalogId };
    case 'enabled-flag':
      if (typeof value.enabled !== 'boolean') throw new ReseedError('enabled-flag ждёт enabled', where);
      return { kind: 'instrument', enabled: value.enabled };
    case 'gated-by-precondition':
      if (typeof value.enabled !== 'boolean' || typeof value.preconditionId !== 'string') {
        throw new ReseedError('gated-by-precondition ждёт enabled и preconditionId', where);
      }
      return { kind: 'gated', enabled: value.enabled, preconditionId: value.preconditionId };
    case 'produce-scope': {
      if (typeof value.enabled !== 'boolean') throw new ReseedError('produce-scope ждёт enabled', where);
      const cell = { kind: 'produce', enabled: value.enabled };
      if (Array.isArray(value.scope)) cell.scope = [...value.scope];
      return cell;
    }
    default:
      throw new ReseedError(`правило пересева «${entry.reseedRule}» вне закрытого списка`, where);
  }
}

/** Значение предварительно, если не закреплено владельцем или несёт заглушку. */
export const isProvisionalValue = (value) =>
  value != null && typeof value === 'object' && (value.ratifiedAt === null || value.stub != null);

/** Причина предварительности: заглушка словами важнее заметки. */
export const provisionalReason = (value) =>
  value?.stub?.reason ?? value?.note ?? 'значение владельцем не закреплено (ratifiedAt: null)';

/**
 * Шапка производной: без дат генерации — только релиз и pins, чтобы одинаковый вход давал
 * одинаковую сетку.
 */
export function gridHeader(release) {
  const pins = Object.entries(release.pins).map(([id, v]) => `${id}@${v}`);
  return (
    `ПРОИЗВОДНАЯ матрицы тарифов: сгенерировано yarn tariff:reseed из релиза ` +
    `${release.releaseId}@${release.templateVersion} (pins ${pins.join(', ')}); ` +
    `руками не править — правки через гранулы и пересборку (T16)`
  );
}

/**
 * Проекция релиза матрицы в форму сетки S1.
 * @param {{ release: object, granules: Map<string, object> }} input
 * @returns {object} grid
 */
export function projectGrid({ release, granules }) {
  if (!release || typeof release !== 'object') throw new ReseedError('release.json не объект');
  if (!release.pins || typeof release.pins !== 'object' || Array.isArray(release.pins)) {
    throw new ReseedError('release.pins — не объект «гранула → версия»');
  }
  if (typeof release.releaseId !== 'string' || typeof release.templateVersion !== 'string') {
    throw new ReseedError('release.json без releaseId/templateVersion — шапку сетки не собрать');
  }
  if (!(granules instanceof Map)) throw new ReseedError('granules — не Map');

  const registry = [];
  const cellsBySku = new Map(TARIFF_ROWS.map((r) => [r.sku, {}]));
  const provisional = {};
  const seen = new Set();

  for (const granuleId of Object.keys(release.pins)) {
    if (!granules.has(granuleId)) throw new ReseedError('гранула из pins не подана в проекцию', granuleId);
    const resource = granules.get(granuleId);
    if (resource === null) continue; // прозаическая гранула матрицы (назначение и т.п.) — не ресурс

    for (const entry of granuleEntries(granuleId, resource)) {
      if (!RESEED_RULES.includes(entry.reseedRule)) {
        throw new ReseedError(
          `правило пересева «${entry.reseedRule}» вне закрытого списка`,
          `${granuleId}.${entry.id}`,
        );
      }
      if (entry.reseedRule === 'matrix-only') continue; // T2/T10: строка матрицы, не сетки

      if (typeof entry.resource !== 'string' || !entry.resource) {
        throw new ReseedError('нет id права (resource)', `${granuleId}.${entry.id}`);
      }
      if (seen.has(entry.resource)) {
        throw new ReseedError('право проецируется дважды — реестр сетки закрыт', entry.resource);
      }
      seen.add(entry.resource);

      const kind = KIND_BY_RULE[entry.reseedRule];
      if (entry.kind && entry.kind !== kind) {
        throw new ReseedError(`род «${entry.kind}» не согласован с правилом «${entry.reseedRule}»`, entry.resource);
      }
      if (typeof entry.registry?.titleKey !== 'string' || !entry.registry.titleKey) {
        throw new ReseedError('паспорт без registry.titleKey — витрина выдумывала бы подпись', entry.resource);
      }
      registry.push({
        id: entry.resource,
        kind,
        titleKey: entry.registry.titleKey,
        description: entry.registry.description ?? '',
      });

      for (const row of TARIFF_ROWS) {
        const value = entry.values?.[row.sku];
        cellsBySku.get(row.sku)[entry.resource] = projectCell(entry, row.sku, value);
        if (isProvisionalValue(value)) {
          provisional[`${row.sku}.${entry.resource}`] = provisionalReason(value);
        }
      }
    }
  }

  const rows = TARIFF_ROWS.map((r) => ({
    sku: r.sku,
    productName: r.productName,
    rank: r.rank,
    cells: cellsBySku.get(r.sku),
  }));

  return {
    '//': gridHeader(release),
    '//source': {
      releaseId: release.releaseId,
      templateVersion: release.templateVersion,
      pins: { ...release.pins },
    },
    '//deny-by-default':
      'Нет ячейки / неизвестный id / несовпадение рода → права нет. Полнота обязательна: у КАЖДОГО тарифа ячейка на КАЖДОЕ право реестра (зуб matrix_complete).',
    version: GRID_VERSION,
    registry,
    rows,
    '//provisional': {
      '//': 'Ячейки, чьё значение владельцем НЕ закреплено (паспорт: ratifiedAt null или заглушка stub). Полнота соблюдена, число ждёт слова.',
      ...provisional,
    },
  };
}

/** Каноническая сериализация: один вход — одни байты. */
export const serializeGrid = (grid) => `${JSON.stringify(grid, null, 2)}\n`;
