#!/usr/bin/env node
/**
 * yarn network:probes <collect|pull|recompute> [опции]
 *
 * Ночной такт контейнера network (#1913, В4/В5 заседания, ратифицированы 13.08).
 *
 *   collect   — прогнать план зондов (registry/probes-plan.json) с этой машины,
 *               снимки → --out (по умолчанию cache/probes.jsonl). Голый node.
 *   pull      — артефакт последнего прогона workflow → analysis/<date>/probes.jsonl
 *               + пересчёт проекций registry; --commit — поимённый коммит дома.
 *   recompute — пересчёт проекций из уже лежащей ленты --date.
 *
 * Пересчёт НИКОГДА не трогает рукописные нормы registry (контракт README дома).
 * Зонды — read-only GET, ничего не чинят (#1425).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HANDWRITTEN_NORMS,
  checkAgainstPolicy,
  normalizeSnapshot,
  recomputeProjections,
  snapshotProblems,
} from './lib/network-probes.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOME_REL = 'docs/audit/network';
const PLAN_REL = `${HOME_REL}/registry/probes-plan.json`;
const POLICY_REL = `${HOME_REL}/registry/machine-policy.json`;
export const NIGHTLY_WORKFLOW = 'network-probes-nightly.yml';
export const NIGHTLY_ARTIFACT = 'network-probes';

/** Машина такта: CI → ci; иначе dev (office/media зондов не гоняют — прод в hard deny). */
function machineOf(env = process.env) {
  return env.GITHUB_ACTIONS === 'true' || env.CI === 'true' ? 'ci' : 'dev';
}

/**
 * Один HTTP-зонд: GET с таймаутом, proxy-aware по env (сборщик исполняет ту же
 * политику машин, которую наблюдает).
 * @param {string} target
 * @param {{ timeoutMs?: number }} [opts]
 */
export async function probeHttp(target, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 15000;
  const started = Date.now();
  try {
    /** @type {RequestInit & { dispatcher?: unknown }} */
    const init = { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) };
    const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
    if (proxyUrl) {
      const { ProxyAgent } = await import('undici');
      init.dispatcher = new ProxyAgent(proxyUrl);
    }
    const res = await fetch(target, init);
    return { executed: true, httpStatus: res.status, latencyMs: Date.now() - started, errorClass: null };
  } catch (err) {
    const code = /** @type {any} */ (err)?.cause?.code ?? /** @type {any} */ (err)?.name ?? 'error';
    return {
      executed: true,
      httpStatus: null,
      latencyMs: Date.now() - started,
      errorClass: `net:${String(code).toLowerCase()}`,
    };
  }
}

/** @param {string} cwd */
function readJson(cwd, rel) {
  return JSON.parse(readFileSync(join(cwd, rel), 'utf8'));
}

/**
 * collect: план → снимки → JSONL.
 * @param {{ cwd: string, out: string, now: Date, log: (s: string) => void, probe?: typeof probeHttp }} deps
 */
export async function collect(deps) {
  const plan = readJson(deps.cwd, PLAN_REL);
  const machine = machineOf();
  const lines = [];
  for (const entry of plan.probes) {
    const raw = await (deps.probe ?? probeHttp)(entry.target);
    const snap = normalizeSnapshot(entry, { ...raw, at: deps.now.toISOString(), machine });
    const problems = snapshotProblems(snap);
    if (problems.length) {
      deps.log(`✗ снимок ${entry.probe_id} невалиден: ${problems.join('; ')}`);
      return 1;
    }
    lines.push(JSON.stringify(snap));
    deps.log(`· ${entry.probe_id}: ${snap.outcome === 'failed' ? 'failed' : snap.status} (${snap.metrics?.latencyMs ?? '—'}ms${snap.metrics?.httpStatus ? `, http ${snap.metrics.httpStatus}` : ''})`);
  }
  mkdirSync(dirname(join(deps.cwd, deps.out)), { recursive: true });
  writeFileSync(join(deps.cwd, deps.out), `${lines.join('\n')}\n`, 'utf8');
  deps.log(`✓ collect: ${lines.length} снимков → ${deps.out}`);
  return 0;
}

/**
 * recompute: лента даты → overwrite-проекции. Рукописные нормы не трогаются.
 * @param {{ cwd: string, date: string, log: (s: string) => void }} deps
 * @returns {{ code: number, written: string[] }}
 */
