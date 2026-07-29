/**
 * Правила зуба тарифной сетки — чистые функции (S1 плана интеграции).
 *
 * Здесь дублируется проверка формы из `packages/background-cabinet/src/domain/
 * tariff-grid.ts` СОЗНАТЕЛЬНО и минимально: тот модуль на TypeScript и живёт в
 * пакете, а зуб обязан гоняться каталогом тестов `scripts/` (иначе он мёртвый
 * провод — поимка на S0). Дублируется предикат, не решение: расхождение двух
 * реализаций само ловится тестом `tariff-grid-check.test.mjs`.
 *
 * Без fs и сети: ФС — в `scripts/tariff-grid-validate.mjs`.
 */

/** Ожидаемые роды прав — закрытый список (вердикт M1). */
export const KINDS = Object.freeze(['quota', 'catalog', 'instrument', 'gated', 'produce']);

/** Находка: имя зуба + адрес + человеческая причина (норма M7). */
const finding = (toothId, where, reason) => ({ toothId, where, reason });

/**
 * Находки формы документа: полнота матрицы, закрытость реестра, совпадение рода.
 * @param {object} grid @returns {Array<{toothId:string, where:string, reason:string}>}
 */
export function gridFindings(grid) {
  if (!grid || !Array.isArray(grid.registry) || !Array.isArray(grid.rows)) {
    return [finding('grid_shape', '(документ)', 'документ не несёт registry и rows — форма нечитаема')];
  }

  const out = [];
  const kindById = new Map();
  for (const def of grid.registry) {
    if (kindById.has(def.id)) {
      out.push(finding('grid_shape', `registry.${def.id}`, 'право объявлено дважды — id обязан быть уникален'));
    }
    if (!KINDS.includes(def.kind)) {
      out.push(finding('grid_shape', `registry.${def.id}`, `неизвестный род «${def.kind}» — список родов закрыт`));
    }
    if (!def.titleKey) {
      out.push(finding('grid_shape', `registry.${def.id}`, 'нет titleKey — витрина выдумывала бы подпись из id'));
    }
    kindById.set(def.id, def.kind);
  }

  const seen = new Set();
  for (const row of grid.rows) {
    if (seen.has(row.sku)) out.push(finding('grid_shape', `rows.${row.sku}`, 'тариф встречается дважды'));
    seen.add(row.sku);

    const cells = row.cells ?? {};
    for (const def of grid.registry) {
      if (!(def.id in cells)) {
        out.push(
          finding('matrix_complete', `${row.sku}.${def.id}`, 'ячейки нет: право объявлено, но у тарифа не заполнено'),
        );
        continue;
      }
      const cell = cells[def.id];
      if (cell?.kind !== def.kind) {
        out.push(
          finding('kind_mismatch', `${row.sku}.${def.id}`, `род ячейки «${cell?.kind}» ≠ род реестра «${def.kind}»`),
        );
      }
      if (def.kind === 'quota' && typeof cell?.limit !== 'number') {
        out.push(finding('grid_shape', `${row.sku}.${def.id}`, 'у потолка нет числа limit'));
      }
      if (def.kind === 'gated' && !cell?.preconditionId) {
        out.push(
          finding('grid_shape', `${row.sku}.${def.id}`, 'возможность-с-предусловием без preconditionId — условие негде взять'),
        );
      }
    }

    for (const id of Object.keys(cells)) {
      if (!kindById.has(id)) {
        out.push(finding('unknown_entitlement_id', `${row.sku}.${id}`, 'ячейка ссылается на право вне реестра'));
      }
    }
  }
  return out;
}

/** МиБ → байты (единица объявления объёмов в декларации S0). */
export const mibToBytes = (mib) => (mib == null ? null : mib * 1024 * 1024);

/**
 * Сверка сетки с декларацией числовых потолков (S0): числа не должны
 * разъезжаться между двумя носителями. Сверяются только те значения, которые
 * владелец НАЗВАЛ — предварительные (`//provisional`) не судим.
 *
 * @param {object} grid @param {object} scalars
 */
export function scalarsCrossFindings(grid, scalars) {
  const out = [];
  const provisional = new Set(Object.keys(grid?.['//provisional'] ?? {}));
  const byId = new Map((scalars?.tariffs ?? []).map((t) => [t.id, t]));

  const pairs = [
    ['nodes.max', (t) => t.maxNodesPerMembrane],
    ['workspaces.user.max', (t) => t.maxUserWorkspaces],
    ['storage.hot', (t) => mibToBytes(t.userStorageQuotaMiB)],
    ['storage.cold', (t) => mibToBytes(t.coldStorageQuotaMiB)],
  ];

  for (const row of grid?.rows ?? []) {
    const declared = byId.get(row.sku);
    if (!declared) {
      out.push(
        finding('grid_shape', `rows.${row.sku}`, 'тариф есть в сетке, но не объявлен в tariff-scalars.json (S0)'),
      );
      continue;
    }
    for (const [id, pick] of pairs) {
      const address = `${row.sku}.${id}`;
      if (provisional.has(address) || provisional.has(`*.${id}`)) continue;
      const expected = pick(declared);
      if (expected == null) continue; // владелец не называл — сверять нечего
      const actual = row.cells?.[id]?.limit;
      if (actual !== expected) {
        out.push(
          finding(
            'scalars_drift',
            address,
            `сетка несёт ${actual}, декларация S0 — ${expected}: два носителя одного числа разъехались`,
          ),
        );
      }
    }
  }
  return out;
}
