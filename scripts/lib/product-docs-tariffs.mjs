import { readFileSync } from 'node:fs';

import { gridFindings } from './tariff-grid-check.mjs';

const QUOTA_LABELS = Object.freeze({
  'nodes.max': 'Устройства',
  'workspaces.user.max': 'Пользовательские сценарии',
  'storage.hot': 'Рабочая память',
  'storage.cold': 'Холодное хранилище',
  'storage.buffer': 'Буфер записи',
  'dataset.sounds': 'Каталог звуков',
});

const SCALAR_LABELS = Object.freeze({
  userStorageQuotaMiB: 'Рабочая память',
  coldStorageQuotaMiB: 'Холодное хранилище',
  bufferQuotaMiB: 'Буфер записи',
  maxNodesPerMembrane: 'Устройства',
  maxUserWorkspaces: 'Пользовательские сценарии',
  maxActiveKeysPerNode: 'Активные ключи на устройстве',
  datasetCatalogId: 'Каталог звуков',
  datasetSounds: 'Число звуков в каталоге',
});

const mdxSafe = (value) =>
  String(value ?? '')
    .replace(/[|\r\n]+/gu, ' ')
    .replace(/[{}<>]/gu, (char) => ({ '{': '｛', '}': '｝', '<': '‹', '>': '›' })[char])
    .trim();

const quota = (value, unit = '') => {
  if (value == null) return 'Не определено';
  if (unit === 'MiB') {
    if (value === 0) return 'Нет';
    if (value >= 1024 && value % 1024 === 0) return `${value / 1024} ГБ`;
    return `${value} МБ`;
  }
  return String(value);
};

const bytesToMiB = (value) => (typeof value === 'number' ? value / (1024 * 1024) : null);

/**
 * Число квоты для продуктовой страницы — ИЗ СЕТКИ (docs/tariffs/tariff-grid.json), не из скаляров.
 *
 * Консилиум tariff-matrix-scalars-fate-2026-09-08: источник правды о тарифе — релиз матрицы,
 * сетка — его производная, скаляры S0 — замороженная эпоха сида, «канон тарифа» они не несут
 * (DoD 5: нет новых презентационных чтений S как канона). До 08.09 страница брала число из
 * скаляров и печатала «Не определено» там, где сетка уже несла закреплённое значение
 * (ревью PR #2334, блокер P0).
 *
 * Правило: клетка сетки закреплена (не в `//provisional`) → её число; клетка предварительная →
 * число из S0, если оно там названо, иначе «Не менее …» по клетке как нижняя граница; клетки
 * нет — «Не определено» (или скаляр как резерв).
 */
const quotaFromSources = (declaredValue, unit, gridCell, isProvisional) => {
  const hasCell = gridCell?.kind === 'quota' && typeof gridCell.limit === 'number';
  if (!hasCell) return declaredValue != null ? quota(declaredValue, unit) : 'Не определено';
  const value = unit === 'MiB' ? bytesToMiB(gridCell.limit) : gridCell.limit;
  if (!isProvisional) return quota(value, unit);
  // Предварительная клетка: если число всё же названо в S0 (закрыто владельцем в эпоху сида) —
  // печатаем его; иначе клетка сетки — нижняя граница.
  if (declaredValue != null) return quota(declaredValue, unit);
  if (value === 0) return 'Недоступно сейчас';
  return `Не менее ${quota(value, unit)}`;
};

const availability = (cell) => {
  if (!cell) return 'Нет';
  if (cell.kind === 'catalog') return typeof cell.catalogId === 'string' && cell.catalogId !== '' ? 'Да' : 'Нет';
  if (cell.enabled !== true) return 'Нет';
  if (cell.kind === 'gated' && cell.enabled === true) return 'При готовой сети';
  return 'Да';
};

function sourcePairFindings(grid, scalars) {
  const out = [...gridFindings(grid)];
  if (!Array.isArray(scalars?.tariffs)) {
    out.push({ toothId: 'scalars_shape', where: 'tariffs', reason: 'нет массива тарифов' });
    return out;
  }

  const rowsBySku = new Map((grid?.rows ?? []).map((row) => [row.sku, row]));
  const registryById = new Map((grid?.registry ?? []).map((definition) => [definition.id, definition]));
  for (const definition of grid?.registry ?? []) {
    if (definition.kind !== 'quota' && (typeof definition.description !== 'string' || definition.description.trim() === '')) {
      out.push({ toothId: 'public_projection_shape', where: definition.id, reason: 'нет публичного описания права' });
    }
  }
  const scalarIds = new Set();
  for (const declared of scalars.tariffs) {
    if (scalarIds.has(declared.id)) {
      out.push({ toothId: 'scalars_shape', where: declared.id, reason: 'тариф объявлен дважды' });
    }
    scalarIds.add(declared.id);
    const row = rowsBySku.get(declared.id);
    if (!row) {
      out.push({ toothId: 'source_pair', where: declared.id, reason: 'тариф есть в scalars, но отсутствует в grid' });
      continue;
    }
    if (row.productName !== declared.productName) {
      out.push({
        toothId: 'source_pair',
        where: declared.id,
        reason: `имена расходятся: grid «${row.productName}», scalars «${declared.productName}»`,
      });
    }
    if (row.rank !== declared.rank) {
      out.push({ toothId: 'source_pair', where: declared.id, reason: 'порядок тарифов расходится' });
    }
  }
  for (const row of grid?.rows ?? []) {
    if (!scalarIds.has(row.sku)) {
      out.push({ toothId: 'source_pair', where: row.sku, reason: 'тариф есть в grid, но отсутствует в scalars' });
    }
  }
  for (const address of Object.keys(grid?.['//provisional'] ?? {}).filter((key) => key !== '//')) {
    const separator = address.indexOf('.');
    const sku = address.slice(0, separator);
    const entitlementId = address.slice(separator + 1);
    if (separator < 1 || !registryById.has(entitlementId)) {
      out.push({ toothId: 'public_projection_shape', where: address, reason: 'параметр отсутствует в публичном реестре' });
    }
    if (sku !== '*' && !rowsBySku.has(sku)) {
      out.push({ toothId: 'public_projection_shape', where: address, reason: 'неизвестное предложение' });
    }
  }
  return out;
}

