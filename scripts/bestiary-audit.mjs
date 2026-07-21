#!/usr/bin/env node
/**
 * yarn bestiary:audit — покрытие BESTIARY specimen’ами (B2 / #881).
 *
 * Exit:
 *   0 — каждый class ≥1 hit на docs/audit/bestiary/specimens/<class>/;
 *   1 — есть непокрытый class (анти-украшение / анти-молчун контейнера);
 *   2 — инструментальная ошибка.
 *
 * Флаги:
 *   --json     сырой JSON
 *   --no-write не перезаписывать registry/BESTIARY_LIST.md
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  auditSpecimenCoverage,
  writeBestiaryList,
} from './lib/bestiary-audit.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  let json = false;
  let write = true;
  for (const a of argv) {
    if (a === '--json') json = true;
    else if (a === '--no-write') write = false;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: yarn bestiary:audit [--json] [--no-write]');
      process.exitCode = 0;
      return null;
    }
  }
  return { json, write };
}

function headSha() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();
  } catch {
    return '—';
  }
}

const args = parseArgs(process.argv.slice(2));
if (!args) {
  /* help */
} else {
  const specimens = join(repoRoot, 'docs', 'audit', 'bestiary', 'specimens');
  if (!existsSync(specimens)) {
    console.error('✖ инструментальная ошибка: нет docs/audit/bestiary/specimens/');
    process.exitCode = 2;
  } else {
    try {
      const report = auditSpecimenCoverage(repoRoot);
      if (args.write) {
        writeBestiaryList(repoRoot, report, {
          date: new Date().toISOString().slice(0, 10),
          headSha: headSha(),
        });
      }
      if (args.json) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      } else {
        console.log('# bestiary:audit — покрытие specimen’ами\n');
        for (const r of report.rows) {
          const mark = r.covered ? '✅' : '❌';
          console.log(
            `${mark} ${r.defectClass.padEnd(12)} hits=${r.hits} files=${r.specimenFiles.length || 0}`,
          );
        }
        console.log(
          `\nПокрытие: ${report.rows.filter((r) => r.covered).length}/${report.rows.length}` +
            (args.write ? ' · записан registry/BESTIARY_LIST.md' : ''),
        );
        if (!report.ok) {
          console.log('\nНепокрытые классы (детектор не ловит бетий в хранилище):');
          for (const u of report.uncovered) console.log(`  - ${u.defectClass}`);
        }
      }
      process.exitCode = report.ok ? 0 : 1;
    } catch (e) {
      console.error(`✖ инструментальная ошибка: ${e instanceof Error ? e.message : e}`);
      process.exitCode = 2;
    }
  }
}
