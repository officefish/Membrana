#!/usr/bin/env node
/**
 * night-preflight — СТРАЖ полосы `preflight` процедуры `ritual-night`.
 *
 *   node scripts/night-preflight.mjs            — пробы, слова, код возврата
 *   node scripts/night-preflight.mjs --json     — то же машинно (для сводки ночи)
 *   node scripts/night-preflight.mjs --only wiring
 *
 * ЗАЧЕМ. Ночь идёт без человека за плечом, и переспросить некому. Недельный стратегический план
 * падал СЕМНАДЦАТЬ раз подряд с 14 мая на «секрет не задан» — механизм был исправен, спросить про
 * ключи ДО работы было некому. Страж превращает семнадцать тихих недель в один громкий понедельник.
 *
 * ГЕЙТ ДО РАБОТЫ, А НЕ ПРОВЕРКА ВНУТРИ. Ключа нет — работать всё равно нечем, и час полного корпуса
 * тестов сгорает впустую. Полоса `preflight` стоит перед `frames` по построению канона.
 *
 * ТРИ ПРОБЫ, И ОНИ РАЗНЫЕ ПО ВЕСУ:
 *   wiring  — обязательная: у каждой объявленной процедуры канала есть годное звено;
 *   trunk   — обязательная, НО «не смог узнать» ≠ «красный»: без gh проба даёт находку, не провал;
 *   network — необязательная: сеть моргает, и заложником мелочи ночь быть не должна.
 *
 * ЗНАЧЕНИЯ КЛЮЧЕЙ НЕ ПЕЧАТАЮТСЯ. Наружу идут имена переменных и провайдеров (Р3 ADR-0023).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadProviderCatalog } from './lib/llm-procedure-registry.mjs';
import { resolveEffective } from './lib/llm-procedure-resolve.mjs';
import { loadRitualLlmEnv } from './lib/llm-procedure-ritual.mjs';
import { preflightVerdict, providersOf, unknownArgsOf, wiringVerdict, wiringWords } from './lib/night-preflight.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const NIGHT_MANIFEST_REL = 'docs/procedures/ritual-night/MANIFEST.json';

/** Фрейм проводов из манифеста. Канал НЕ зашит в страже — его называет процедура. */
export function readChannelDeclaration(manifestText) {
  const m = JSON.parse(manifestText);
  const frame = (m.preflight ?? []).find((f) => f?.id === 'night-wiring');
  if (!frame) throw new Error('night-preflight: в манифесте нет фрейма night-wiring — канал не объявлен');
  const ids = frame.channel?.procedureIds;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('night-preflight: фрейм night-wiring не называет ни одной процедуры канала');
  }
  return ids;
}

function probeWiring() {
  const ids = readChannelDeclaration(readFileSync(resolve(root, NIGHT_MANIFEST_REL), 'utf8'));
  loadRitualLlmEnv();
  const catalog = providersOf(loadProviderCatalog());
  const resolved = [];
  for (const id of ids) {
    // Незарегистрированная процедура канала — поломка ОБЪЯВЛЕНИЯ, а не отсутствие ключа.
    // Пустая цепочка ниже прочтётся ядром как «идти некуда», и причина останется различимой.
    try {
      resolved.push({ procedureId: id, chain: resolveEffective(id, {}).chain ?? [] });
    } catch (error) {
      resolved.push({ procedureId: id, chain: [], resolveError: String(error?.message ?? error) });
    }
  }
  const verdict = wiringVerdict(resolved, catalog, process.env);
  const broken = resolved.filter((r) => r.resolveError);
  const words = broken.length > 0
    ? wiringWords(verdict) + '\n✗ объявление канала: ' + broken.map((r) => r.procedureId + ' — ' + r.resolveError).join('; ')
    : wiringWords(verdict);
  return {
    id: 'wiring',
    status: verdict.ok ? (verdict.degraded.length > 0 ? 'finding' : 'pass') : 'fail',
    words,
    detail: { dead: verdict.dead, degraded: verdict.degraded },
  };
}

/**
 * Ствол собирается — судим по CI последнего прогона main, а не по локальной сборке: ночь работает
 * от ствола, и «у меня собралось» про ствол не говорит ничего.
 *
 * НЕ СМОГ УЗНАТЬ ≠ КРАСНЫЙ. Без gh или без сети вердикта нет — это находка. Выдать незнание за
 * провал значило бы ронять ночь всякий раз, когда молчит чужой сервис.
 */
