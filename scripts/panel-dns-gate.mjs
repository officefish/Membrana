#!/usr/bin/env node
/**
 * panel-dns-gate — go/no-go гейт перед выпуском Let's Encrypt для panel.mmbrn.tech.
 *
 * OP4 эпика #438 (консилиум office-panel-contour): LE-issuance ТОЛЬКО после
 * консистентности DNS по ≥2 независимым резолверам — урок OM4-C, где ретраи
 * на устаревшем DNS сожгли LE rate-limit. Детерминированно: одинаковый
 * DNS-стейт → одинаковое решение, без ручного «на глаз».
 *
 *   yarn panel:dns-gate                         # panel.mmbrn.tech, консистентность
 *   yarn panel:dns-gate --expect 176.124.218.4  # + совпадение с IP VDS
 *   yarn panel:dns-gate --domain other.mmbrn.tech
 *
 * Exit: 0 = go; 4 = no-go (не выпускать сертификат); 1 = ошибка вызова.
 */
import { Resolver } from 'node:dns/promises';
import { fileURLToPath } from 'node:url';

const DEFAULT_DOMAIN = 'panel.mmbrn.tech';
/** Независимые публичные резолверы (Cloudflare, Google, Quad9). */
export const GATE_RESOLVERS = ['1.1.1.1', '8.8.8.8', '9.9.9.9'];

// ─── чистое ядро (экспортируется для тестов) ─────────────────────────────────────

/**
 * @param {Array<{resolver:string, addrs?:string[], error?:string}>} results
 * @param {string} [expectedIp]
 * @returns {{go:boolean, reason:string}}
 */
export function evaluateDnsGate(results, expectedIp) {
  if (!results.length) return { go: false, reason: 'нет ответов резолверов' };

  const failed = results.filter((r) => r.error);
  if (failed.length) {
    return {
      go: false,
      reason: `резолверы с ошибкой: ${failed.map((r) => `${r.resolver} (${r.error})`).join(', ')}`,
    };
  }

  const sets = results.map((r) => [...new Set(r.addrs ?? [])].sort());
  if (sets.some((s) => s.length === 0)) {
    return { go: false, reason: 'пустой A-ответ у части резолверов (запись ещё не разъехалась)' };
  }

  const canon = JSON.stringify(sets[0]);
  if (!sets.every((s) => JSON.stringify(s) === canon)) {
    return {
      go: false,
      reason: `резолверы расходятся: ${results.map((r) => `${r.resolver}→[${(r.addrs ?? []).join(',')}]`).join(' ')}`,
    };
  }

  if (expectedIp && !sets[0].includes(expectedIp)) {
    return {
      go: false,
      reason: `A-записи [${sets[0].join(',')}] не содержат ожидаемый IP ${expectedIp}`,
    };
  }

  return { go: true, reason: `все резолверы согласны: [${sets[0].join(',')}]` };
}

/** Отчёт словом (не только цветом), моноширинное выравнивание. */
export function renderGateReport(domain, results, verdict) {
  const w = Math.max(...results.map((r) => r.resolver.length), 'resolver'.length);
  const L = [`panel-dns-gate: ${domain}`, ''];
  L.push(`${'resolver'.padEnd(w)} | ответ`);
  L.push(`${'-'.repeat(w)}-+------`);
  for (const r of results) {
    L.push(`${r.resolver.padEnd(w)} | ${r.error ? `error: ${r.error}` : (r.addrs ?? []).join(', ') || '(пусто)'}`);
  }
  L.push('');
  L.push(`${verdict.go ? '[go]' : '[no-go]'} ${verdict.reason}`);
  if (!verdict.go) L.push('LE-сертификат НЕ выпускать (урок OM4-C: rate-limit на устаревшем DNS).');
  return L.join('\n');
}

// ─── IO ──────────────────────────────────────────────────────────────────────────

async function resolveVia(server, domain) {
  const resolver = new Resolver({ timeout: 5_000, tries: 1 });
  resolver.setServers([server]);
  try {
    return { resolver: server, addrs: await resolver.resolve4(domain) };
  } catch (e) {
    return { resolver: server, error: e?.code ?? e?.message ?? String(e) };
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i !== -1 ? argv[i + 1] : undefined;
  };
  const domain = arg('domain') ?? DEFAULT_DOMAIN;
  const expect = arg('expect');

  const results = await Promise.all(GATE_RESOLVERS.map((s) => resolveVia(s, domain)));
  const verdict = evaluateDnsGate(results, expect);
  console.log(renderGateReport(domain, results, verdict));
  process.exit(verdict.go ? 0 : 4);
}

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