export function validateProductTariffSources(grid, scalars) {
  const findings = sourcePairFindings(grid, scalars);
  if (findings.length > 0) {
    const detail = findings.map((item) => `[${item.toothId}] ${item.where}: ${item.reason}`).join('\n');
    throw new Error(`Тарифная проекция не может быть построена:\n${detail}`);
  }
}

export function buildProductTariffModel(grid, scalars) {
  validateProductTariffSources(grid, scalars);
  const rowsBySku = new Map(grid.rows.map((row) => [row.sku, row]));
  return {
    tariffs: [...scalars.tariffs]
      .sort((a, b) => a.rank - b.rank)
      .map((declared) => ({
        declared,
        grid: rowsBySku.get(declared.id),
        provisional: grid['//provisional'] ?? {},
        entitlements: grid.registry.filter((definition) => definition.kind !== 'quota'),
      })),
    provisional: Object.entries(grid['//provisional'] ?? {}).filter(([address]) => address !== '//'),
  };
}

const provisionalAt = (offer, id) =>
  Object.hasOwn(offer.provisional, `${offer.declared.id}.${id}`) || Object.hasOwn(offer.provisional, `*.${id}`);

function displayQuota(offer, scalarKey, entitlementId, unit = '') {
  return quotaFromSources(
    offer.declared[scalarKey],
    unit,
    offer.grid.cells[entitlementId],
    provisionalAt(offer, entitlementId),
  );
}

function renderOfferSummary(offer) {
  const { declared } = offer;
  return `| ${mdxSafe(declared.productName)} | ${displayQuota(offer, 'maxNodesPerMembrane', 'nodes.max')} | ${displayQuota(offer, 'maxUserWorkspaces', 'workspaces.user.max')} | ${displayQuota(offer, 'userStorageQuotaMiB', 'storage.hot', 'MiB')} | ${displayQuota(offer, 'coldStorageQuotaMiB', 'storage.cold', 'MiB')} | ${quota(declared.datasetSounds)} |`;
}

function renderOfferDetails(offer) {
  const { declared, grid } = offer;
  const lines = [];
  lines.push(`## ${mdxSafe(declared.productName)}`);
  lines.push('');
  lines.push('| Ограничение | Значение |');
  lines.push('|-------------|----------|');
  lines.push(`| ${QUOTA_LABELS['nodes.max']} | ${displayQuota(offer, 'maxNodesPerMembrane', 'nodes.max')} |`);
  lines.push(`| ${QUOTA_LABELS['workspaces.user.max']} | ${displayQuota(offer, 'maxUserWorkspaces', 'workspaces.user.max')} |`);
  lines.push(`| ${QUOTA_LABELS['storage.hot']} | ${displayQuota(offer, 'userStorageQuotaMiB', 'storage.hot', 'MiB')} |`);
  lines.push(`| ${QUOTA_LABELS['storage.cold']} | ${displayQuota(offer, 'coldStorageQuotaMiB', 'storage.cold', 'MiB')} |`);
  lines.push(`| ${QUOTA_LABELS['storage.buffer']} | ${displayQuota(offer, 'bufferQuotaMiB', 'storage.buffer', 'MiB')} |`);
  lines.push(`| Звуков в каталоге | ${quota(declared.datasetSounds)} |`);
  lines.push('');
  lines.push('| Возможность | Доступ |');
  lines.push('|-------------|--------|');
  for (const definition of offer.entitlements) {
    lines.push(`| ${mdxSafe(definition.description)} | ${availability(grid.cells[definition.id])} |`);
  }
  lines.push('');

  // «Уточняется» — по тому, что напечатано, а не по скаляру: клетка сетки закреплена → строки нет.
  const unresolved = Object.entries(SCALAR_LABELS)
    .filter(([key]) => {
      const entitlementId = {
        userStorageQuotaMiB: 'storage.hot',
        coldStorageQuotaMiB: 'storage.cold',
        bufferQuotaMiB: 'storage.buffer',
        maxNodesPerMembrane: 'nodes.max',
        maxUserWorkspaces: 'workspaces.user.max',
      }[key];
      if (!entitlementId) return declared[key] == null;
      const shown = displayQuota(offer, key, entitlementId, key.endsWith('QuotaMiB') ? 'MiB' : '');
      return shown === 'Не определено' || shown.startsWith('Не менее');
    })
    .filter(([key]) => {
      const entitlementId = {
        userStorageQuotaMiB: 'storage.hot',
        coldStorageQuotaMiB: 'storage.cold',
        bufferQuotaMiB: 'storage.buffer',
        maxNodesPerMembrane: 'nodes.max',
        maxUserWorkspaces: 'workspaces.user.max',
      }[key];
      if (!entitlementId) return true;
      return displayQuota(offer, key, entitlementId, key.endsWith('QuotaMiB') ? 'MiB' : '') !== 'Недоступно сейчас';
    })
    .map(([, label]) => label);
  if (unresolved.length > 0) {
    lines.push('**Что ещё уточняется**');
    lines.push('');
    for (const label of unresolved) lines.push(`- ${label}: точное значение пока не определено.`);
    lines.push('');
  }
  return lines;
}

