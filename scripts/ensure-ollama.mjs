#!/usr/bin/env node
/**
 * Preflight перед local-code-review: Ollama доступен, модель установлена.
 * На Windows пробует запустить Ollama.app, если API не отвечает.
 *
 * yarn ensure-ollama [--wait=sec] [--no-start]
 */
import { loadDotEnv } from './_anthropic-env.mjs';
import {
  getOllamaHost,
  getOllamaModel,
  modelIsAvailable,
  pingOllama,
  printOllamaHelp,
  sleep,
  tryStartOllamaApp,
} from './_ollama-client.mjs';

loadDotEnv();

const argv = process.argv.slice(2);
const help = argv.includes('--help') || argv.includes('-h');
const noStart = argv.includes('--no-start');
const waitArg = argv.find((a) => a.startsWith('--wait='));
const waitSec = waitArg ? Number.parseInt(waitArg.split('=')[1], 10) : 45;

if (help) {
  console.log(`Usage: node scripts/ensure-ollama.mjs [--wait=45] [--no-start] [--help]

Проверяет ${getOllamaHost()}/api/tags и наличие OLLAMA_MODEL (${getOllamaModel()}).
На Windows без --no-start пытается запустить Ollama.exe, если API недоступен.`);
  process.exit(0);
}

const host = getOllamaHost();
const model = getOllamaModel();

async function waitForOllama(deadlineMs) {
  const started = Date.now();
  let launched = null;
  while (Date.now() - started < deadlineMs) {
    const ping = await pingOllama({ host, timeoutMs: 4_000 });
    if (ping.ok) return ping;
    if (!noStart && launched === null) {
      launched = tryStartOllamaApp();
      if (launched) {
        console.error(`[ensure-ollama] запуск Ollama: ${launched}`);
      }
    }
    await sleep(2_000);
  }
  return pingOllama({ host, timeoutMs: 4_000 });
}

const result = await waitForOllama(Math.max(5, waitSec) * 1000);

if (!result.ok) {
  console.error(`[ensure-ollama] Ollama недоступен (${host}): ${result.error}`);
  printOllamaHelp({ host, model });
  process.exit(1);
}

console.error(`[ensure-ollama] OK: ${host} (${result.models.length} моделей)`);

if (!modelIsAvailable(model, result.models)) {
  console.error(`[ensure-ollama] модель «${model}» не найдена.`);
  console.error(`  Установлено: ${result.models.slice(0, 8).join(', ')}${result.models.length > 8 ? '…' : ''}`);
  printOllamaHelp({ host, model, extra: [`  ollama pull ${model}`] });
  process.exit(1);
}

console.error(`[ensure-ollama] модель «${model}» доступна`);