export function recompute(deps) {
  const ledgerRel = `${HOME_REL}/analysis/${deps.date}/probes.jsonl`;
  const abs = join(deps.cwd, ledgerRel);
  if (!existsSync(abs)) {
    deps.log(`✗ ленты нет: ${ledgerRel} — проекции НЕ трогаю (пропуск ночи виден по meta.generated_at)`);
    return { code: 1, written: [] };
  }
  const records = readFileSync(abs, 'utf8')
    .split(/\r?\n/u)
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => JSON.parse(l));
  const { projections, summary } = recomputeProjections(records, { generatedAt: `${deps.date}T00:00:00.000Z` });
  const policy = readJson(deps.cwd, POLICY_REL);
  const findings = checkAgainstPolicy(records, policy);
  /** @type {Record<string, any>} */ (summary).findings = findings;

  const written = [];
  for (const [name, content] of [...Object.entries(projections), ['summary.json', summary]]) {
    if (HANDWRITTEN_NORMS.includes(String(name))) {
      throw new Error(`пересчёт попытался тронуть рукописную норму ${name} — контракт README дома нарушен`);
    }
    const rel = `${HOME_REL}/registry/${name}`;
    writeFileSync(join(deps.cwd, rel), `${JSON.stringify(content, null, 2)}\n`, 'utf8');
    written.push(rel);
  }
  deps.log(`✓ recompute: ${records.length} снимков → ${written.length} проекций; находок политики: ${findings.length}`);
  for (const f of findings) deps.log(`  · ${f.kind}: ${f.detail}`);
  return { code: 0, written: [ledgerRel, ...written] };
}

/**
 * pull: артефакт последнего завершённого прогона → лента дня + пересчёт (+ коммит).
 * @param {{ cwd: string, date: string, commit: boolean, log: (s: string) => void, exec?: typeof execFileSync }} deps
 */
export function pull(deps) {
  const exec = deps.exec ?? execFileSync;
  const destDir = join(deps.cwd, HOME_REL, 'analysis', deps.date);
  try {
    const listRaw = exec('gh', ['run', 'list', '--workflow', NIGHTLY_WORKFLOW, '--branch', 'main', '--status', 'completed', '--limit', '1', '--json', 'databaseId,conclusion,updatedAt'], { cwd: deps.cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const runs = JSON.parse(listRaw);
    if (!Array.isArray(runs) || runs.length === 0) {
      deps.log('✗ pull: завершённых прогонов ночного такта нет');
      return 1;
    }
    mkdirSync(destDir, { recursive: true });
    exec('gh', ['run', 'download', String(runs[0].databaseId), '--name', NIGHTLY_ARTIFACT, '--dir', destDir], { cwd: deps.cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    deps.log(`· pull: прогон ${runs[0].databaseId} (${runs[0].conclusion}) → ${HOME_REL}/analysis/${deps.date}/`);
  } catch (e) {
    deps.log(`✗ pull: не подтянулось — ${e instanceof Error ? e.message : e}`);
    return 1;
  }
  const r = recompute(deps);
  if (r.code !== 0) return r.code;
  if (deps.commit) {
    // Один коммит поимённо: лента + проекции (образец автозабора — белый список).
    exec('git', ['add', ...r.written], { cwd: deps.cwd, stdio: 'inherit' });
    exec('git', ['commit', '-m', `chore(network): ночной такт ${deps.date} — лента и проекции registry\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>`], { cwd: deps.cwd, stdio: 'inherit' });
    deps.log('✓ pull: лента + пересчёт закоммичены одним коммитом');
  }
  return 0;
}

/** @param {string[]} argv @param {{ cwd?: string, log?: (s: string) => void, now?: Date, probe?: typeof probeHttp, exec?: typeof execFileSync }} [deps] */
export async function runNetworkProbes(argv, deps = {}) {
  const cwd = deps.cwd ?? root;
  const log = deps.log ?? console.log;
  const cmd = argv[0];
  const opt = (name, fallback) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : fallback;
  };
  const now = deps.now ?? new Date();
  const today = now.toISOString().slice(0, 10);

  if (cmd === 'collect') {
    return collect({ cwd, out: opt('--out', `${HOME_REL}/cache/probes.jsonl`), now, log, probe: deps.probe });
  }
  if (cmd === 'recompute') {
    return recompute({ cwd, date: opt('--date', today), log }).code;
  }
  if (cmd === 'pull') {
    return pull({ cwd, date: opt('--date', today), commit: argv.includes('--commit'), log, exec: deps.exec });
  }
  log(`Usage: yarn network:probes <collect|pull|recompute> [--out f] [--date YYYY-MM-DD] [--commit]

  Канон: docs/meeting/network-container/MEETING_VERDICT.md (В4/В5). Дом: ${HOME_REL}.
  Зонды read-only (#1425); пересчёт не трогает рукописные нормы registry.`);
  return cmd ? 2 : 0;
}

const entry = (process.argv[1] ?? '').replace(/\\/gu, '/');
if (entry.endsWith('/network-probes.mjs')) {
  runNetworkProbes(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
