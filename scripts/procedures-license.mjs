#!/usr/bin/env node
/**
 * yarn procedures:license [--check] [--write]
 *
 * Лицензия контрактов процедурного слоя (Ф3 #1220).
 * --check  — зуб: все контракты valid (exit 1 иначе)
 * --write  — перегенерировать проекции со штампом parser@
 * (без флагов — отчёт)
 */
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PARSER_VERSION,
  auditProcedureContracts,
  loadContractsRegistry,
  renderLicensedContract,
} from './lib/procedure-contract-license.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const write = process.argv.includes('--write');

if (write) {
  const reg = loadContractsRegistry(repoRoot);
  for (const entry of reg.contracts) {
    const out = renderLicensedContract(entry, repoRoot);
    if (!out.ok) {
      console.error(`✖ ${entry.id}: ${out.error}`);
      process.exitCode = 1;
      continue;
    }
    writeFileSync(join(repoRoot, entry.path), out.text);
    console.log(`✓ ${entry.path} ← parser@${PARSER_VERSION}`);
  }
  if (process.exitCode) process.exit(process.exitCode);
}

const audit = auditProcedureContracts(repoRoot);
console.log(`procedures:license — parser@${audit.parserVersion}`);
if (audit.registryProblems.length) {
  for (const p of audit.registryProblems) console.error(`✖ registry: ${p}`);
}
for (const r of audit.results) {
  const mark = r.valid ? '✓' : '✖';
  console.log(`${mark} ${r.id} · provenance=${r.provenance} · compliance=${r.compliance}`);
  for (const p of r.problems) console.log(`    ${p}`);
}

if (check && !audit.ok) {
  console.error('✖ лицензии невалидны — см. docs/procedures/LICENSE.md');
  process.exitCode = 1;
} else if (audit.ok) {
  console.log('все контракты слоя лицензированы');
}
