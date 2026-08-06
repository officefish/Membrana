import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildProductTariffModel,
  loadProductTariffSources,
  renderProductTariffsFromFiles,
  renderProductTariffsMdx,
  validateProductTariffSources,
} from './lib/product-docs-tariffs.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gridPath = resolve(root, 'docs/tariffs/tariff-grid.json');
const scalarsPath = resolve(root, 'docs/tariffs/tariff-scalars.json');
const outputPath = resolve(root, 'apps/docs/product/tariffs.mdx');

test('builds three offers in declared rank order', () => {
  const { grid, scalars } = loadProductTariffSources(gridPath, scalarsPath);
  const model = buildProductTariffModel(grid, scalars);
  assert.deepEqual(model.tariffs.map((item) => item.declared.id), [
    'free-v1',
    'checkpoint-v1',
    'observatory-v1',
  ]);
  const rendered = renderProductTariffsMdx(model);
  assert.match(rendered, /Цены пока не опубликованы/u);
  assert.match(rendered, /Не определено/u);
  assert.match(rendered, /Предварительные значения/u);
  assert.match(rendered, /Датчик \| 1 \| 3 \| 512 МБ \| Недоступно сейчас/u);
  assert.doesNotMatch(rendered, /free-v1\.|T4|T5|S1|владельц/iu);
  assert.doesNotMatch(rendered, /\*\*\/ — \/\/\.\*\*/u);
});

test('rejects a grid and scalars pair with different product names', () => {
  const { grid, scalars } = loadProductTariffSources(gridPath, scalarsPath);
  const broken = structuredClone(scalars);
  broken.tariffs[0].productName = 'Другое имя';
  assert.throws(() => validateProductTariffSources(grid, broken), /имена расходятся/u);
});

test('deny-by-default, public allowlist and registry-driven entitlements are enforced', () => {
  const { grid, scalars } = loadProductTariffSources(gridPath, scalarsPath);

  const missingEnabled = structuredClone(grid);
  delete missingEnabled.rows[0].cells['instrument.fft_trends'].enabled;
  assert.match(
    renderProductTariffsMdx(buildProductTariffModel(missingEnabled, scalars)),
    /Трендовый анализ спектра \| Нет/u,
  );

  const unknownPublicField = structuredClone(grid);
  unknownPublicField['//provisional']['free-v1.internal.secret'] = 'не должно выйти наружу';
  assert.throws(
    () => validateProductTariffSources(unknownPublicField, scalars),
    /параметр отсутствует в публичном реестре/u,
  );

  const newEntitlement = structuredClone(grid);
  newEntitlement.registry.push({
    id: 'instrument.new_public',
    kind: 'instrument',
    titleKey: 'tariff.instrument.newPublic',
    description: 'Новый публичный инструмент',
  });
  for (const row of newEntitlement.rows) {
    row.cells['instrument.new_public'] = { kind: 'instrument', enabled: row.rank > 0 };
  }
  assert.match(
    renderProductTariffsMdx(buildProductTariffModel(newEntitlement, scalars)),
    /Новый публичный инструмент/u,
  );
});

test('render is deterministic and the committed projection is current', () => {
  const first = renderProductTariffsFromFiles(gridPath, scalarsPath);
  const second = renderProductTariffsFromFiles(gridPath, scalarsPath);
  assert.equal(first, second);
  assert.equal(readFileSync(outputPath, 'utf8'), first);
});
