/**
 * procedures-registry — реестр процедур слоя (Р5, #786).
 *
 * Канон: вердикт `m5-migration-manual`. `migrated` — производный предикат
 * `container ∧ vocabulary ∧ grammar`, НЕ хранимое поле (хранение разъехалось бы
 * с компонентами). Компоненты — {value, provenance}, у каждого true провенанс
 * `<persona>@<hash>` непуст. Немигрированные — честный `legacy`.
 *
 * Чистые функции; ФС — только у вызывающего.
 * Проекция REGISTRY.md несёт лицензию контракта (Ф3 #1220).
 */

import { stampContractHeader } from './procedure-contract-stamp.mjs';

export const PROCEDURE_KINDS = Object.freeze(['разработка', 'решение', 'ритм']);
/**
 * Ожидаемая раскладка корпуса по родам. Зуб намеренный: род не должен появляться и
 * исчезать молча — новая процедура обязана двинуть это число ОСОЗНАННО, вместе с
 * решением о её роде.
 *
 * 06.08: ритм 12 → 14. Обе процедуры разворачивания (`deploy-office-vds`,
 * `deploy-media-vps`, заведены 04.08 по ADR-0023) получили род `ритм` решением
 * держателя: деплой идёт по слову владельца, route-контракта рода «разработка» у него
 * нет, и живёт он в одной шкатулке с `ship-gate` и `test-runs` — гейт, прогон, запись
 * в общую ленту. Названная цена: если у деплоя вырастет route-контракт (планирование →
 * билд → раскатка → откат с отдельными держателями), род придётся переводить в
 * `разработка`.
 */
export const PROCEDURE_KIND_EXPECTED_COUNTS = Object.freeze({
  разработка: 8,
  решение: 4,
  ритм: 14,
});

function slash(p) {
  return String(p).split('\\').join('/');
}

function registryLink(homePath, id) {
  if (!homePath) return `\`${id}\``;
  const normalized = slash(homePath).replace(/\/$/u, '');
  const rel = normalized.startsWith('docs/procedures/')
    ? `./${normalized.slice('docs/procedures/'.length)}`
    : `../../${normalized}`;
  return `[\`${id}\`](${rel}/README.md)`;
}

/** Производный статус записи. */
export function derivedStatus(p) {
  const c = p?.container?.value === true;
  const v = p?.vocabulary?.value === true;
  const g = p?.grammar?.value === true;
  if (c && v && g) return 'migrated';
  if (c || v || g) return 'in-migration';
  return 'legacy';
}

/**
 * Дефекты реестра процедур.
 *
 * @param {object} reg распарсенный registry.json
 * @param {{taskIds?: string[], dirExists?: (homePath: string) => boolean,
 *   expectedKindCounts?: Record<string, number>}} [opts]
 *   taskIds — id из реестра задач (пересечение ключей запрещено);
 *   dirExists — проверка homePath (инъекция ради чистоты).
 * @returns {string[]}
 */
export function registryProblems(reg, opts = {}) {
  const problems = [];
  if (!Array.isArray(reg?.procedures)) return ['procedures — не массив'];
  const seen = new Set();
  const kindCounts = new Map(PROCEDURE_KINDS.map((k) => [k, 0]));
  for (const p of reg.procedures) {
    const id = p?.id ?? '<без id>';
    if (seen.has(id)) problems.push(`дубль id ${id}`);
    seen.add(id);
    if (!PROCEDURE_KINDS.includes(p?.procedureKind)) {
      problems.push(`${id}: procedureKind ∉ {${PROCEDURE_KINDS.join(', ')}}`);
    } else {
      kindCounts.set(p.procedureKind, (kindCounts.get(p.procedureKind) ?? 0) + 1);
    }
    if ('migrated' in (p ?? {})) {
      problems.push(`${id}: поле migrated ХРАНИТСЯ — вердикт M5 запрещает (только производный предикат)`);
    }
    if (typeof p?.holder !== 'string' || p.holder.trim() === '') problems.push(`${id}: holder пуст`);
    for (const comp of ['container', 'vocabulary', 'grammar']) {
      const c = p?.[comp];
      if (typeof c?.value !== 'boolean') { problems.push(`${id}: ${comp}.value — не boolean`); continue; }
      if (c.value && (typeof c.provenance !== 'string' || !/^[a-z]+@[\w-]+$/u.test(c.provenance))) {
        problems.push(`${id}: ${comp}=true без провенанса <persona>@<hash>`);
      }
      if (!c.value && c.provenance != null) problems.push(`${id}: ${comp}=false с провенансом — противоречие`);
    }
    const hasHome = typeof p?.homePath === 'string' && p.homePath.length > 0;
    if (p?.container?.value === true && !hasHome) problems.push(`${id}: container=true без homePath`);
    if (p?.container?.value === false && hasHome) problems.push(`${id}: homePath при container=false`);
    if (hasHome && opts.dirExists && !opts.dirExists(p.homePath)) {
      problems.push(`${id}: homePath «${p.homePath}» не существует на диске`);
    }
    if ((opts.taskIds ?? []).includes(id)) {
      problems.push(`${id}: ключ пересекается с реестром задач — реестры разные (вердикт M5)`);
    }
  }
  // Полнота (пробел ревизии 21.07: сосед заселил ritual-dreams мимо реестра за
  // время шипа Р5): каждый контейнер на диске обязан иметь запись — иначе реестр
  // лжёт статусом «источника истины».
  for (const dirId of opts.containerIds ?? []) {
    if (!seen.has(dirId)) {
      problems.push(`контейнер docs/procedures/${dirId} существует, но записи в реестре нет — дополни registry.json`);
    }
  }
  for (const [kind, expected] of Object.entries(opts.expectedKindCounts ?? {})) {
    const actual = kindCounts.get(kind) ?? 0;
    if (actual !== expected) {
      problems.push(`procedureKind ${kind}: ожидается ${expected}, фактически ${actual}`);
    }
  }
  return problems;
}

/** Генерируемая проекция REGISTRY.md (руками не правится; лицензия Ф3). */
export function renderRegistryMd(reg) {
  const rows = (reg?.procedures ?? []).map((p) => {
    const mark = (c) => (c?.value ? `✅ ${c.provenance}` : '—');
    const home = registryLink(p.homePath, p.id);
    return `| ${home} | ${p.procedureKind ?? '—'} | ${p.holder} | **${derivedStatus(p)}** | ${mark(p.container)} | ${mark(p.vocabulary)} | ${mark(p.grammar)} |`;
  });
  const counts = PROCEDURE_KINDS.map((kind) => {
    const n = (reg?.procedures ?? []).filter((p) => p.procedureKind === kind).length;
    return `${kind} ${n}`;
  }).join(' · ');
  return [
    stampContractHeader({
      generator: 'yarn procedures:registry',
      source: 'docs/procedures/registry.json',
    }),
    '',
    '# REGISTRY — процедуры слоя (проекция)',
    '',
    '> `migrated = container ∧ vocabulary ∧ grammar` — производный; статусы: migrated · in-migration · legacy.',
    `> procedureKind: ${counts}.`,
    '',
    '| Процедура | Род | Держатель | Статус | container | vocabulary | grammar |',
    '|-----------|-----|-----------|--------|-----------|------------|---------|',
    ...rows,
    '',
  ].join('\n');
}
