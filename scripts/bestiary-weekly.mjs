#!/usr/bin/env node
/**
 * yarn bestiary:weekly — недельный прогон бестиария → analysis/ (B4 / #883).
 *
 * Exit:
 *   0 — линза ran, specimens покрыты, не silent-hunter;
 *   1 — not-run / silent-hunter / непокрытый class;
 *   2 — инструментальная ошибка.
 *
 * Флаги:
 *   --json       сырой JSON отчёта
 *   --no-write   не писать analysis/bestiary-run-YYYY-MM-DD.md
 *   --date ISO   дата снимка (по умолчанию сегодня UTC)
 *   --extra path дополнительные объекты (повтор флага)
 */
import { execFileSync } from 'node:child_process';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildWeeklyReport,
  writeWeeklyReport,
} from './lib/bestiary-weekly.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  let json = false;
  let write = true;
  /** @type {string | undefined} */
  let date;
  /** @type {string[]} */
  const extraRels = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') json = true;
    else if (a === '--no-write') write = false;
    else if (a === '--date') {
      date = argv[++i];
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.error('✖ --date требует YYYY-MM-DD');
        process.exitCode = 2;
        return null;
      }
    } else if (a === '--extra') {
      const p = argv[++i];
      if (!p) {
        console.error('✖ --extra требует путь');
        process.exitCode = 2;
        return null;
      }
      extraRels.push(p.replace(/\\/g, '/'));
    } else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: yarn bestiary:weekly [--json] [--no-write] [--date YYYY-MM-DD] [--extra path]…',
      );
      process.exitCode = 0;
      return null;
    } else {
      console.error(`✖ неизвестный флаг: ${a}`);
      process.exitCode = 2;
      return null;
    }
  }
  return { json, write, date, extraRels };
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
  /* help / bad args */
} else {
  try {
    const report = buildWeeklyReport(repoRoot, {
      date: args.date,
      headSha: headSha(),
      extraRels: args.extraRels,
    });

    /** @type {string | null} */
    let written = null;
    if (args.write) {
      written = writeWeeklyReport(repoRoot, report);
    }

    if (args.json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            ...report,
            written: written
              ? relative(repoRoot, written).replace(/\\/g, '/')
              : null,
          },
          null,
          2,
        )}\n`,
      );
    } else {
      console.log('# bestiary:weekly — недельный прогон\n');
      console.log(`Lens status: ${report.lensStatus}`);
      console.log(
        `Objects: ${report.objectsReadable}/${report.objectsScanned} readable · findings=${report.findings.length}`,
      );
      for (const row of report.trend) {
        const d =
          row.delta === null
            ? 'base'
            : row.delta > 0
              ? `+${row.delta}`
              : String(row.delta);
        console.log(
          `  ${row.defectClass.padEnd(14)} hits=${String(row.current).padStart(3)}  Δ=${d}`,
        );
      }
      if (report.previous) {
        console.log(`\nTrend vs ${report.previous.path}`);
      } else {
        console.log('\nTrend: нет предыдущего снимка (базовая линия)');
      }
      if (written) {
        console.log(
          `Записан: ${relative(repoRoot, written).replace(/\\/g, '/')}`,
        );
      }
      if (report.lensStatus === 'not-run') {
        console.log('\n✖ not-run — линза не отработала (≠ clean)');
      } else if (report.silentHunter) {
        console.log('\n✖ silent-hunter — 0 findings при живых specimens');
      } else if (!report.coverage.ok) {
        console.log('\n✖ непокрытые классы:');
        for (const u of report.coverage.uncovered) console.log(`  - ${u.defectClass}`);
      } else {
        console.log('\n✅ прогон ok · Summary в отчёте');
      }
    }

    process.exitCode = report.ok ? 0 : 1;
  } catch (e) {
    console.error(`✖ инструментальная ошибка: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 2;
  }
}
