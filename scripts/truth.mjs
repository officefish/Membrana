#!/usr/bin/env node
/**
 * truth — обвязка графа правды (эпик #576). Вердикт выносит чистое ядро
 * `scripts/lib/truth-graph.mjs`; здесь только fs, git и вёрстка.
 *
 * НИЧЕГО НЕ ЧИНИТ САМ (запрет консилиума #533, унаследован): автопочинка скрыла бы
 * находку «реестр протух», ради которой гейт и строится.
 *
 * Usage:
 *   node scripts/truth.mjs verify [--json]     — инварианты I1–I6 + свежесть + подписчики
 *   node scripts/truth.mjs cool [--json]       — переоценка свежести по git-факту
 *   node scripts/truth.mjs review [--json]     — ОЧЕРЕДЬ РЕВИЗИИ на конец сессии
 *   node scripts/truth.mjs radius <token-id>   — кого утащит отзыв
 *
 * Exit: 0 — поток не блокируется · 2 — нарушен инвариант ИЛИ подписчик с onBreak=block задет
 *
 * ПРОТУХШЕЕ НЕ БЛОКИРУЕТ (решение владельца 17.07). Гейт, который краснеет постоянно,
 * отключают — так drift-якоря стали украшением. Вместо блокировки протухшее копится в
 * ОЧЕРЕДЬ РЕВИЗИИ (`review`) и разбирается в конце сессии скиллом кристаллизации.
 * Это и есть ответ на вопрос, которого не дал ресёрч («что заставит владельца ревизовать
 * истекающие факты»): не страх и не напоминание, а РИТУАЛ, где протухшее становится
 * работой. Канон говорил это с первого дня: INSIGHT.md §Scope — «большинство дней — ноль
 * новых токенов; чаще это ревизия истекающих».
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  affectedSubscribers,
  buildGraph,
  evidenceKind,
  checkInvariants,
  computeStale,
  hasError,
  radiusOfBreak,
  usedPredicates,
} from './lib/truth-graph.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REGISTRY_REL = 'docs/truth/registry.json';
export const SUBSCRIBERS_REL = 'docs/truth/subscribers.json';

/** @param {string} rel */
function readJson(rel) {
  const abs = resolve(root, rel);
  if (!existsSync(abs)) return null;
  return JSON.parse(readFileSync(abs, 'utf8'));
}

/**
 * Дата последнего коммита, тронувшего путь. ГИТ-ФАКТ, не mtime: mtime врёт после
 * checkout/clone, git — нет.
 *
 * @param {string} path
 * @returns {string|null} ISO или null, если git молчит (файла нет / не в индексе)
 */
export function lastTouchedAt(path) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', path], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n);

/**
 * Читаемый вид. Первым блоком — радиус поражения и задетые подписчики: владелец должен
 * увидеть ЦЕНУ раньше, чем список токенов (решение консилиума).
 */
