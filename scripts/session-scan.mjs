#!/usr/bin/env node
/**
 * yarn sessions:scan — инвентарь JSONL-транскриптов ДО чтения (membrana-case-mining).
 *
 *   yarn sessions:scan --markers "мостик,Фаррел,попугай"
 *   yarn sessions:scan --dir <путь> --markers "…"
 *
 * Одна строка на сессию: первая..последняя метка времени, размер, id, счётчики
 * маркеров; сортировка с РАННИХ (подсказка владельца 27.07: самые первые — самые
 * ценные). Счёт маркеров грубый (по строкам файла) — точность «в реплике» даёт
 * sessions:extract. Файлы стримятся, в контекст не тянутся.
 *
 * Exit: 0; 2 — каталог не найден / usage.
 */
import { createReadStream, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { execFileSync } from 'node:child_process';

import { foldScanLine, sessionIdOf } from './lib/session-mining.mjs';

/** Каталог транскриптов ПЕРВИЧНОГО дерева (worktree-aware: common-dir → корень primary). */
export function defaultTranscriptsDir() {
  try {
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim();
    const primaryRoot = common.replace(/[\\/]\.git$/u, '');
    // Слаг Claude Code: ':' '\' '/' '.' → '-', регистр пути сохраняется, буква диска
    // строчная (C:\Users\...\Membrana → c--Users-user190825-practice-Membrana).
    const slug = primaryRoot.replace(/[:\\/.]/gu, '-');
    return join(homedir(), '.claude', 'projects', slug.charAt(0).toLowerCase() + slug.slice(1));
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const o = { dir: null, markers: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dir') o.dir = argv[(i += 1)];
    else if (argv[i] === '--markers') o.markers = String(argv[(i += 1)] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  }
  return o;
}

async function scanFile(path, markers) {
  const state = { first: null, last: null, counts: {} };
  const rl = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) foldScanLine(line, markers, state);
  return state;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const dir = resolve(o.dir ?? defaultTranscriptsDir() ?? '');
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
  } catch {
    console.error(`sessions:scan — каталог транскриптов не найден: ${dir} (задай --dir)`);
    return 2;
  }
  const rows = [];
  for (const f of files) {
    const p = join(dir, f);
    const st = await scanFile(p, o.markers);
    rows.push({ id: sessionIdOf(f).slice(0, 12), size: statSync(p).size, ...st });
  }
  rows.sort((a, b) => String(a.first).localeCompare(String(b.first)));
  console.log(`sessions:scan — ${rows.length} сессий в ${dir} (сортировка с ранних)`);
  for (const r of rows) {
    const c = o.markers.map((m) => `${m.slice(0, 6)}:${r.counts[m] ?? 0}`).join(' ');
    console.log(`${r.first?.slice(0, 16) ?? '?'} .. ${r.last?.slice(5, 16) ?? '?'} ${(r.size / 1e6).toFixed(1).padStart(7)}MB ${r.id} ${c}`);
  }
  return 0;
}

if (process.argv[1]?.endsWith('session-scan.mjs')) process.exit(await main());
