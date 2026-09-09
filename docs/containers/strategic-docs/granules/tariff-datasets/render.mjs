/**
 * Function granule: tariff-datasets@1.0.0
 * Одна строка матрицы «Наборы звуков × три тарифа». Значения — ТОЛЬКО из resource.json рядом;
 * слова («набор блокпоста (заглушка)») и порядок колонок — из ядра паспорта. Шапку даёт шаблон tariff-matrix.
 *
 * @param {{ pin?: object, ctx: { granuleId: string, version: string } }} _input
 * @param {{ exec: (req: object) => Promise<unknown> }} _io
 * @returns {Promise<{ body: string }>}
 */
import { readFileSync } from 'node:fs';
import { parseResource, renderRows } from '../../../../../scripts/lib/tariff-matrix/passport.mjs';

export async function renderTariffDatasetsRow(_input, _io) {
  const raw = JSON.parse(readFileSync(new URL('./resource.json', import.meta.url), 'utf8'));
  const parsed = parseResource(raw);
  if (!parsed.ok) {
    throw new Error(`tariff-datasets/resource.json: ${parsed.findings.map((f) => `${f.where}: ${f.reason}`).join('; ')}`);
  }
  return { body: renderRows(parsed.resource) };
}
