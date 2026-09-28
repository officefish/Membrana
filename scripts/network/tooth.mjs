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
 *
 * ДВА КЛАССА НАХОДОК (#2495). Часть вызвана ИЗМЕНЕНИЕМ: словарь разошёлся с кодом,
 * появился голый fetch, снимок удалили или он не читается — это видно только тому, кто
 * так сделал. Часть — УХОДОМ ЗА СНИМКОМ: снимок лежит в репозитории и протухает по
 * КАЛЕНДАРЮ, витрина отстаёт по mtime файла. Второй класс краснеет у всех деревьев
 * сразу и ни от чьей правки не зависит. Класс выбирается ключом
 * `--snapshot-upkeep=warn|finding`; по умолчанию `finding` — прямой прогон, ритуал и
 * разбор судят уход жёстко. В предпушевом гейте стоит `warn`: там предмет —
 * отправляемое изменение, а не календарь (см. `.githooks/pre-push`, #2495).
 *
 * Свойство «воспоминание не выдаёт себя за факт» держится НЕ отказом push, а пометкой
 * у читающих снимок: `renderAgentBlock` и `renderSnapshotMd`
 * (scripts/network/lib/probe-core.mjs) печатают «устарел (>48 ч)» рядом с данными.
 * Предупреждение здесь объявляется вслух и называет ремонт — глушилки нет.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { OUTCOME_IDS, TRANSPORT_OUTCOMES } from './lib/classify.mjs';
import { isStale } from './lib/probe-core.mjs';
import { repoRoot } from './probe.mjs';

const HOME = join(repoRoot, 'docs', 'network');

/** Файлы, где голый fetch — дефект: исходящий вызов из серверного кода. */
const PROXY_AWARE_ZONES = ['packages/background-office/src/modules', 'packages/background-office/src/lib'];

/** Как судить уход за снимком: находка (по умолчанию) или объявленное предупреждение. */
export const SNAPSHOT_UPKEEP_MODES = Object.freeze(['finding', 'warn']);

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

/**
 * Разбор ключей. Опечатка в значении — инструментальная ошибка (код 2), а не молчаливое
 * ужесточение и не молчаливое смягчение: оба исхода читались бы как «так и хотели».
 *
 * @param {string[]} argv
 * @returns {{ snapshotUpkeep: 'finding'|'warn' }}
 */
export function parseArgs(argv = []) {
  let snapshotUpkeep = 'finding';
  for (const arg of argv) {
    const m = /^--snapshot-upkeep=(.*)$/u.exec(arg);
    if (!m) throw new Error(`network:tooth: неизвестный аргумент «${arg}»`);
    if (!SNAPSHOT_UPKEEP_MODES.includes(m[1])) {
      throw new Error(
        `network:tooth: --snapshot-upkeep принимает ${SNAPSHOT_UPKEEP_MODES.join('|')}, получено «${m[1]}»`,
      );
    }
    snapshotUpkeep = m[1];
  }
  return { snapshotUpkeep };
}

/**
 * Сбор находок. Без печати и без кода возврата — чтобы зуб зуба спрашивал предикат
 * напрямую, а не разбирал текст вывода.
 *
 * @param {{ root?: string, now?: string, snapshotUpkeep?: 'finding'|'warn' }} [opts]
 * @returns {{ findings: string[], warnings: string[], exempt: { file: string, adr: string }[] }}
 */
export function collect(opts = {}) {
  const root = opts.root ?? repoRoot;
  const now = opts.now ?? new Date().toISOString();
  const home = opts.root ? join(root, 'docs', 'network') : HOME;
  const findings = [];
  const warnings = [];
  // Уход за снимком: календарь и mtime витрины. Куда его писать — решает режим.
  const upkeep = opts.snapshotUpkeep === 'warn' ? warnings : findings;

  const ymlPath = join(home, 'outcomes.yml');
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

  const snapPath = join(home, 'env.snapshot.json');
  if (!existsSync(snapPath)) {
    findings.push('нет снимка docs/network/env.snapshot.json — агент не узнает окружение заранее (yarn network:snapshot)');
  } else {
    let snap = null;
    try {
      snap = JSON.parse(readFileSync(snapPath, 'utf8'));
    } catch (e) {
      // Нечитаемый снимок — не календарь, а сломанное содержание: находка в любом режиме.
      findings.push(`снимок docs/network/env.snapshot.json не читается (${e.message}) — yarn network:snapshot`);
    }
    if (snap) {
      if (isStale(snap, now)) {
        upkeep.push(`снимок старше 48 ч (${snap.generatedAt}) — воспоминание выдаёт себя за факт`);
      }
      const mdPath = join(home, 'env.snapshot.md');
      if (!existsSync(mdPath) || statSync(mdPath).mtimeMs < statSync(snapPath).mtimeMs - 1000) {
        upkeep.push('витрина env.snapshot.md отстала от json — перегенерировать');
      }
    }
  }

  const { bare, exempt } = findByZone(root);
  if (bare.length) {
    findings.push(
      `исходящий вызов голым fetch (не читает HTTPS_PROXY, пойдёт напрямую и получит гео-403): ${bare.join(', ')}`,
    );
  }

  return { findings, warnings, exempt };
}

const REPAIR = 'ремонт: yarn network:snapshot · сверить docs/network/outcomes.yml с scripts/network/lib/classify.mjs';

function main(argv = process.argv.slice(2)) {
  let cli;
  try {
    cli = parseArgs(argv);
  } catch (e) {
    console.error(e.message);
    return 2;
  }

  const { findings, warnings, exempt } = collect({ snapshotUpkeep: cli.snapshotUpkeep });

  // Освобождённые каналы держим на виду: молчание об исключении читается как «их нет».
  const exemptLine = exempt.length
    ? `  · прямой путь по решению: ${exempt.map((e) => `${e.file} (${e.adr})`).join(', ')}`
    : '';

  if (findings.length === 0) {
    if (warnings.length === 0) {
      console.log('network:tooth — ✓ чисто: словарь закрыт, снимок свеж, proxy-aware зоны без голого fetch');
    } else {
      // Не «чисто»: врать в свою пользу нельзя. Уход назван, ремонт назван, push не задержан.
      console.log(`network:tooth — ✓ по существу чисто; уход за снимком отстал (предупреждений: ${warnings.length})`);
      for (const w of warnings) console.log(`  ⚠ ${w}`);
      console.log(`  ⚠ предмет не в отправляемой правке — ${REPAIR}`);
      console.log('  ⚠ жёстко судится там, где снимок и есть предмет: yarn network:tooth');
    }
    if (exemptLine) console.log(exemptLine);
    return 0;
  }
  console.error(`network:tooth — находок: ${findings.length}`);
  for (const f of findings) console.error(`  ✗ ${f}`);
  for (const w of warnings) console.error(`  ⚠ ${w}`);
  if (exemptLine) console.error(exemptLine);
  console.error(`\n${REPAIR}`);
  return 1;
}

function findByZone(root = repoRoot) {
  try {
    return scanFetchZones(root);
  } catch {
    return { bare: [], exempt: [] };
  }
}

if (process.argv[1]?.endsWith('tooth.mjs')) process.exit(main());