function report(graph, manifest, violations, stale) {
  const lines = [];
  const brokenIds = [...new Set([...violations.filter((v) => v.severity === 'error').map((v) => v.id), ...stale.map((s) => s.id)])];
  const affected = affectedSubscribers(graph, manifest, brokenIds);

  if (affected.length > 0) {
    lines.push('--- ЗАДЕТЫЕ ПРОЦЕССЫ ---', '');
    for (const a of affected) {
      const mark = a.onBreak === 'block' ? 'БЛОКИРОВАН' : 'предупреждён';
      lines.push(`  ${mark}: ${a.process} — через ${a.via.join(', ')}`);
    }
    lines.push('');
  }

  if (violations.length > 0) {
    lines.push('--- НАРУШЕНИЯ ИНВАРИАНТОВ ---', '');
    for (const v of violations) lines.push(`  [${v.rule}/${v.severity}] ${v.id} — ${v.message}`);
    lines.push('');
  }

  if (stale.length > 0) {
    lines.push('--- ПРОТУХШИЕ — ПРЕДУПРЕЖДЕНИЕ, НЕ БЛОК (git тронул основание после проверки) ---', '');
    for (const s of stale) lines.push(`  ${s.id} — ${s.reason}`);
    lines.push('', '  → в очередь ревизии: yarn truth review (разбирается в конце сессии, поток не стоит)');
    lines.push('');
  }

  lines.push('--- ГРАФ ПРАВДЫ ---', '');
  lines.push(`${pad('токен', 46)}${pad('вид', 10)}${pad('держится на', 34)}доказательство`);
  lines.push('-'.repeat(118));
  const staleIds = new Set(stale.map((s) => s.id));
  for (const t of graph.tokens) {
    const holds = t.parents?.length ? t.parents.join(' + ') : (t.revocation?.kind === 'owner' ? 'слове владельца' : t.revocation?.kind ?? '—');
    // Колонка обязана мерить ТЕМ ЖЕ, чем гейт I7, — иначе дисплей врёт против
    // гейта в одном выводе. 17.07 именно так и было: evidenceKind() первым делом
    // смотрит source.utterance, а эта колонка про указатели не знала вовсе и
    // печатала «доказательства нет» про 13 из 14 владельческих токенов — включая
    // те, что автор инструмента сам же и подкрепил. Два места считали одно и то
    // же и разъехались: эхо-механизм, против которого весь реестр и заведён.
    const preds = usedPredicates(graph, t);
    const kind = evidenceKind(graph, t);
    const ev =
      kind === 'utterance'
        ? `указатель на реплику @${t.source.utterance.timestamp?.slice(0, 10) ?? t.source.date ?? '?'}`
        : kind === 'predicate'
          ? `команда ×${preds.length} @${preds[0].def?.verified ?? '?'}`
          : kind === 'probe'
            ? `проба @${t.probe.verified}`
            : // Чистая дедукция: доказательство — сами посылки, они уже в колонке
              // «держится на». Писать про такой токен «доказательства нет» — та же
              // ложь дисплея, только для выведенного класса.
              t.class === 'derived' && t.parents?.length
              ? `дедукция из ${t.parents.length} посыл(ок)`
              : 'ТОЛЬКО ДАТА — доказательства нет';
    const mark = t.status !== 'active' ? ` [${t.status}]` : staleIds.has(t.id) ? ' [ПРОТУХ]' : '';
    lines.push(`${pad(t.id + mark, 46)}${pad(t.class === 'owner' ? 'владелец' : 'вывод', 10)}${pad(holds, 34)}${ev}`);
  }

  const noEvidence = graph.tokens.filter((t) => t.class === 'owner' && evidenceKind(graph, t) === null);
  lines.push('');
  lines.push(`токенов: ${graph.tokens.length} · предикатов: ${graph.predicates.size} · протухших: ${stale.length} · нарушений: ${violations.length}`);
  if (noEvidence.length > 0) {
    lines.push(`владельческих без доказательства: ${noEvidence.length}/${graph.tokens.filter((t) => t.class === 'owner').length} — держатся на дате, а не на слове`);
  }
  return lines.join('\n');
}

/**
 * Очередь ревизии: что предъявить владельцу в конце сессии. Не блокирует — становится
 * работой (решение владельца 17.07).
 *
 * Три вида долга, по убыванию срочности:
 *  1. протухшее — основание тронуто после проверки; дешёвый предикат перепрогнать прямо
 *     сейчас, дорогой — поставить в план (тиры из `cost`);
 *  2. без доказательства — владельческий токен, который держится на дате, а не на слове:
 *     справка «владелец что-то сказал» без того, что он сказал;
 *  3. без срока — токен с бессрочным «до слова владельца», который никто не пересматривал:
 *     кандидат в украшение (метрика здоровья — возраст самого старого непересмотренного).
 *
 * @param {ReturnType<typeof buildGraph>} graph
 * @param {{id:string,reason:string}[]} stale
 * @param {string} today ISO-дата — снаружи, чтобы функция оставалась предсказуемой
 */
