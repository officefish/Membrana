#!/usr/bin/env node
/**
 * firebat-poller — приложение полевого узла: само держит исходящий канал к серверу.
 *
 * ADR-0027 (спринт firebat-node-device, #1998): узел ОПРАШИВАЕТ очередь заданий своего
 * устройства (никаких входящих портов), исполняет «снять пробу N с» тем же трактом, что и
 * `field-capture.mjs` (ffmpeg → WAV → измерение → порог тишины), сдаёт результат файлом и
 * шлёт пульс. Ключ узла (`X-Membrana-Node-Key`) — вместо служебного токена медиа-сервиса:
 * в .env узла ключа `VITE_MEDIA_API_TOKEN` быть не должно.
 *
 * Словарь исходов опроса закрыт на весь тракт: `ok | stale_key | backoff` (ADR-0027 Р4).
 * `stale_key` — сервер ответил 401: ключ отозван/сменён → поллер ОСТАНАВЛИВАЕТСЯ и ждёт
 * переустановки ключа (переустановка приложения, b5), а не долбит сервер.
 *
 * Переносимость: скрипт без npm-зависимостей; рядом с ним лежат `field-capture.mjs` и
 * `lib/capture-sidecar.mjs` (тракт записи) и `.env` (четыре ключа FIELD_NODE_*).
 *
 * Usage:
 *   node firebat-poller.mjs            # бесконечный опрос (служба Windows, b5)
 *   node firebat-poller.mjs --once     # один цикл: опрос → (исполнение) → пульс; для приёмки b7
 *   node firebat-poller.mjs --dry-run  # опрос и пульс без съёмки: задание сдаётся словом «dry-run»
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  SILENCE_PEAK_DBFS, ffmpegBin, measureWav, parseAudioDevices, pickFieldDevice,
} from './field-capture.mjs';

export const POLLER_VERSION = '0.1.0';
export const NODE_KEY_HEADER = 'x-membrana-node-key';
/** Закрытый словарь исходов опроса — единый с сервером (TaskQueueService) и приёмкой b7. */
export const POLL_OUTCOMES = Object.freeze(['ok', 'stale_key', 'backoff']);
export const DEFAULTS = Object.freeze({ pollMs: 5_000, rate: 48_000, heartbeatEvery: 12, maxBackoffMs: 60_000 });

/** Ключи .env узла. Служебного токена среди них НЕТ — это и есть смысл ключа узла. */
export const ENV_KEYS = Object.freeze(['VITE_MEDIA_SERVER_URL', 'FIELD_NODE_DEVICE_ID', 'FIELD_NODE_KEY']);

export function parseArgs(argv) {
  const out = { once: false, dryRun: false, help: false };
  for (const a of argv) {
    if (a === '--once') out.once = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`неизвестный флаг: ${a}`);
  }
  return out;
}

