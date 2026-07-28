#!/usr/bin/env node
/**
 * yarn mint:intent — доводка жеста mint_intent до минта (контракт V3, M3 · #1352).
 *
 *   yarn mint:intent --file <packet.json> [--execute] [--owner-stream]
 *
 * Путь: пакет → validPacket → admit_v1 → существующий `yarn truth mint` (dry / --execute)
 * ЛИБО reject с причиной из закрытого словаря. Обхода фасада нет; авто-прогон дневного
 * потока — BLOCK (этот CLI принимает ОДИН пакет за раз, по жесту lead).
 *
 * Снапшот пакета (append) пишется в docs/truth/packets.jsonl ПРИ КАЖДОМ успешном
 * --execute — инвариант ревизии M3 п.5: у нового кристалла есть пакет-основание.
 * Отсутствие жеста = всё остаётся потоком, и это успех, не сбой.
 *
 * Exit: 0 — admitted (dry/minted); 1 — reject (причина словарём); 2 — usage/ФС.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { admitV1, existingThoughtKeysFromRegistry, tokenFromPacket } from './lib/mint-intent.mjs';
import { makeLongTempDir } from './lib/long-temp-path.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i > -1 && argv[i + 1] != null && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};

function main() {
  const file = flag('file');
  if (!file) {
    console.error('Usage: yarn mint:intent --file <packet.json> [--execute] [--owner-stream]');
    return 2;
  }
  let packet;
  try {
    packet = JSON.parse(readFileSync(resolve(file), 'utf8'));
  } catch (e) {
    console.error(`mint:intent — пакет не читается: ${e.message}`);
    return 2;
  }
  let registry;
  try {
    registry = JSON.parse(readFileSync(join(repoRoot, 'docs/truth/registry.json'), 'utf8'));
  } catch (e) {
    console.error(`mint:intent — реестр графа не читается: ${e.message}`);
    return 2;
  }

  const verdict = admitV1(packet, {
    ownerMarkedStream: argv.includes('--owner-stream'),
    existingThoughtKeys: existingThoughtKeysFromRegistry(registry),
  });
  if (!verdict.ok) {
    console.error(`mint:intent — REJECT ${verdict.reason}: ${verdict.detail}`);
    console.error('  мысль остаётся потоком (конспект) — по контракту это состояние, не стыд');
    return 1;
  }
  if (!packet.tokenId || !packet.claim) {
    console.error('mint:intent — REJECT invalid_ref: для минта пакету нужны tokenId и claim (что чеканим)');
    return 1;
  }

  const token = tokenFromPacket(packet);
  const dir = makeLongTempDir(repoRoot, 'mint-intent-');
  const tokenFile = join(dir, 'token.json');
  writeFileSync(tokenFile, JSON.stringify(token, null, 2), 'utf8');

  const execute = argv.includes('--execute');
  const mintArgs = ['scripts/truth.mjs', 'mint', '--file', tokenFile];
  if (execute) mintArgs.push('--execute');
  console.log(`mint:intent — admit_v1 пройден (${packet.hardness ?? 'hardness n/a'}, mana: n/a — фаза before-mana) → truth mint${execute ? ' --execute' : ' (dry)'}`);
  try {
    execFileSync(process.execPath, mintArgs, { stdio: 'inherit', cwd: repoRoot });
  } catch (e) {
    return typeof e.status === 'number' ? e.status : 2;
  }

  if (execute) {
    // Инвариант M3 п.5: у каждого нового кристалла — append-снапшот пакета-основания.
    const snapPath = join(repoRoot, 'docs/truth/packets.jsonl');
    mkdirSync(dirname(snapPath), { recursive: true });
    appendFileSync(snapPath, JSON.stringify({ mintedTokenId: token.id, at: new Date().toISOString(), packet }) + '\n', 'utf8');
    console.log(`mint:intent — снапшот пакета дописан (docs/truth/packets.jsonl → ${token.id})`);
  }
  return 0;
}

if (process.argv[1]?.endsWith('mint-intent.mjs')) process.exit(main());
