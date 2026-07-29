#!/usr/bin/env node
/**
 * yarn network:tooth — зуб контейнера network (#1449).
 *
 * Красное — только то, что делает знание о сети ЛОЖНЫМ:
 *   · нет словаря исходов или снимка;
 *   · снимок старше 48 часов (воспоминание выдаёт себя за факт);
 *   · словарь и код разошлись (перечень перестал быть закрытым);
 *   · исходящий вызов голым `fetch` там, где нужен proxy-aware путь —
 *     кроме каналов, чья прямота ратифицирована ADR (метка allow-bare-fetch).
 *
 * НЕ красное: billing / geo / model_removed — это состояние мира, а не дефект зуба.
 * Exit: 0 — чисто · 1 — находки · 2 — инструментальная.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { OUTCOME_IDS, TRANSPORT_OUTCOMES } from './lib/classify.mjs';
import { isStale } from './lib/probe-core.mjs';
import { repoRoot } from './probe.mjs';

const HOME = join(repoRoot, 'docs', 'network');

/** Файлы, где голый fetch — дефект: исходящий вызов из серверного кода. */
const PROXY_AWARE_ZONES = ['packages/background-office/src/modules', 'packages/background-office/src/lib'];

/**
 * Освобождение для канала, чья прямота ратифицирована решением: строка
 * `network-tooth:allow-bare-fetch ADR-0007` рядом с вызовом. Без живого ADR
 * освобождение не действует — иначе метка становится способом заглушить зуб.
 */
const EXEMPT_MARKER = /network-tooth:allow-bare-fetch\s+(ADR-\d{4})/u;

function adrExists(root, adrId) {
  const dir = join(root, 'docs', 'adr');
  if (!existsSync(dir)) return false;
  const num = adrId.slice(4);
  return readdirSync(dir).some((f) => f.startsWith(`${adrId}-`) || f.startsWith(`${num}-`));
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|mjs)$/u.test(e.name) && !/\.(test|spec)\./u.test(e.name)) out.push(p);
  }
  return out;
}

/**
 * @returns {{ bare: string[], exempt: { file: string, adr: string }[] }}
 *   bare — голый fetch без прикрытия; exempt — прямой путь по ратифицированному решению.
 */
export function scanFetchZones(root = repoRoot, zones = PROXY_AWARE_ZONES) {
  const bare = [];
  const exempt = [];
  for (const zone of zones) {
    for (const file of walk(join(root, zone))) {
      const src = readFileSync(file, 'utf8');
      if (!/\bfetch\s*\(/iu.test(src)) continue;
      const rel = relative(root, file).replace(/\\/gu, '/');
      const proxyAware =
        /ProxyAgent/u.test(src) || /dispatcher/u.test(src) || /proxyAwareFetch/u.test(src);
      if (proxyAware) continue;
      const marker = EXEMPT_MARKER.exec(src);
      if (marker && adrExists(root, marker[1])) {
        exempt.push({ file: rel, adr: marker[1] });
        continue;
      }
      if (marker) {
        bare.push(`${rel} (метка ссылается на ${marker[1]}, которого нет в docs/adr)`);
        continue;
      }
      bare.push(rel);
    }
  }
  return { bare, exempt };
}

function main() {
  const findings = [];
  const now = new Date().toISOString();

  const ymlPath = join(HOME, 'outcomes.yml');
  if (!existsSync(ymlPath)) {
    findings.push('нет словаря docs/network/outcomes.yml — классифицировать нечем');
  } else {
    const yml = readFileSync(ymlPath, 'utf8');
    const ids = [...yml.matchAll(/^\s{2}- id:\s*(\S+)/gmu)].map((m) => m[1]);
    const missing = OUTCOME_IDS.filter((x) => !ids.includes(x));
    const extra = ids.filter((x) => !OUTCOME_IDS.includes(x));
    if (missing.length) findings.push(`словарь не знает исходов из кода: ${missing.join(', ')}`);
    if (extra.length) findings.push(`код не знает исходов из словаря: ${extra.join(', ')}`);
    const ymlTransport = [...yml.matchAll(/^\s{2}- (\w+)$/gmu)].map((m) => m[1]);
    if (ymlTransport.sort().join() !== [...TRANSPORT_OUTCOMES].sort().join()) {
      findings.push('транспортное множество в словаре и коде разошлось — граница «сеть/не сеть» перестала быть одной');
    }
  }

  const snapPath = join(HOME, 'env.snapshot.json');
  if (!existsSync(snapPath)) {
    findings.push('нет снимка docs/network/env.snapshot.json — агент не узнает окружение заранее (yarn network:snapshot)');
  } else {
    const snap = JSON.parse(readFileSync(snapPath, 'utf8'));
    if (isStale(snap, now)) findings.push(`снимок старше 48 ч (${snap.generatedAt}) — воспоминание выдаёт себя за факт`);
    const mdPath = join(HOME, 'env.snapshot.md');
    if (!existsSync(mdPath) || statSync(mdPath).mtimeMs < statSync(snapPath).mtimeMs - 1000) {
      findings.push('витрина env.snapshot.md отстала от json — перегенерировать');
    }
  }

  const { bare, exempt } = findByZone();
  if (bare.length) {
    findings.push(
      `исходящий вызов голым fetch (не читает HTTPS_PROXY, пойдёт напрямую и получит гео-403): ${bare.join(', ')}`,
    );
  }

  // Освобождённые каналы держим на виду: молчание об исключении читается как «их нет».
  const exemptLine = exempt.length
    ? `  · прямой путь по решению: ${exempt.map((e) => `${e.file} (${e.adr})`).join(', ')}`
    : '';

  if (findings.length === 0) {
    console.log('network:tooth — ✓ чисто: словарь закрыт, снимок свеж, proxy-aware зоны без голого fetch');
    if (exemptLine) console.log(exemptLine);
    return 0;
  }
  console.error(`network:tooth — находок: ${findings.length}`);
  for (const f of findings) console.error(`  ✗ ${f}`);
  if (exemptLine) console.error(exemptLine);
  console.error('\nремонт: yarn network:snapshot · сверить docs/network/outcomes.yml с scripts/network/lib/classify.mjs');
  return 1;
}

function findByZone() {
  try {
    return scanFetchZones();
  } catch {
    return { bare: [], exempt: [] };
  }
}

if (process.argv[1]?.endsWith('tooth.mjs')) process.exit(main());
