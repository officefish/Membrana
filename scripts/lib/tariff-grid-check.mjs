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

// ─── сверка с релизом матрицы (спринт tariff-matrix-2331, b4) ──────────────────

/** Ключ элемента массива для адреса: строки — по sku, реестр — по id, иначе индекс. */
function itemKey(item, i) {
  if (item && typeof item === 'object') {
    if (typeof item.sku === 'string') return item.sku;
    if (typeof item.id === 'string') return item.id;
  }
  return String(i);
}

const show = (v) => (v === undefined ? '(нет)' : JSON.stringify(v));
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const joinPath = (path, key) => (path ? `${path}.${key}` : key);

/**
 * Пути расхождения двух JSON-значений (детерминированно, без дат). Массивы строк/реестра
 * сравниваются по ключу (sku/id) и по порядку — порядок реестра = порядок pins релиза.
 * @returns {Array<{path:string, actual:unknown, expected:unknown}>}
 */
export function diffPaths(actual, expected, path = '') {
  if (Array.isArray(actual) && Array.isArray(expected)) {
    const out = [];
    const byKeyA = new Map(actual.map((x, i) => [itemKey(x, i), x]));
    const byKeyE = new Map(expected.map((x, i) => [itemKey(x, i), x]));
    for (const [k, e] of byKeyE) out.push(...diffPaths(byKeyA.get(k), e, joinPath(path, k)));
    for (const [k, a] of byKeyA) {
      if (!byKeyE.has(k)) out.push({ path: joinPath(path, k), actual: a, expected: undefined });
    }
    if (out.length === 0 && actual.map(itemKey).join(' ') !== expected.map(itemKey).join(' ')) {
      out.push({ path: path || '(документ)', actual: actual.map(itemKey), expected: expected.map(itemKey) });
    }
    return out;
  }
  if (isPlainObject(actual) && isPlainObject(expected)) {
    const out = [];
    for (const k of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
      out.push(...diffPaths(actual[k], expected[k], joinPath(path, k)));
    }
    return out;
  }
  if (JSON.stringify(actual) === JSON.stringify(expected)) return [];
  return [{ path: path || '(документ)', actual, expected }];
}

/**
 * G ↔ R — ЕДИНСТВЕННЫЙ красный предмет сверки чисел (консилиум
 * tariff-matrix-scalars-fate-2026-09-08): сетка на диске обязана быть проекцией релиза.
 * Порча: правка сетки руками → красный; пересев (yarn tariff:reseed) → зелёный.
 * @param {object} grid сетка на диске @param {object} projection proj(R) из reseed.mjs
 */
export function releaseCrossFindings(grid, projection) {
  return diffPaths(grid, projection).map(({ path, actual, expected }) =>
    finding(
      'release_drift',
      path,
      `сетка несёт ${show(actual)}, проекция релиза — ${show(expected)}: сетка правлена руками или не пересеяна (yarn tariff:reseed)`,
    ),
  );
}

export const SCALARS_SUPERSEDED_BY = 'docs/containers/strategic-docs/releases/tariff-matrix/release.json';

/**
 * Шапка скаляров S0 обязана объявлять себя замороженной эпохой сида, а не источником
 * правды: ключ `//supersededBy` указывает на релиз матрицы. Без него файл лжёт о роли.
 */
export function scalarsHeaderFindings(scalars) {
  if (scalars?.['//supersededBy'] !== SCALARS_SUPERSEDED_BY) {
    return [
      finding(
        'scalars_epoch',
        '//supersededBy',
        `tariff-scalars.json не объявляет supersede: ключ обязан равняться «${SCALARS_SUPERSEDED_BY}» (S0 — эпоха сида, не SSOT)`,
      ),
    ];
  }
  return [];
}

/**
 * S ↔ R — ОБЯЗАТЕЛЬНЫЙ не-красный список расхождений сида (эпоха S0) с сеткой-производной
 * релиза: полный, включая буфер, каталог и null старших. Печатается в основной stdout зуба,
 * на код возврата НЕ влияет — пересев базы = задание В. Не путать с `scalarsCrossFindings`
 * (её красит потребитель docs:product:tariffs:check — оставлена как есть).
 * @returns {Array<{path:string, S:unknown, R:unknown, unit:string}>}
 */
export function seedEpochDriftReport(grid, scalars) {
  const out = [];
  const byId = new Map((scalars?.tariffs ?? []).map((t) => [t.id, t]));
  const bytesToMib = (b) => (typeof b === 'number' ? b / (1024 * 1024) : null);
  const probes = [
    ['nodes.max', (t) => t.maxNodesPerMembrane ?? null, (c) => c?.limit ?? null, 'count'],
    ['workspaces.user.max', (t) => t.maxUserWorkspaces ?? null, (c) => c?.limit ?? null, 'count'],
    ['storage.hot', (t) => t.userStorageQuotaMiB ?? null, (c) => bytesToMib(c?.limit), 'MiB'],
    ['storage.cold', (t) => t.coldStorageQuotaMiB ?? null, (c) => bytesToMib(c?.limit), 'MiB'],
    ['storage.buffer', (t) => t.bufferQuotaMiB ?? null, (c) => bytesToMib(c?.limit), 'MiB'],
    ['dataset.sounds', (t) => t.datasetCatalogId ?? null, (c) => c?.catalogId ?? null, 'catalogId'],
  ];
  for (const row of grid?.rows ?? []) {
    const declared = byId.get(row.sku);
    if (!declared) {
      out.push({ path: row.sku, S: null, R: row.productName, unit: 'tariff' });
      continue;
    }
    for (const [id, pickS, pickR, unit] of probes) {
      const S = pickS(declared);
      const R = pickR(row.cells?.[id]);
      if (S !== R) out.push({ path: `${row.sku}.${id}`, S, R, unit });
    }
  }
  return out;
}