/** Разбор .env в конфиг поллера; отсутствие ключа — именованный отказ, а не undefined в URL. */
export function parseEnv(raw) {
  const map = Object.fromEntries(
    raw.split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
  const missing = ENV_KEYS.filter((k) => !map[k]);
  if (missing.length > 0) throw new Error(`в .env узла нет ключей: ${missing.join(', ')} (контракт узла: ${ENV_KEYS.join(', ')})`);
  if (map.VITE_MEDIA_API_TOKEN) {
    throw new Error('в .env узла лежит служебный токен VITE_MEDIA_API_TOKEN — узлу он не положен (ADR-0027 Р3): убрать, оставить FIELD_NODE_KEY');
  }
  const pollMs = Number(map.FIELD_NODE_POLL_MS ?? DEFAULTS.pollMs);
  const rate = Number(map.FIELD_NODE_RATE ?? DEFAULTS.rate);
  if (!Number.isFinite(pollMs) || pollMs < 1000) throw new Error('FIELD_NODE_POLL_MS должен быть числом ≥ 1000');
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('FIELD_NODE_RATE должен быть положительным числом');
  return { base: map.VITE_MEDIA_SERVER_URL.replace(/\/+$/u, ''), device: map.FIELD_NODE_DEVICE_ID, key: map.FIELD_NODE_KEY, pollMs, rate };
}

export function envCandidates(base = import.meta.url) {
  return [new URL('./.env', base), new URL('../.env', base)];
}

/**
 * Перевод ответа сервера в исход словаря. HTTP-статус и тело читаются вместе:
 * 401 → stale_key (guard сервера); тело с outcome=backoff → backoff с retryAfterMs;
 * 200 с outcome=ok → ok (задание или пусто); всё прочее — ошибка транспорта (не исход).
 * @returns {{outcome:'ok', task: object|null} | {outcome:'stale_key'} | {outcome:'backoff', retryAfterMs:number} | {outcome:'transport_error', status:number}}
 */
export function classifyPoll(status, body) {
  if (status === 401) return { outcome: 'stale_key' };
  if (status >= 200 && status < 300 && body && body.outcome === 'backoff') {
    const retry = Number(body.retryAfterMs);
    return { outcome: 'backoff', retryAfterMs: Number.isFinite(retry) && retry > 0 ? retry : DEFAULTS.pollMs };
  }
  if (status >= 200 && status < 300 && body && body.outcome === 'ok') return { outcome: 'ok', task: body.task ?? null };
  return { outcome: 'transport_error', status };
}

/** Задержка до следующего опроса: backoff — сколько сказал сервер (с потолком), ошибка транспорта — удвоение, ok — штатный период. */
export function nextDelay(prev, classified, pollMs) {
  if (classified.outcome === 'backoff') return Math.min(classified.retryAfterMs, DEFAULTS.maxBackoffMs);
  if (classified.outcome === 'transport_error') return Math.min(Math.max(prev * 2, pollMs), DEFAULTS.maxBackoffMs);
  return pollMs;
}

/** Проверка задания до исполнения: словом, не стектрейсом. */
export function validateTask(task) {
  if (!task || typeof task !== 'object') return 'задание пустое';
  if (task.kind === 'capture') {
    if (!(Number(task.seconds) > 0)) return 'capture без seconds';
    if (!task.collectionId) return 'capture без collectionId';
    return null;
  }
  if (task.kind === 'diagnostics') return null;
  return `неизвестный вид задания: ${task.kind}`;
}

/** Объявленное из задания уходит как есть; измеряемые поля сервер меряет сам (#1950). */
export function buildResultMeta(task, stamp) {
  const declared = task.declared && typeof task.declared === 'object' ? task.declared : {};
  const notes = Object.entries(declared).map(([k, v]) => `${k}: ${v}`).join('; ');
  return {
    title: `node ${stamp}`,
    class: typeof declared.what === 'string' ? declared.what : 'field',
    source: 'firebat-poller',
    notes: notes ? `задание ${task.taskId}; ${notes}` : `задание ${task.taskId}`,
  };
}

function deviceAddress() {
  const res = spawnSync(ffmpegBin(), ['-hide_banner', '-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const picked = pickFieldDevice(parseAudioDevices(new TextDecoder('cp866').decode(res.stderr ?? Buffer.alloc(0))));
  if (!picked) throw new Error('полевой вход не найден по имени (Focusrite/Scarlett)');
  return picked.address;
}

/** Съёмка тем же трактом, что field-capture: вход 1 отдельным каналом, порог тишины. */
function capture(seconds, rate) {
  const stamp = new Date().toISOString().replace(/[:.]/gu, '-');
  const out = join(process.env.TEMP ?? '.', `node-${stamp}.wav`);
  execFileSync(ffmpegBin(), [
    '-hide_banner', '-loglevel', 'error',
    '-f', 'dshow', '-sample_rate', String(rate), '-channels', '2', '-i', `audio=${deviceAddress()}`,
    '-af', 'pan=mono|c0=c0', '-t', String(seconds), out,
  ], { stdio: 'inherit' });
  const level = measureWav(readFileSync(out));
  return { out, stamp, size: statSync(out).size, level };
}

async function api(cfg, path, init = {}) {
  const res = await fetch(`${cfg.base}/v1/devices/${cfg.device}/node${path}`, {
    ...init,
    headers: { [NODE_KEY_HEADER]: cfg.key, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(init.timeoutMs ?? 30_000),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function handInResult(cfg, task, result) {
  if (!result.file) {
    // Отказ — JSON-телом, не multipart-полем: иначе сервер слово не видит (Firebat 19.08).
    return api(cfg, `/tasks/${task.taskId}/result`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: result.error }), timeoutMs: 30_000,
    });
  }
  const fd = new FormData();
  fd.append('file', new Blob([readFileSync(result.file)], { type: 'audio/wav' }), `node-${result.stamp}.wav`);
  fd.append('meta', JSON.stringify(buildResultMeta(task, result.stamp)));
  return api(cfg, `/tasks/${task.taskId}/result`, { method: 'POST', body: fd, timeoutMs: 120_000 });
}

async function execute(cfg, task, dryRun) {
  const bad = validateTask(task);
  if (bad) return { error: bad };
  if (dryRun) return { error: 'dry-run: съёмка не выполнялась' };
  if (task.kind === 'diagnostics') return { error: `diagnostics: poller ${POLLER_VERSION}, rate ${cfg.rate}` };
  try {
    const c = capture(Number(task.seconds), cfg.rate);
    console.log(`poller — снято ${c.size} байт · пик ${c.level.peakDbfs.toFixed(1)} dBFS`);
    if (c.level.peakDbfs < SILENCE_PEAK_DBFS) return { error: `тишина: пик ${c.level.peakDbfs.toFixed(1)} dBFS ниже ${SILENCE_PEAK_DBFS} — наружу не отправляю` };
    return { file: c.out, stamp: c.stamp };
  } catch (e) {
    return { error: `съёмка не удалась: ${e instanceof Error ? e.message : e}` };
  }
}

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

async function main(argv) {
  let args;
  try { args = parseArgs(argv); } catch (e) { console.error(`poller — ${e.message}`); return 2; }
  if (args.help) { console.log('Usage: node firebat-poller.mjs [--once] [--dry-run]'); return 0; }
  const envPath = envCandidates().find((u) => existsSync(u));
  if (!envPath) { console.error('poller — нет .env рядом со скриптом'); return 2; }
  let cfg;
  try { cfg = parseEnv(readFileSync(envPath, 'utf8')); } catch (e) { console.error(`poller — ${e.message}`); return 2; }

  console.log(`poller ${POLLER_VERSION} — устройство ${cfg.device}, опрос каждые ${cfg.pollMs} мс, ${cfg.rate} Гц`);
  let delay = cfg.pollMs;
  let lastOutcome = null; // до первого исхода — ничего, не «ok» (пометка Ожегова b4)
  let cycles = 0;
  for (;;) {
    let classified;
    try {
      const { status, body } = await api(cfg, '/tasks');
      classified = classifyPoll(status, body);
    } catch (e) {
      classified = { outcome: 'transport_error', status: 0, error: e instanceof Error ? e.message : String(e) };
    }
    if (classified.outcome === 'stale_key') {
      console.error('poller — stale_key: ключ узла отозван или сменён. Останавливаюсь до переустановки ключа.');
      await api(cfg, '/heartbeat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pollerVersion: POLLER_VERSION, lastOutcome: 'stale_key' }) }).catch(() => {});
      return 3;
    }
    if (classified.outcome === 'ok' && classified.task) {
      console.log(`poller — задание ${classified.task.taskId} (${classified.task.kind})`);
      const result = await execute(cfg, classified.task, args.dryRun);
      const handed = await handInResult(cfg, classified.task, result).catch((e) => ({ status: 0, body: { error: String(e) } }));
      console.log(`poller — результат сдан: ${handed.status} ${result.file ? 'файл' : `слово «${result.error}»`}`);
    } else if (classified.outcome === 'transport_error') {
      console.error(`poller — транспорт: ${classified.status || classified.error}`);
    }
    lastOutcome = classified.outcome === 'transport_error' ? lastOutcome : classified.outcome;
    cycles += 1;
    if (args.once || cycles % DEFAULTS.heartbeatEvery === 0) {
      await api(cfg, '/heartbeat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pollerVersion: POLLER_VERSION, lastOutcome: lastOutcome ?? undefined }) }).catch(() => {});
    }
    if (args.once) return classified.outcome === 'transport_error' ? 1 : 0;
    delay = nextDelay(delay, classified, cfg.pollMs);
    await sleep(delay);
  }
}

const entry = (process.argv[1] ?? '').replace(/\\/gu, '/');
if (entry.endsWith('/firebat-poller.mjs')) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