function probeTrunk() {
  const r = spawnSync('gh', ['run', 'list', '--branch', 'main', '--limit', '1', '--json', 'conclusion,status,headSha'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 45000,
  });
  if (r.status !== 0 || !r.stdout || r.stdout.trim() === '') {
    return { id: 'trunk', status: 'finding', words: '… ствол: узнать не удалось (gh недоступен или молчит) — это незнание, а не красный' };
  }
  let runs = null;
  try {
    runs = JSON.parse(r.stdout);
  } catch {
    return { id: 'trunk', status: 'finding', words: '… ствол: ответ gh не разобран — незнание, не красный' };
  }
  const last = Array.isArray(runs) ? runs[0] : null;
  if (!last) return { id: 'trunk', status: 'finding', words: '… ствол: прогонов не найдено' };
  const sha = String(last.headSha ?? '').slice(0, 8);
  if (last.status !== 'completed') {
    return { id: 'trunk', status: 'finding', words: '… ствол: прогон ' + sha + ' ещё идёт' };
  }
  const green = last.conclusion === 'success';
  return {
    id: 'trunk',
    status: green ? 'pass' : 'fail',
    words: green ? 'ствол собирается: ' + sha + ' зелёный' : '✗ ствол КРАСНЫЙ: ' + sha + ' → ' + last.conclusion,
  };
}

/** Сеть жива — по базовым адресам каталога. Необязательная: сеть моргает, ночь не заложник мелочи. */
async function probeNetwork() {
  const catalog = providersOf(loadProviderCatalog());
  const urls = [...new Set(Object.values(catalog).map((p) => p && p.defaultBaseUrl).filter(Boolean))];
  const results = await Promise.all(
    urls.map(async (u) => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        await fetch(u, { method: 'HEAD', signal: ctrl.signal });
        clearTimeout(t);
        return { u, up: true };
      } catch {
        return { u, up: false };
      }
    }),
  );
  const up = results.filter((x) => x.up);
  return {
    id: 'network',
    required: false,
    status: up.length > 0 ? 'pass' : 'finding',
    words: up.length > 0 ? 'сеть жива: ' + up.length + ' из ' + results.length + ' адресов отвечают' : '… сеть: не ответил ни один адрес',
  };
}

async function main(argv) {
  // Неизвестный флаг — отказ ДО любой пробы. Урок вечерней цепочки: молчаливое «не понял →
  // исполняю всё» для процедуры с побочными эффектами худший дефолт из возможных.
  const KNOWN = new Set(['--json', '--only']);
  const onlyIdx = argv.indexOf('--only');
  const unknown = unknownArgsOf(argv, KNOWN);
  if (unknown.length > 0) {
    console.error('✗ неизвестные аргументы: ' + unknown.join(', '));
    console.error('Usage: node scripts/night-preflight.mjs [--json] [--only wiring,trunk,network]');
    return 2;
  }
  const only = onlyIdx >= 0
    ? new Set(String(argv[onlyIdx + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean))
    : null;
  const asJson = argv.includes('--json');

  const probes = [];
  if (!only || only.has('wiring')) probes.push(probeWiring());
  if (!only || only.has('trunk')) probes.push(probeTrunk());
  if (!only || only.has('network')) probes.push(await probeNetwork());

  const verdict = preflightVerdict(probes);
  if (asJson) {
    console.log(JSON.stringify({ ok: verdict.ok, failed: verdict.failed, findings: verdict.findings, probes }, null, 2));
  } else {
    for (const p of probes) console.log(p.words);
    console.log(
      verdict.ok
        ? '\npreflight ночи: ПРОЙДЕН' + (verdict.findings.length > 0 ? ' (находки: ' + verdict.findings.join(', ') + ')' : '')
        : '\npreflight ночи: НЕ ПРОЙДЕН — ' + verdict.failed.join(', ') + '; работа не начинается',
    );
  }
  return verdict.ok ? 0 : 1;
}

if (process.argv[1] && process.argv[1].endsWith('night-preflight.mjs')) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error('night-preflight: ошибка входа: ' + (error && error.message ? error.message : error));
      process.exitCode = 2;
    });
}
