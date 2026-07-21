#!/usr/bin/env node
/**
 * yarn check:layer-direction — CI-зуб границы слоёв (вердикт m3-boundary-manual).
 *
 * Exit-коды (M3: ошибка инструмента ОТЛИЧИМА от честного нуля нарушений):
 *   0 — граф построен, нарушений нет;
 *   1 — нарушения направленности (список с адресами);
 *   2 — инструментальная ошибка (граф не построился / правила нечитаемы).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildImportGraph, checkLayerDirection } from './lib/layer-direction.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rulesPath = resolve(repoRoot, 'docs/procedures/layer-rules.json');

let rules;
let graph;
try {
  rules = JSON.parse(readFileSync(rulesPath, 'utf8'));
  graph = buildImportGraph(repoRoot, ['scripts']);
} catch (e) {
  console.error(`✖ инструментальная ошибка (это НЕ «0 нарушений»): ${e.message}`);
  process.exit(2);
}

let rulesSha = 'n/a';
try {
  rulesSha = execFileSync('git', ['rev-parse', 'HEAD:docs/procedures/layer-rules.json'], {
    encoding: 'utf8', cwd: repoRoot,
  }).trim();
} catch { /* вне git / файл не закоммичен — шапка честно несёт n/a */ }

const { violations } = checkLayerDirection(graph, rules);
console.log(`layer-direction — рёбер: ${graph.length} · rulesSha: ${rulesSha} · нарушений: ${violations.length}`);
if (violations.length > 0) {
  for (const v of violations) console.error(`  ✖ ${v.from} → ${v.to} — ${v.reason}`);
  process.exit(1);
}
console.log('Границы соблюдены (список нарушений пуст — проверка прогонялась).');
