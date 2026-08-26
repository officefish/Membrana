#!/usr/bin/env node
/**
 * Read-only live journal meter for #2113.
 *
 * Measures the showcase endpoint only. It does not call listAllJournalItems and does not
 * write sample/report rows. Run during a live recording window to compare "after" with
 * the 23.08 field baseline.
 */
import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';

const DEFAULT_API = 'https://cabinet.membrana.space';
const DEFAULT_LIMIT = 50;
const DEFAULT_MIN_ITEMS = 2_500;
const DEFAULT_SAMPLE_WINDOW_MS = 7_000;

export const BASELINE_2113 = Object.freeze({
  source: 'docs/field/2026-08-23-night-duty-journal-congestion.md',
  feedItems: 2_400,
  requestsPerSample: 48,
  rowsPerSample: 115_000,
  dbUnderLoadMs: [3863, 8108, 8211],
  dbAfterStopMs: [260, 71, 355],
});

export function parseArgs(argv) {
  const out = {
    api: process.env.CABINET_API_URL || DEFAULT_API,
    token: process.env.CABINET_TOKEN || '',
    login: process.env.CABINET_LOGIN || 'admin',
    password: process.env.CABINET_PASSWORD || '',
    mediaDeviceId: process.env.CABINET_MEDIA_DEVICE_ID || '',
    limit: DEFAULT_LIMIT,
    minItems: DEFAULT_MIN_ITEMS,
    sampleWindowMs: DEFAULT_SAMPLE_WINDOW_MS,
    json: false,
    reportMd: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--api') out.api = requiredValue(argv, ++i, arg);
    else if (arg === '--token') out.token = requiredValue(argv, ++i, arg);
    else if (arg === '--login') out.login = requiredValue(argv, ++i, arg);
    else if (arg === '--password') out.password = requiredValue(argv, ++i, arg);
    else if (arg === '--media-device-id') out.mediaDeviceId = requiredValue(argv, ++i, arg);
    else if (arg === '--limit') out.limit = parsePositiveInt(requiredValue(argv, ++i, arg), arg);
    else if (arg === '--min-items') out.minItems = parsePositiveInt(requiredValue(argv, ++i, arg), arg);
    else if (arg === '--sample-window-ms') out.sampleWindowMs = parsePositiveInt(requiredValue(argv, ++i, arg), arg);
    else if (arg === '--json') out.json = true;
    else if (arg === '--report-md') out.reportMd = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else throw new Error(`unknown flag: ${arg}`);
  }
  out.api = out.api.replace(/\/+$/u, '');
  return out;
}

export function parseServerTiming(value) {
  if (!value) return null;
  for (const part of value.split(',')) {
    const segment = part.trim();
    if (!/^journal-db(?:;|$)/u.test(segment)) continue;
    const match = /(?:^|;)dur=([0-9]+(?:\.[0-9]+)?)(?:;|$)/u.exec(segment);
    if (match) return Number(match[1]);
  }
  return null;
}

export function summarizePages(pages, watermark) {
  const items = pages.flatMap((page) => page.items);
  const dbDurations = pages
    .map((page) => page.dbDurationMs)
    .filter((value) => typeof value === 'number' && Number.isFinite(value));
  const httpDurations = pages.map((page) => page.httpDurationMs);
  const newItems = items.filter((item) => Number(item.timestamp) > watermark);
  const requestsPerNewItem = newItems.length > 0
    ? Number((pages.length / newItems.length).toFixed(2))
    : null;
  return {
    requests: pages.length,
    returnedItems: items.length,
    newItems: newItems.length,
    requestsPerNewItem,
    dbMs: aggregate(dbDurations),
    httpMs: aggregate(httpDurations),
    dbTimingAvailable: dbDurations.length === pages.length,
  };
}

function aggregate(values) {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return {
    min: Number(Math.min(...values).toFixed(1)),
    avg: Number((sum / values.length).toFixed(1)),
    max: Number(Math.max(...values).toFixed(1)),
  };
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) throw new Error(`${flag}: value is required`);
  return value;
}

function parsePositiveInt(value, flag) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag}: positive integer is required`);
  }
  return parsed;
}

async function resolveToken(options) {
  if (options.token) return options.token;
  if (!options.password) {
    throw new Error('CABINET_TOKEN or CABINET_PASSWORD is required');
  }
  const res = await fetch(`${options.api}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: options.login, password: options.password }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  if (!body?.token || typeof body.token !== 'string') {
    throw new Error('login response has no token');
  }
  return body.token;
}

