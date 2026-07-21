#!/usr/bin/env node
/**
 * yarn kits:audit — зуб полноты подграфа китов (PINNED_SUBGRAPH / K2 #817).
 *
 * Exit:
 *   0 — проверка прогонялась; блокирующих находок нет (в т.ч. 0 жильцов — честно);
 *   1 — есть blocking-находки (missing_pin / sha_drift в pinned / orphan / schema…);
 *   2 — инструментальная ошибка (не «0 находок»).
 *
 * Флаги:
 *   --mode pinned|latest   (default: pinned)
 *   --id <kit-id>          один жилец; иначе все каталоги kits/<id>
 *   --json                 сырой JSON отчёта
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  auditKit,
  formatKitAuditTable,
  listKitDirs,
} from './lib/kit-subgraph-audit.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const kitsRoot = join(repoRoot, 'kits');

function parseArgs(argv) {
  let mode = 'pinned';
  let id = null;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode') {
      mode = argv[++i];
    } else if (a.startsWith('--mode=')) {
      mode = a.slice('--mode='.length);
    } else if (a === '--id') {
      id = argv[++i];
    } else if (a.startsWith('--id=')) {
      id = a.slice('--id='.length);
    } else if (a === '--json') {
      json = true;
    } else if (a === '--help' || a === '-h') {
      console.log(`Usage: yarn kits:audit [--mode pinned|latest] [--id <kit>] [--json]`);
      process.exitCode = 0;
      return null;
    }
  }
  if (mode !== 'pinned' && mode !== 'latest') {
    console.error(`✖ инструментальная ошибка: --mode должен быть pinned|latest, получено «${mode}»`);
    process.exitCode = 2;
    return null;
  }
  return { mode, id, json };
}

const args = parseArgs(process.argv.slice(2));
if (!args) {
  /* exitCode уже выставлен */
} else if (!existsSync(kitsRoot)) {
  console.error('✖ инструментальная ошибка: каталог kits/ отсутствует');
  process.exitCode = 2;
} else {
  try {
    let dirs = listKitDirs(kitsRoot);
    // Только каталоги с MANIFEST — жильцы; голый слой без жильцов = 0 kits
    dirs = dirs.filter((d) => existsSync(join(d, 'MANIFEST.json')));
    if (args.id) {
      const one = join(kitsRoot, args.id);
      if (!existsSync(join(one, 'MANIFEST.json'))) {
        console.error(`✖ инструментальная ошибка: нет kits/${args.id}/MANIFEST.json`);
        process.exitCode = 2;
      } else {
        dirs = [one];
      }
    }

    if (process.exitCode === 2) {
      /* already failed */
    } else if (dirs.length === 0) {
      console.log(
        `kits:audit — mode=${args.mode} · жильцов: 0 · находок: 0 (дом слоя без MANIFEST — проверка прогонялась)`,
      );
      process.exitCode = 0;
    } else {
      const reports = dirs.map((kitDir) => auditKit({ repoRoot, kitDir, mode: args.mode }));
      if (args.json) {
        console.log(JSON.stringify(reports, null, 2));
      } else {
        let blockingTotal = 0;
        for (const r of reports) {
          const blocking = r.findings.filter((f) => f.blocking).length;
          const warns = r.findings.filter((f) => !f.blocking).length;
          blockingTotal += blocking;
          console.log(
            `kits:audit — id=${r.id} · mode=${r.mode} · pins=${r.pinCount} · actual=${r.actualCount} · blocking=${blocking} · warn=${warns}`,
          );
          console.log(formatKitAuditTable(r));
          console.log('');
        }
        if (blockingTotal > 0) {
          console.error(`✖ blocking-находок: ${blockingTotal}`);
          process.exitCode = 1;
        } else {
          console.log('Подграфы совпали с пинами (или только warn в latest) — проверка прогонялась.');
          process.exitCode = 0;
        }
      }
      if (args.json) {
        const blockingTotal = reports.reduce(
          (n, r) => n + r.findings.filter((f) => f.blocking).length,
          0,
        );
        process.exitCode = blockingTotal > 0 ? 1 : 0;
      }
    }
  } catch (e) {
    console.error(`✖ инструментальная ошибка (это НЕ «0 находок»): ${e.message}`);
    process.exitCode = 2;
  }
}
