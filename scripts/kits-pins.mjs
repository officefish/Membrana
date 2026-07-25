#!/usr/bin/env node
/**
 * yarn kits:pins — привести опись кита (`pins`) к фактическому подграфу.
 *
 *   yarn kits:pins                      — план по всем жильцам (ничего не пишет)
 *   yarn kits:pins --id angelina-morning
 *   yarn kits:pins --id angelina-morning --write
 *   yarn kits:pins --json
 *
 * Exit:
 *   0 — описи совпадают с деревом (или запись прошла);
 *   1 — есть расхождения (без --write это ОТЧЁТ, а не поломка инструмента);
 *   2 — инструментальная ошибка / отказ записи (дефект схемы, недостижимый узел).
 *
 * Канон: kits/README.md (обновление пина — ОТДЕЛЬНЫЙ ревьюируемый коммит) ·
 * PINNED_SUBGRAPH_VERSIONING. Замыкание импортов не дублируется — берётся у auditKit.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditKit, listKitDirs } from './lib/kit-subgraph-audit.mjs';
import { blockersBeforeWrite, diffPins, nextManifest, renderPinsPlan } from './lib/kits-pins.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const kitsRoot = join(repoRoot, 'kits');

function parseArgs(argv) {
  const out = { id: null, write: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--id') out.id = argv[++i] ?? null;
    else if (a.startsWith('--id=')) out.id = a.slice('--id='.length);
    else if (a === '--write') out.write = true;
    else if (a === '--json') out.json = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: yarn kits:pins [--id <kit>] [--write] [--json]');
      return null;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args) {
  process.exitCode = 0;
} else if (!existsSync(kitsRoot)) {
  console.error('✖ инструментальная ошибка: каталог kits/ отсутствует');
  process.exitCode = 2;
} else {
  try {
    let dirs = listKitDirs(kitsRoot).filter((d) => existsSync(join(d, 'MANIFEST.json')));
    if (args.id) {
      const one = join(kitsRoot, args.id);
      if (!existsSync(join(one, 'MANIFEST.json'))) {
        console.error(`✖ инструментальная ошибка: нет kits/${args.id}/MANIFEST.json`);
        process.exitCode = 2;
        dirs = [];
      } else {
        dirs = [one];
      }
    }

    const results = [];
    for (const kitDir of dirs) {
      const id = basename(kitDir);
      const mPath = join(kitDir, 'MANIFEST.json');
      const manifest = JSON.parse(readFileSync(mPath, 'utf8'));
      // mode здесь безразличен: нужен только фактический подграф (actual).
      const report = auditKit({ repoRoot, kitDir, mode: 'pinned' });
      const blockers = blockersBeforeWrite(report);
      const d = diffPins(manifest.pins ?? {}, report.actual ?? {});
      results.push({ id, diff: d, blockers, written: false });

      if (!args.json) {
        console.log(renderPinsPlan(id, d));
        for (const b of blockers) console.log(`  ✖ ${b}`);
      }

      if (args.write) {
        if (blockers.length > 0) {
          // Зелёная опись не должна прикрывать реальную дыру — пишем только по чистому аудиту.
          if (!args.json) console.log(`  ↳ запись отменена: сначала чинить дефекты выше`);
          process.exitCode = 2;
          continue;
        }
        if (d.clean) continue;
        writeFileSync(mPath, `${JSON.stringify(nextManifest(manifest, report.actual), null, 2)}\n`, 'utf8');
        results[results.length - 1].written = true;
        if (!args.json) console.log(`  ↳ опись обновлена: ${mPath.replace(repoRoot, '').replace(/\\/gu, '/').slice(1)}`);
      }
    }

    if (args.json) console.log(JSON.stringify(results, null, 2));

    if (process.exitCode !== 2) {
      const dirty = results.filter((r) => !r.diff.clean && !r.written).length;
      if (dirty > 0 && !args.write) {
        console.log(`\nОписей разошлось: ${dirty}. Привести: yarn kits:pins --id <кит> --write (отдельным коммитом).`);
        process.exitCode = 1;
      } else {
        process.exitCode = 0;
      }
    }
  } catch (e) {
    console.error(`✖ инструментальная ошибка (это НЕ «0 расхождений»): ${e.message}`);
    process.exitCode = 2;
  }
}
