/**
 * Правила зуба тарифной сетки — чистые функции (S1 плана интеграции).
 *
 * Здесь дублируется проверка формы из `packages/background-cabinet/src/domain/
 * tariff-grid.ts` СОЗНАТЕЛЬНО и минимально: тот модуль на TypeScript и живёт в
 * пакете, а зуб обязан гоняться каталогом тестов `scripts/` (иначе он мёртвый
 * провод — поимка на S0). Дублируется предикат, не решение: расхождение двух
 * реализаций само ловится тестом `tariff-grid-check.test.mjs`.
 *
 * Without fs/network: the CLI owns IO. #2333 v2 removed
 * docs/tariffs/tariff-scalars.json from quota authors; the live tooth now
 * judges the grid shape only.
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