async function fetchJournalPage(options, token, query) {
  const params = new URLSearchParams();
  params.set('limit', String(options.limit));
  params.set('filter', 'all');
  if (options.mediaDeviceId) params.set('mediaDeviceId', options.mediaDeviceId);
  if (query.cursor) params.set('cursor', query.cursor);
  if (typeof query.since === 'number') params.set('since', String(query.since));

  const started = performance.now();
  const res = await fetch(`${options.api}/v1/telemetry/journal-items?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });
  const httpDurationMs = performance.now() - started;
  if (!res.ok) throw new Error(`journal-items failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  const headerTiming = res.headers.get('x-membrana-journal-db-duration-ms');
  const parsedHeader = headerTiming == null ? null : Number(headerTiming);
  const dbDurationMs = Number.isFinite(parsedHeader)
    ? parsedHeader
    : parseServerTiming(res.headers.get('server-timing'));
  return {
    items: Array.isArray(body.items) ? body.items : [],
    nextCursor: body.nextCursor ?? null,
    counts: body.counts ?? null,
    dbDurationMs,
    httpDurationMs: Number(httpDurationMs.toFixed(1)),
  };
}

async function walkJournal(options, token, since) {
  const pages = [];
  let cursor = null;
  do {
    const page = await fetchJournalPage(options, token, { cursor, since });
    pages.push(page);
    cursor = page.nextCursor;
  } while (cursor);
  return pages;
}

function latestTimestamp(items) {
  return Math.max(
    ...items
      .map((item) => Number(item.timestamp))
      .filter((timestamp) => Number.isFinite(timestamp)),
  );
}

function printHuman(result) {
  console.log('journal:measure-live — read-only #2113 after-meter');
  console.log(`  api: ${result.api}`);
  console.log(`  feed count: ${result.feedCount} (min ${result.minItems})`);
  console.log(`  sample window: ${result.sampleWindowMs} ms`);
  console.log(`  watermark: ${result.watermarkIso}`);
  console.log(`  journal-items requests per sample window: ${result.delta.requests}`);
  if (result.delta.requestsPerNewItem !== null) {
    console.log(`  requests per observed sample: ${result.delta.requestsPerNewItem}`);
  }
  console.log(`  returned items: ${result.delta.returnedItems}; new items after watermark: ${result.delta.newItems}`);
  if (result.delta.dbMs) {
    console.log(`  DB latency ms: min ${result.delta.dbMs.min} · avg ${result.delta.dbMs.avg} · max ${result.delta.dbMs.max}`);
  } else {
    console.log('  DB latency ms: unavailable (missing timing header)');
  }
  console.log(`  HTTP latency ms: min ${result.delta.httpMs.min} · avg ${result.delta.httpMs.avg} · max ${result.delta.httpMs.max}`);
  console.log(
    result.ok
      ? '  verdict: PASS'
      : `  verdict: WARN (${result.warnings.join('; ')})`,
  );
}

export function buildReportMarkdown(result) {
  const db = result.delta.dbMs
    ? `${result.delta.dbMs.avg} avg / ${result.delta.dbMs.max} max`
    : 'unavailable';
  const http = result.delta.httpMs
    ? `${result.delta.httpMs.avg} avg / ${result.delta.httpMs.max} max`
    : 'unavailable';
  const requestsPerSample = result.delta.requestsPerNewItem === null
    ? 'n/a'
    : String(result.delta.requestsPerNewItem);
  const warnings = result.warnings.length ? result.warnings.map((w) => `- ${w}`).join('\n') : '- none';
  return [
    `## #2113 after-meter — ${new Date(result.measuredAt).toISOString()}`,
    '',
    `Baseline: ${BASELINE_2113.source}`,
    '',
    '| Metric | 23.08 before | 28.08 after |',
    '|---|---:|---:|',
    `| Feed length | ~${BASELINE_2113.feedItems} | ${result.feedCount} |`,
    `| Requests per sample | ~${BASELINE_2113.requestsPerSample} | ${requestsPerSample} |`,
    `| Rows read per sample | ~${BASELINE_2113.rowsPerSample} | ${result.delta.returnedItems} returned over delta |`,
    `| DB latency ms | ${BASELINE_2113.dbUnderLoadMs.join(' / ')} under load | ${db} |`,
    `| HTTP latency ms | n/a | ${http} |`,
    '',
    `Command window: ${result.sampleWindowMs} ms; watermark: ${result.watermarkIso}; new items: ${result.delta.newItems}.`,
    `Verdict: ${result.ok ? 'PASS' : 'WARN'}.`,
    '',
    'Warnings:',
    warnings,
  ].join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log('Usage: yarn journal:measure-live [--api URL] [--token TOKEN | --login LOGIN --password PASS] [--media-device-id ID] [--sample-window-ms 7000] [--min-items 2500] [--json|--report-md]');
    return 0;
  }
  const token = await resolveToken(options);
  const first = await fetchJournalPage({ ...options, limit: 1 }, token, {});
  const feedCount = Number(first.counts?.all ?? first.items.length);
  const watermark = latestTimestamp(first.items);
  if (!Number.isFinite(watermark)) throw new Error('journal is empty: cannot establish watermark');

  await delay(options.sampleWindowMs);
  const deltaPages = await walkJournal(options, token, watermark);
  const delta = summarizePages(deltaPages, watermark);
  const warnings = [];
  if (feedCount < options.minItems) warnings.push(`feed count ${feedCount} < ${options.minItems}`);
  if (delta.newItems === 0) warnings.push('no new item observed during sample window');
  if (delta.newItems > 0) {
    const expectedMaxRequests = Math.max(1, Math.ceil(delta.newItems / options.limit));
    if (delta.requests > expectedMaxRequests + 1) {
      warnings.push(`delta pagination used ${delta.requests} requests for ${delta.newItems} new item(s)`);
    }
  }
  if (!delta.dbTimingAvailable) warnings.push('DB timing header missing on at least one page');
  if (delta.dbMs && delta.dbMs.avg >= 1000) warnings.push(`DB avg ${delta.dbMs.avg} ms is not in hundreds-ms range`);

  const result = {
    ok: warnings.length === 0,
    measuredAt: new Date().toISOString(),
    api: options.api,
    feedCount,
    minItems: options.minItems,
    sampleWindowMs: options.sampleWindowMs,
    watermark,
    watermarkIso: new Date(watermark).toISOString(),
    delta,
    warnings,
  };
  if (options.reportMd) console.log(buildReportMarkdown(result));
  else if (options.json) console.log(JSON.stringify(result, null, 2));
  else printHuman(result);
  return result.ok ? 0 : 1;
}

const entry = (process.argv[1] ?? '').replace(/\\/gu, '/');
if (entry.endsWith('/journal-measure-live.mjs')) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((err) => {
    console.error(`journal:measure-live — ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  });
}