function provisionalDescription(model, address) {
  const separator = address.indexOf('.');
  const sku = address.slice(0, separator);
  const entitlementId = address.slice(separator + 1);
  const offers = sku === '*'
    ? model.tariffs
    : model.tariffs.filter((offer) => offer.declared.id === sku);
  const definition = offers[0]?.entitlements.find((item) => item.id === entitlementId);
  const label = QUOTA_LABELS[entitlementId] ?? definition?.description;
  const subject = sku === '*' ? `Все предложения — ${label}` : `${offers[0]?.declared.productName ?? sku} — ${label}`;
  const first = offers.map((offer) => offer.grid.cells[entitlementId]).find(Boolean);
  if (first?.kind === 'quota' && typeof first.limit === 'number') {
    const value = first.unit === 'bytes' ? quota(bytesToMiB(first.limit), 'MiB') : quota(first.limit);
    if (first.limit === 0) return `**${mdxSafe(subject)}.** Недоступно по текущей матрице прав; отдельный числовой лимит не объявлен.`;
    return `**${mdxSafe(subject)}.** Текущая нижняя граница — ${value}; точный лимит уточняется.`;
  }
  if (first?.kind === 'catalog') {
    return `**${mdxSafe(subject)}.** Сейчас используется каталог предыдущего предложения; окончательный состав уточняется.`;
  }
  return `**${mdxSafe(subject)}.** Условие доступности уточняется.`;
}

export function renderProductTariffsMdx(model) {
  const lines = [
    '---',
    'title: Тарифы',
    'description: Возможности и ограничения трёх предложений Membrana без выдуманных цен.',
    '---',
    '',
    '{/* Производная страница. Пересобрать: `yarn docs:product:tariffs`. Руками не править. */}',
    '',
    '# Тарифы Membrana',
    '',
    'Тариф определяет число устройств, объём памяти, доступные инструменты анализа и право строить собственные детекции. Цены пока не опубликованы: здесь показаны только уже принятые продуктовые ограничения.',
    '',
    '> Доступность и числовые лимиты берутся из матрицы прав по правилу deny-by-default. Если лимит не принят, страница говорит об этом прямо.',
    '',
    '> Значение **«Не определено»** означает, что точное число пока не принято. Оно не заменяется нулём или значением соседнего тарифа.',
    '',
    '| Предложение | Устройства | Сценарии | Рабочая память | Холодное хранилище | Звуки |',
    '|-------------|------------|----------|-----------------|----------------------|-------|',
    ...model.tariffs.map(renderOfferSummary),
    '',
  ];

  for (const offer of model.tariffs) lines.push(...renderOfferDetails(offer));

  lines.push('## Предварительные значения');
  lines.push('');
  lines.push('Эти клетки нужны для полноты машинной матрицы, но пока являются нижними границами или временными значениями:');
  lines.push('');
  for (const [address] of model.provisional) {
    lines.push(`- ${provisionalDescription(model, address)}`);
  }
  lines.push('');
  lines.push('## Что открыть дальше');
  lines.push('');
  lines.push('- [Device Board](/device-board/mvp-overview) — редактор сценариев, ради которого применяются лимиты устройств и рабочих пространств.');
  lines.push('- [Каталог узлов](/device-board/nodes/index) — доступные строительные блоки сценария.');
  return `${lines.join('\n')}\n`;
}

export function loadProductTariffSources(gridPath, scalarsPath) {
  return {
    grid: JSON.parse(readFileSync(gridPath, 'utf8')),
    scalars: JSON.parse(readFileSync(scalarsPath, 'utf8')),
  };
}

export function renderProductTariffsFromFiles(gridPath, scalarsPath) {
  const { grid, scalars } = loadProductTariffSources(gridPath, scalarsPath);
  return renderProductTariffsMdx(buildProductTariffModel(grid, scalars));
}
