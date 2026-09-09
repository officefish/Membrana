#!/usr/bin/env node
/**
 * buffer-watch — наблюдатель заполнения буфера прибора во время дежурства (#2284).
 *
 * Раз в N минут читает квоту media (`GET /v1/devices/:id/quota`) и пишет строку в журнал:
 * время, занято/квота, скорость, ОЖИДАЕМОЕ ВРЕМЯ ДО ПОЛНОГО. Ночь 05→06.09 показала, зачем:
 * буфер упёрся в квоту в 21:40Z, сервер отвечал 413, прибор не остановился (#2296) — и никто
 * не знал, во сколько ждать. Замер той ночи: 90 758 байт/с, гигабайт за 3 ч 17 мин.
 *
 * ЧЕСТНОСТЬ ETA. На первой строке своей скорости ещё нет — ETA считается по опорной скорости
 * ночи 05.09 и ПОМЕЧЕН как опорный (`rateSource: reference`). Со второй строки — по разности
 * двух чтений (`measured`). Опорное число нельзя выдать за замер: оно из другой ночи.
 *
 * FAIL-CLOSED. Нет адреса/ключа media, не-JSON, нет полей квоты — отказ (1), не строка с нулями.
 *
 * Usage:
 *   yarn buffer:watch [--device <uuid>] [--interval-min 5] [--count N | --once] [--log <path>]
 *   yarn buffer:watch --once                      # одна строка и выход
 *   yarn buffer:watch --interval-min 1 --count 2  # пробный интервал (DoD #2284)
 *
 * Журнал по умолчанию: docs/field/buffer-watch-<YYYY-MM-DD>.jsonl (append, одна строка = одно чтение).
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const FIREBAT_DEVICE_ID = '1c04f0bc-29b0-4d3f-a437-d87dc879579d';

/** Опорная скорость записи: ночь 05.09, 197 мин, 1 073 433 604 байт → 90 758 байт/с (5,19 МБ/мин). */
export const REFERENCE_RATE_BPS = 90758;
export const REFERENCE_RATE_SOURCE = 'reference: ночь 2026-09-05, 18:23–21:40Z';

/** Свободного места меньше одной пробы (~0,5 МБ) — буфер полон по смыслу, а не по равенству байт. */
export const FULL_THRESHOLD_BYTES = 700_000;

export const EXIT_OK = 0;
export const EXIT_REFUSED = 1;

/**
 * Одно чтение → строка журнала. Чистая функция: время и предыдущее чтение приходят снаружи.
 * @param {{ now: number, usedBytes: number, limitBytes: number, prev?: {ts: number, usedBytes: number} | null }} input
 */
export function watchLine(input) {
  const { now, usedBytes, limitBytes } = input;
  if (!Number.isFinite(usedBytes) || !Number.isFinite(limitBytes) || limitBytes <= 0) {
    throw new Error(`квота нечитаема: usedBytes=${usedBytes} limitBytes=${limitBytes}`);
  }
  const freeBytes = Math.max(0, limitBytes - usedBytes);
  const prev = input.prev ?? null;
  let ratePerSec = null;
  let rateSource = 'reference';
  if (prev && Number.isFinite(prev.ts) && Number.isFinite(prev.usedBytes) && now > prev.ts) {
    ratePerSec = (usedBytes - prev.usedBytes) / ((now - prev.ts) / 1000);
    rateSource = 'measured';
  }
  let status;
  let etaSec;
  if (freeBytes < FULL_THRESHOLD_BYTES) {
    status = 'full';
    etaSec = 0;
  } else if (rateSource === 'measured' && ratePerSec <= 0) {
    status = 'idle';
    etaSec = null;
  } else {
    status = 'filling';
    const rate = rateSource === 'measured' ? ratePerSec : REFERENCE_RATE_BPS;
    etaSec = Math.round(freeBytes / rate);
  }
  return {
    ts: new Date(now).toISOString(),
    usedBytes,
    limitBytes,
    freeBytes,
    fillPct: Math.round((usedBytes / limitBytes) * 1000) / 10,
    ratePerSec: ratePerSec === null ? null : Math.round(ratePerSec),
    rateSource,
    etaSec,
    fullAt: etaSec === null ? null : new Date(now + etaSec * 1000).toISOString(),
    status,
  };
}

