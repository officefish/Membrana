#!/usr/bin/env node
/**
 * yarn sessions:extract — реплики из транскрипта с указателями Raw (membrana-case-mining).
 *
 *   yarn sessions:extract <sessionId|файл> <маркер> [--max 20] [--full]
 *   yarn sessions:extract <sessionId|файл> --from 2026-07-22T09:18 --to 2026-07-22T09:35 [--role user]
 *
 * Печатает ТОЛЬКО реальные реплики (user/assistant, маркер в тексте реплики — не в
 * tool-результате), каждую с указателем {sessionId, uuid, timestamp} — форма Raw
 * кейсов M4. Цитату перед публикацией сверять с файлом побайтово (grep) — Raw священен.
 *
 * Exit: 0; 2 — файл не найден / usage.
 */
import { createReadStream, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import { formatPointer, fragmentAround, inWindow, matchesInReply, replyText, sessionIdOf } from './lib/session-mining.mjs';
import { defaultTranscriptsDir } from './session-scan.mjs';

function parseArgs(argv) {
  const o = { target: null, needle: null, max: 20, full: false, from: null, to: null, role: null };
  const pos = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--max') o.max = Number(argv[(i += 1)]);
    else if (a === '--full') o.full = true;
    else if (a === '--from') o.from = argv[(i += 1)];
    else if (a === '--to') o.to = argv[(i += 1)];
    else if (a === '--role') o.role = argv[(i += 1)];
    else pos.push(a);
  }
  o.target = pos[0] ?? null;
  o.needle = pos[1] ?? null;
  return o;
}

/** sessionId (или его префикс) → путь к файлу в каталоге транскриптов. */
function resolveTarget(target) {
  if (!target) return null;
  if (existsSync(target)) return target;
  const dir = defaultTranscriptsDir();
  if (!dir) return null;
  try {
    const hit = readdirSync(dir).find((f) => f.endsWith('.jsonl') && f.startsWith(target));
    return hit ? join(dir, hit) : null;
  } catch {
    return null;
  }
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.target || (!o.needle && !o.from)) {
    console.error('Usage: yarn sessions:extract <sessionId|файл> <маркер> [--max N] [--full] | --from ISO [--to ISO] [--role user|assistant]');
    return 2;
  }
  const file = resolveTarget(o.target);
  if (!file) {
    console.error(`sessions:extract — транскрипт не найден: ${o.target} (ни файл, ни sessionId-префикс в ${defaultTranscriptsDir() ?? '?'})`);
    return 2;
  }
  const sessionId = sessionIdOf(file.replace(/\\/gu, '/').split('/').pop());
  const rl = createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity });
  let shown = 0;
  for await (const line of rl) {
    if (o.needle && !line.includes(o.needle)) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    if (o.role && e.type !== o.role) continue;
    if (o.needle && !matchesInReply(e, o.needle)) continue;
    if (!o.needle) {
      if (!inWindow(e, o.from, o.to)) continue;
      if (replyText(e) == null) continue;
    }
    const text = replyText(e).trim();
    if (!text) continue;
    shown += 1;
    if (shown > o.max) {
      console.log('… (обрезано --max; повтори точнее)');
      break;
    }
    console.log(`\n===== [${e.type}] ${formatPointer(e, sessionId)}`);
    const body = o.full || !o.needle ? text.slice(0, 1200) : fragmentAround(text, o.needle);
    console.log(body.replace(/\n{3,}/gu, '\n\n'));
  }
  console.log(`\n>>> реплик показано: ${Math.min(shown, o.max)}${shown > o.max ? ` (всего ≥ ${shown})` : ''}`);
  return 0;
}

if (process.argv[1]?.endsWith('session-extract.mjs')) process.exit(await main());
