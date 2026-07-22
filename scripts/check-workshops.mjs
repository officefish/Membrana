#!/usr/bin/env node
/**
 * yarn validate:workshop — зуб контракта «домашней мастерской» (Ф2).
 *
 * Находит все docs/**\/workshop.manifest.json, валидирует каждый (validateWorkshop),
 * печатает таблицу и роняет прогон (exit 1) при структурных нарушениях. Предупреждения
 * (⚠ inspectElement — SHOULD) не роняют — легально для живущих мастерских (Ф5).
 *
 * Канон: docs/patterns/HOME_WORKSHOP.md · заседание home-workshop (Ф2/Ф5).
 */

import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listWorkshopManifests, validateWorkshop, workshopHome } from './lib/validate-workshop.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const manifests = listWorkshopManifests(repoRoot);

if (manifests.length === 0) {
  console.log('validate:workshop: манифестов мастерских не найдено (docs/**/workshop.manifest.json)');
  process.exit(0);
}

let invalid = 0;
let warned = 0;

console.log(`validate:workshop · манифестов: ${manifests.length}\n`);
for (const path of manifests) {
  const r = validateWorkshop(path, repoRoot);
  const home = workshopHome(path);
  const mark = r.valid ? '✓' : '✗';
  const rel = relative(repoRoot, path).replace(/\\/gu, '/');
  console.log(`${mark} ${home}  (${rel})`);
  for (const w of r.warnings) {
    console.log(`    ⚠ ${w}`);
    warned += 1;
  }
  for (const p of r.problems) {
    console.log(`    ✗ ${p}`);
  }
  if (!r.valid) invalid += 1;
}

console.log('');
if (invalid > 0) {
  console.error(`validate:workshop: НАРУШЕНИЙ — ${invalid} из ${manifests.length} манифестов не прошли контракт.`);
  process.exit(1);
}
console.log(`validate:workshop: OK — ${manifests.length} манифестов, предупреждений ${warned} (⚠ SHOULD, не блокирует).`);
