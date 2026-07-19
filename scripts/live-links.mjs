#!/usr/bin/env node
/**
 * yarn live-links — «живые ссылки»: развернуть голые PR/Issue #N в markdown GitHub.
 *
 *   yarn live-links --file docs/comms/drafts/note.md          # in-place
 *   yarn live-links --file note.md --stdout                  # печать, файл не трогать
 *   yarn live-links --check --file note.md                   # exit 1, если остались голые
 *   echo "см. PR #681" | yarn live-links                     # stdin → stdout
 *
 * Не линза Ожегова и не отправка: только кликабельность ссылок.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { checkLiveLinks, expandLiveLinks } from './lib/live-links.mjs';

function parseArgs(argv) {
  const o = { check: false, stdout: false, inPlace: true };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--file' || a === '-f') o.file = argv[(i += 1)];
    else if (a === '--check') o.check = true;
    else if (a === '--stdout') {
      o.stdout = true;
      o.inPlace = false;
    }
    else if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--owner') o.owner = argv[(i += 1)];
    else if (a === '--repo') o.repo = argv[(i += 1)];
  }
  return o;
}

function usage() {
  console.log(`Usage:
  yarn live-links --file <path.md>           # развернуть in-place
  yarn live-links --file <path.md> --stdout  # печать результата
  yarn live-links --check --file <path.md>   # гейт: голые PR/Issue → exit 1
  yarn live-links < text.md                  # stdin → stdout

Опции: --owner <org> --repo <name> (default officefish/Membrana)`);
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    usage();
    process.exitCode = 0;
    return;
  }

  const repo = { owner: opts.owner, repo: opts.repo };
  let text;
  let filePath = null;
  if (opts.file) {
    filePath = resolve(process.cwd(), opts.file);
    text = readFileSync(filePath, 'utf8');
  } else if (!process.stdin.isTTY) {
    text = readFileSync(0, 'utf8');
    opts.stdout = true;
    opts.inPlace = false;
  } else {
    usage();
    process.exitCode = 1;
    return;
  }

  if (opts.check) {
    const { ok, bare } = checkLiveLinks(text);
    if (!ok) {
      console.error(`[live-links] голые ссылки (${bare.length}):`);
      for (const b of bare) {
        console.error(`  · ${b.raw} → ${b.kind} #${b.n}`);
      }
      console.error('Развернуть: yarn live-links --file <path>');
      process.exitCode = 1;
      return;
    }
    console.error('[live-links] OK — голых PR/Issue нет');
    process.exitCode = 0;
    return;
  }

  const { text: next, expanded } = expandLiveLinks(text, repo);
  if (opts.stdout || !filePath) {
    process.stdout.write(next.endsWith('\n') || next.length === 0 ? next : `${next}\n`);
  } else if (opts.inPlace) {
    if (expanded > 0) writeFileSync(filePath, next.endsWith('\n') ? next : `${next}\n`, 'utf8');
    console.error(`[live-links] развёрнуто: ${expanded}${filePath ? ` → ${opts.file}` : ''}`);
  }
  process.exitCode = 0;
}

try {
  main();
} catch (e) {
  console.error(`[live-links] ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
}
