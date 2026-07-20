/**
 * CLI снов v2 (обстройка ядра): tick / digest / yield-проекция.
 *
 *   node scripts/dreams.mjs tick --day=YYYY-MM-DD --hour=N [--dry-run]
 *   node scripts/dreams.mjs digest --day=YYYY-MM-DD [--write]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { loadDotEnv } from './_anthropic-env.mjs';
import { DreamsLog, dayLogPath } from './lib/dreams-log.mjs';
import { commitDreamTick } from './lib/dreams-tick.mjs';
import { formatDreamDigestMd } from './lib/dreams-format.mjs';
import { enumeratePairs } from './lib/night-research.mjs';

loadDotEnv();

const argv = process.argv.slice(2);
const cmd = argv.find((a) => !a.startsWith('--')) ?? 'help';

function arg(name, fallback = null) {
  const hit = argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : fallback;
}

function volumeRoot() {
  return resolve(process.env.DREAMS_VOLUME_PATH?.trim() || join(process.cwd(), '.data', 'dreams-volume'));
}

function promptMd() {
  const p = resolve(process.cwd(), 'docs/prompts/DREAM_MASTER_PROMPT.md');
  return existsSync(p) ? readFileSync(p, 'utf8') : '## DREAM_MASTER_VERSION\n\n`0.0.0-dev`\n';
}

function pickPair(day, hour) {
  const regPath = resolve(process.cwd(), 'docs/truth/registry.json');
  if (!existsSync(regPath)) return null;
  const registry = JSON.parse(readFileSync(regPath, 'utf8'));
  const pairs = enumeratePairs(registry);
  if (pairs.length === 0) return null;
  const seed = `${day}|h${hour}`;
  let h = 2166136261 >>> 0;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const pair = pairs[h % pairs.length];
  return [pair.a.id, pair.b.id];
}

async function stubSynthesize(provider) {
  // CLI по умолчанию — stub (проверка стора/failover без сети). Live — office-модуль.
  return { ok: true, text: `[stub:${provider}] локальный сон без внешнего LLM`, score: 0.4 };
}

async function main() {
  if (cmd === 'help' || argv.includes('--help')) {
    console.log(`Usage:
  node scripts/dreams.mjs tick --day=YYYY-MM-DD --hour=0..23 [--dry-run]
  node scripts/dreams.mjs digest --day=YYYY-MM-DD [--write]`);
    return;
  }

  const day = arg('--day', new Date().toISOString().slice(0, 10));
  const root = volumeRoot();

  if (cmd === 'digest') {
    const log = new DreamsLog({ path: dayLogPath(root, day) });
    const proj = log.projectDay(day);
    const md = formatDreamDigestMd(proj);
    if (argv.includes('--write')) {
      const out = resolve(process.cwd(), 'docs/DREAMS_DIGEST.md');
      writeFileSync(out, md, 'utf8');
      console.error('Записано:', out);
    }
    console.log(md);
    return;
  }

  if (cmd === 'tick') {
    const hour = Number(arg('--hour', String(new Date().getUTCHours())));
    const dry = argv.includes('--dry-run');
    const pair = pickPair(day, hour);
    if (dry) {
      console.log(JSON.stringify({ day, hour, pair, dryRun: true }, null, 2));
      return;
    }
    mkdirSync(join(root, 'dreams'), { recursive: true });
    const log = new DreamsLog({ path: dayLogPath(root, day) });
    const result = await commitDreamTick(log, {
      day,
      hour,
      pair,
      promptMd: promptMd(),
      synthesize: stubSynthesize,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error(`unknown command: ${cmd}`);
  process.exitCode = 1;
}

await main();
