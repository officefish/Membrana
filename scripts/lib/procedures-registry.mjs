/**
 * procedures-registry — реестр процедур слоя (Р5, #786).
 *
 * Канон: вердикт `m5-migration-manual`. `migrated` — производный предикат
 * `container ∧ vocabulary ∧ grammar`, НЕ хранимое поле (хранение разъехалось бы
 * с компонентами). Компоненты — {value, provenance}, у каждого true провенанс
 * `<persona>@<hash>` непуст. Немигрированные — честный `legacy`.
 *
 * Чистые функции; ФС — только у вызывающего.
 */

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
 * @param {{taskIds?: string[], dirExists?: (homePath: string) => boolean}} [opts]
 *   taskIds — id из реестра задач (пересечение ключей запрещено);
 *   dirExists — проверка homePath (инъекция ради чистоты).
 * @returns {string[]}
 */
export function registryProblems(reg, opts = {}) {
  const problems = [];
  if (!Array.isArray(reg?.procedures)) return ['procedures — не массив'];
  const seen = new Set();
  for (const p of reg.procedures) {
    const id = p?.id ?? '<без id>';
    if (seen.has(id)) problems.push(`дубль id ${id}`);
    seen.add(id);
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
  return problems;
}

/** Генерируемая проекция REGISTRY.md (руками не правится). */
export function renderRegistryMd(reg) {
  const rows = (reg?.procedures ?? []).map((p) => {
    const mark = (c) => (c?.value ? `✅ ${c.provenance}` : '—');
    const home = p.homePath ? `[\`${p.id}\`](./${p.id}/README.md)` : `\`${p.id}\``;
    return `| ${home} | ${p.holder} | **${derivedStatus(p)}** | ${mark(p.container)} | ${mark(p.vocabulary)} | ${mark(p.grammar)} |`;
  });
  return [
    '<!-- generated: yarn procedures:registry из docs/procedures/registry.json — руками не править -->',
    '',
    '# REGISTRY — процедуры слоя (проекция)',
    '',
    '> `migrated = container ∧ vocabulary ∧ grammar` — производный; статусы: migrated · in-migration · legacy.',
    '',
    '| Процедура | Держатель | Статус | container | vocabulary | grammar |',
    '|-----------|-----------|--------|-----------|------------|---------|',
    ...rows,
    '',
  ].join('\n');
}
