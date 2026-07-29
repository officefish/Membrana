#!/usr/bin/env node
/**
 * yarn network:probe — зонд сетевых звеньев: бьёт по профилям обоими путями
 * (напрямую и через прокси) и классифицирует КАЖДЫЙ отказ по имени.
 *
 *   yarn network:probe [--profile <id>] [--json] [--timeout 12000]
 *
 * Ключи не передаются: цель — узнать характер отказа, а не работу аккаунта.
 * Экспорт `runProbes` — для snapshot/preflight.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildProbeResult, observationFrom } from './lib/probe-core.mjs';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_TIMEOUT = 12_000;

export function loadProfiles(file = 'docs/network/probes/default.json') {
  return JSON.parse(readFileSync(join(repoRoot, file), 'utf8')).profiles;
}

export function proxyUrl(env = process.env) {
  return env.HTTPS_PROXY?.trim() || env.HTTP_PROXY?.trim() || null;
}

/** Один вызов одним путём. Возвращает наблюдение, а не вердикт. */
async function callOnce(url, { dispatcher = undefined, viaProxy = false, timeout = DEFAULT_TIMEOUT }) {
  const started = Date.now();
  try {
    const { fetch: undiciFetch } = await import('undici');
    const res = await undiciFetch(url, {
      method: 'GET',
      ...(dispatcher ? { dispatcher } : {}),
      signal: AbortSignal.timeout(timeout),
    });
    // Тело нужно, чтобы отличить HTML-заглушку посредника от честного ответа API.
    const body = await res.text().catch(() => '');
    return {
      latencyMs: Date.now() - started,
      observation: observationFrom({ httpStatus: res.status, body: body.slice(0, 800), viaProxy }),
    };
  } catch (error) {
    return { latencyMs: Date.now() - started, observation: observationFrom({ error, viaProxy }) };
  }
}

export async function runProbes({ profiles, timeout = DEFAULT_TIMEOUT, env = process.env } = {}) {
  const list = profiles ?? loadProfiles();
  const proxy = proxyUrl(env);
  let ProxyAgent = null;
  if (proxy) ({ ProxyAgent } = await import('undici'));

  const out = [];
  for (const profile of list) {
    const paths = [{ path: 'direct', ...(await callOnce(profile.url, { timeout })) }];
    if (proxy && ProxyAgent) {
      const dispatcher = new ProxyAgent(proxy);
      paths.push({ path: 'proxy', ...(await callOnce(profile.url, { dispatcher, viaProxy: true, timeout })) });
      await dispatcher.close().catch(() => {});
    }
    out.push(buildProbeResult(profile, paths));
  }
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  const only = argv.includes('--profile') ? argv[argv.indexOf('--profile') + 1] : null;
  const profiles = loadProfiles().filter((p) => !only || p.id === only);
  if (profiles.length === 0) {
    console.error(`network:probe — профиль «${only}» не найден в docs/network/probes/default.json`);
    return 2;
  }
  const probes = await runProbes({ profiles });
  if (argv.includes('--json')) {
    console.log(JSON.stringify(probes, null, 2));
    return 0;
  }
  console.log(`network:probe — звеньев: ${probes.length}${proxyUrl() ? ' · прокси объявлен' : ' · прокси НЕ объявлен'}\n`);
  for (const p of probes) {
    const mark = p.outcome === 'ok' ? '✓' : p.isTransport ? '✗' : '·';
    console.log(`${mark} ${p.label} → ${p.outcome}`);
    for (const path of p.paths) console.log(`    ${path.path.padEnd(6)} ${path.outcome} — ${path.why} (${path.latencyMs} мс)`);
    if (p.proxyMatters) console.log('    ⚠ путь решает: прямой закрыт, через прокси открыт — это НЕ отказ сети');
  }
  return 0;
}

if (process.argv[1]?.endsWith('probe.mjs')) process.exitCode = await main();