export function formatDuration(sec) {
  if (sec === null || !Number.isFinite(sec)) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

/** Человеческая строка для консоли; JSON едет в журнал как есть. */
export function formatWatchLine(line) {
  const mb = (b) => (b / 1048576).toFixed(1);
  const rate = line.ratePerSec === null ? `опорно ${(REFERENCE_RATE_BPS / 1024).toFixed(0)} КБ/с` : `${(line.ratePerSec / 1024).toFixed(1)} КБ/с`;
  const when = line.fullAt ? ` (${line.fullAt.slice(11, 16)}Z)` : '';
  const eta =
    line.status === 'full' ? 'ПОЛОН' : line.status === 'idle' ? 'не заполняется' : `до полного ${formatDuration(line.etaSec)}${when}`;
  return `${line.ts.slice(0, 19)}Z · ${mb(line.usedBytes)}/${mb(line.limitBytes)} МБ (${line.fillPct}%) · ${rate} [${line.rateSource}] · ${eta}`;
}

function envValue(names) {
  const envPath = resolve(REPO, '.env');
  const text = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  for (const name of names) {
    const fromProcess = process.env[name];
    if (typeof fromProcess === 'string' && fromProcess.trim()) return fromProcess.trim();
    const m = new RegExp(`^${name}=(.*)$`, 'm').exec(text);
    if (m && m[1].trim()) return m[1].trim();
  }
  return null;
}

export function parseArgs(argv) {
  const out = { device: FIREBAT_DEVICE_ID, intervalMin: 5, count: Infinity, log: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--once') out.count = 1;
    else if (a === '--device') out.device = argv[++i] ?? out.device;
    else if (a === '--interval-min') out.intervalMin = Number(argv[++i]);
    else if (a === '--count') out.count = Number(argv[++i]);
    else if (a === '--log') out.log = argv[++i] ?? null;
  }
  if (!Number.isFinite(out.intervalMin) || out.intervalMin <= 0) throw new Error(`--interval-min: нужно положительное число минут`);
  if (!(out.count >= 1)) throw new Error(`--count: нужно число ≥ 1`);
  return out;
}

async function readQuota(base, token, deviceId) {
  const res = await fetch(`${base}/v1/devices/${encodeURIComponent(deviceId)}/quota`, {
    headers: { 'X-Membrana-Token': token },
  });
  if (!res.ok) throw new Error(`media ответила ${res.status} на квоту прибора ${deviceId.slice(0, 8)}`);
  const json = await res.json();
  const b = json?.buffer;
  if (!b || !Number.isFinite(b.usedBytes) || !Number.isFinite(b.limitBytes)) {
    throw new Error(`в ответе квоты нет buffer.usedBytes/limitBytes — поля: ${Object.keys(json ?? {}).join(', ') || 'нет'}`);
  }
  return { usedBytes: b.usedBytes, limitBytes: b.limitBytes };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(`✗ ОТКАЗ: ${e.message}`);
    return EXIT_REFUSED;
  }
  if (opts.help) {
    console.log('Usage: yarn buffer:watch [--device <uuid>] [--interval-min 5] [--count N | --once] [--log <path>]');
    return EXIT_OK;
  }
  const base = (envValue(['MEDIA_API_URL', 'VITE_MEDIA_SERVER_URL', 'BACKGROUND_MEDIA_API_URL']) ?? '').replace(/\/$/u, '');
  const token = envValue(['MEDIA_API_TOKEN', 'VITE_MEDIA_API_TOKEN', 'MEDIA_INTERNAL_TOKEN']);
  if (!base || !token) {
    console.error('✗ ОТКАЗ: не задан адрес или ключ media (MEDIA_API_URL / MEDIA_API_TOKEN).');
    return EXIT_REFUSED;
  }
  const day = new Date().toISOString().slice(0, 10);
  const logPath = resolve(REPO, opts.log ?? `docs/field/buffer-watch-${day}.jsonl`);
  console.error(`buffer:watch — прибор ${opts.device.slice(0, 8)}, каждые ${opts.intervalMin} мин, журнал ${logPath}`);
  console.error(`  опорная скорость до первого замера: ${REFERENCE_RATE_BPS} байт/с (${REFERENCE_RATE_SOURCE})`);

  let prev = null;
  for (let i = 0; i < opts.count; i += 1) {
    if (i > 0) await sleep(opts.intervalMin * 60_000);
    let q;
    try {
      q = await readQuota(base, token, opts.device);
    } catch (e) {
      console.error(`✗ ОТКАЗ: ${e.message}`);
      return EXIT_REFUSED;
    }
    const now = Date.now();
    const line = watchLine({ now, usedBytes: q.usedBytes, limitBytes: q.limitBytes, prev });
    appendFileSync(logPath, `${JSON.stringify({ device: opts.device, ...line })}\n`, 'utf8');
    console.log(formatWatchLine(line));
    prev = { ts: now, usedBytes: q.usedBytes };
  }
  return EXIT_OK;
}

if (process.argv[1] && process.argv[1].endsWith('buffer-watch.mjs')) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (e) => {
      console.error(`✗ ОТКАЗ: ${e instanceof Error ? e.message : e}`);
      process.exitCode = EXIT_REFUSED;
    },
  );
}