export function reviewQueue(graph, stale, today) {
  const staleItems = stale.map((s) => {
    const t = graph.byId.get(s.id);
    const preds = usedPredicates(graph, t ?? { source: {} });
    const hot = preds.find((p) => s.reason.includes(p.id));
    const cost = hot?.def?.cost ?? '';
    const cheap = /миллисекунд|секунд|дешёв/iu.test(cost);
    return { id: s.id, reason: s.reason, predicate: hot?.id ?? null, cost, action: cheap ? 'перепрогнать сейчас' : 'поставить в план (дорогой)' };
  });

  const noEvidence = graph.tokens
    .filter((t) => t.status === 'active' && t.class === 'owner' && evidenceKind(graph, t) === null)
    .map((t) => ({ id: t.id, action: 'укрепить: указатель на волеизъявление (sessionId + uuid)' }));

  const ageDays = (d) => (d ? Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000) : null);
  const unreviewed = graph.tokens
    .filter((t) => t.status === 'active' && t.revocation?.kind === 'owner')
    .map((t) => ({ id: t.id, since: t.source?.date, days: ageDays(t.source?.date) }))
    .filter((x) => x.days !== null)
    .sort((a, b) => b.days - a.days);

  return { stale: staleItems, noEvidence, unreviewed };
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const asJson = argv.includes('--json');

  const registry = readJson(REGISTRY_REL);
  if (!registry) {
    console.error(`нет ${REGISTRY_REL} — нечего проверять`);
    process.exit(0);
  }
  const manifest = readJson(SUBSCRIBERS_REL) ?? { subscribers: [] };
  const graph = buildGraph(registry);

  if (cmd === 'radius') {
    const id = argv[1];
    if (!id || !graph.byId.has(id)) {
      console.error(`usage: truth radius <token-id>; неизвестный токен «${id}»`);
      process.exit(1);
    }
    const hit = radiusOfBreak(graph, id);
    const affected = affectedSubscribers(graph, manifest, [id]);
    if (asJson) {
      console.log(JSON.stringify({ token: id, cascades: hit, affected }, null, 2));
    } else {
      console.log(`отзыв ${id} утащит ${hit.length}: ${hit.join(', ') || '—'}`);
      for (const a of affected) console.log(`  ${a.onBreak === 'block' ? 'БЛОКИРУЕТ' : 'предупредит'}: ${a.process}`);
    }
    process.exit(0);
  }

  if (cmd === 'review') {
    const stale = computeStale(graph, lastTouchedAt);
    const today = new Date().toISOString().slice(0, 10);
    const q = reviewQueue(graph, stale, today);
    if (asJson) {
      console.log(JSON.stringify(q, null, 2));
      process.exit(0);
    }
    console.log('--- ОЧЕРЕДЬ РЕВИЗИИ (конец сессии) ---\n');
    if (q.stale.length === 0 && q.noEvidence.length === 0) {
      console.log('  долга нет');
    }
    for (const s of q.stale) {
      console.log(`  ПРОТУХ  ${s.id}\n          ${s.reason}\n          → ${s.action}${s.cost ? ` [${s.cost}]` : ''}`);
    }
    for (const n of q.noEvidence) {
      console.log(`  СЛАБЫЙ  ${n.id}\n          → ${n.action}`);
    }
    if (q.unreviewed.length > 0) {
      const oldest = q.unreviewed[0];
      console.log(`\nсамый старый непересмотренный: ${oldest.id} — ${oldest.days} дн. (с ${oldest.since})`);
      console.log('(метрика здоровья графа: не число токенов, а возраст самого старого непересмотренного)');
    }
    console.log('\nОчередь НЕ блокирует поток — она работа на конец сессии (скилл membrana-truth-crystallization).');
    process.exit(0);
  }

  const violations = checkInvariants(graph, manifest);
  const stale = cmd === 'cool' || cmd === 'verify' ? computeStale(graph, lastTouchedAt) : [];

  if (asJson) {
    console.log(JSON.stringify({ violations, stale, tokens: graph.tokens.length }, null, 2));
  } else {
    console.log(report(graph, manifest, violations, stale));
  }

  const brokenIds = [...new Set([...violations.filter((v) => v.severity === 'error').map((v) => v.id), ...stale.map((s) => s.id)])];
  const blocked = affectedSubscribers(graph, manifest, brokenIds).filter((a) => a.onBreak === 'block');
  const bad = hasError(violations) || blocked.length > 0;
  if (bad && !asJson) {
    console.error(`\nГРАФ ПРАВДЫ НАРУШЕН — процессов заблокировано: ${blocked.length}`);
  }
  process.exit(bad ? 2 : 0);
}

if (process.argv[1]?.endsWith('truth.mjs')) {
  try {
    main();
  } catch (e) {
    console.error(String(e?.message ?? e));
    process.exit(1);
  }
}
