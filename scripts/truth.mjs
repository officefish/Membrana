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
 *   node scripts/truth.mjs utterance "<фрагмент>" [--dir <path>] [--json]
 *       — указатель на реплику владельца: sessionId, uuid, timestamp, kind, цитата.
 *       Ищет по ВСЕМ трём местам транскрипта (#595 п.1); промах → сырой скан;
 *       отрицательный ответ печатается со способом поиска и его границей.
 *   node scripts/truth.mjs ask-check "<вопрос>" [--json]
 *       — дубль-проверка ДО вопроса владельцу (#642 п.1): слова вопроса ищутся по
 *       живым токенам и openGaps. Exit 3 = кандидат-ответ уже есть, вопрос не жечь.
 *
 * Exit: 0 — поток не блокируется · 2 — нарушен инвариант ИЛИ подписчик с onBreak=block задет
 *       · 3 — (только ask-check) найден живой токен-кандидат
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
  evidenceLabel,
  checkInvariants,
  computeStale,
  hasError,
  radiusOfBreak,
  usedPredicates,
} from './lib/truth-graph.mjs';
import {
  defaultTranscriptDir,
  findUtterances,
  listTranscriptFiles,
  rawScan,
} from './lib/transcript.mjs';

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
    // Метка живёт в ядре рядом с evidenceKind и меряет им же — иначе дисплей
    // разойдётся с гейтом, как 17.07 (13 из 14 токенов).
    const ev = evidenceLabel(graph, t);
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

/**
 * Дубль-проверка ДО вопроса владельцу (#642 п.1): не отвечает ли на вопрос уже
 * зачеканенный живой токен или открытый пробел. Детерминированный поиск по СЛОВАМ,
 * не по смыслу — граница метода печатается потребителю.
 *
 * Порог: ≥2 значимых слов вопроса в токене (≥1, если значимых слов мало) — грубо,
 * но ловит эпизод 18.07: вопрос «ушла ли ласточка Алексу» нашёл бы
 * `alex-sparring-answered`, зачеканенный сутками раньше.
 *
 * @param {{tokens?: object[], openGaps?: unknown[]}} registry
 * @param {string} question
 */
export function askCheckMatches(registry, question) {
  const words = [...new Set((question.toLowerCase().match(/[\p{L}\d][\p{L}\d-]{3,}/gu) ?? []))];
  const need = Math.min(2, Math.max(1, words.length));
  // Усечение окончаний: «алексу» находит «алекса» — падежи не должны прятать ответ.
  const stem = (w) => w.slice(0, Math.max(4, w.length - 2));
  const matchedIn = (hay) => words.filter((w) => hay.includes(w) || hay.includes(stem(w)));
  const hayOf = (t) =>
    [t.claim, t.episode, t.source?.note, t.source?.utterance?.quote, t.id]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

  const tokens = (registry.tokens ?? [])
    .filter((t) => t.status === 'active')
    .map((t) => ({ id: t.id, claim: t.claim, matched: matchedIn(hayOf(t)) }))
    .filter((x) => x.matched.length >= need)
    .sort((a, b) => b.matched.length - a.matched.length);

  const gaps = (registry.openGaps ?? [])
    .map((g, index) => {
      const text = typeof g === 'string' ? g : JSON.stringify(g);
      return { index, text: text.slice(0, 160), matched: matchedIn(text.toLowerCase()) };
    })
    .filter((x) => x.matched.length >= need)
    .sort((a, b) => b.matched.length - a.matched.length);

  return { words, need, tokens, gaps };
}

function utteranceCommand(argv, asJson) {
  const rest = argv.slice(1).filter((a) => !a.startsWith('--'));
  const dirFlag = argv.indexOf('--dir');
  const dir = dirFlag !== -1 ? argv[dirFlag + 1] : defaultTranscriptDir();
  const pattern = rest[0];
  if (!pattern) {
    console.error('usage: truth utterance "<фрагмент реплики>" [--dir <path>] [--json]');
    process.exit(1);
  }
  if (!dir) {
    console.error('каталог транскриптов не найден (~/.claude/projects/<slug cwd>) — укажи --dir');
    process.exit(1);
  }
  const files = listTranscriptFiles(dir);
  const boundary = `метод: структурный поиск по user/queued_command/tool_result, подстрока без регистра; граница: ${dir}, файлов ${files.length}`;

  const hits = findUtterances(pattern, { dir });
  if (hits.length > 0) {
    if (asJson) {
      console.log(JSON.stringify({ boundary, hits }, null, 2));
    } else {
      for (const h of hits) {
        console.log(`${h.kind}  ${h.timestamp ?? '—'}\n  sessionId: ${h.sessionId}\n  uuid: ${h.uuid ?? '— (у attachment-записей uuid записи, не реплики)'}\n  цитата: ${h.text.replace(/\s+/gu, ' ').slice(0, 200)}\n`);
      }
      console.log(`найдено: ${hits.length} · ${boundary}`);
    }
    process.exit(0);
  }

  // Промах структурного поиска → сырой скан (#595 п.4: молчание — не факт).
  const raw = rawScan(pattern, { dir });
  if (asJson) {
    console.log(JSON.stringify({ boundary, hits: [], rawHits: raw }, null, 2));
  } else if (raw.length > 0) {
    console.log('структурный поиск промахнулся, но СЫРОЙ скан нашёл — вероятно, новый тип записи или битый JSON:');
    for (const r of raw.slice(0, 10)) console.log(`  ${r.file}:${r.line}  ${r.snippet.slice(0, 120)}`);
    console.log(`\n${boundary} + фолбэк сырой строкой`);
  } else {
    console.log(`не найдено. ${boundary} + фолбэк сырой строкой — тоже пусто.`);
  }
  process.exit(raw.length > 0 ? 0 : 1);
}

function askCheckCommand(registry, argv, asJson) {
  const question = argv.slice(1).filter((a) => !a.startsWith('--')).join(' ').trim();
  if (!question) {
    console.error('usage: truth ask-check "<вопрос владельцу>" [--json]');
    process.exit(1);
  }
  const res = askCheckMatches(registry, question);
  const boundary = `метод: поиск по словам/основам (${res.words.join(', ')}), порог ${res.need} — НЕ по смыслу; ложный промах возможен при перефразировке`;
  if (asJson) {
    console.log(JSON.stringify({ boundary, ...res }, null, 2));
  } else {
    if (res.tokens.length > 0) {
      console.log('ОТВЕТ УЖЕ МОЖЕТ БЫТЬ — живые токены-кандидаты (вопрос не жечь, сначала прочитать):');
      for (const t of res.tokens) console.log(`  ${t.id} [${t.matched.join(', ')}]\n    ${t.claim.slice(0, 160)}`);
    }
    if (res.gaps.length > 0) {
      console.log('\nСовпавшие открытые пробелы (openGaps) — если токен выше отвечает на пробел, пробел пора закрыть:');
      for (const g of res.gaps) console.log(`  [${g.index}] ${g.text}`);
    }
    if (res.tokens.length === 0 && res.gaps.length === 0) {
      console.log('совпадений нет — вопрос выглядит новым.');
    }
    console.log(`\n${boundary}`);
  }
  process.exit(res.tokens.length > 0 ? 3 : 0);
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const asJson = argv.includes('--json');

  if (cmd === 'utterance') {
    utteranceCommand(argv, asJson);
    return;
  }

  const registry = readJson(REGISTRY_REL);
  if (!registry) {
    console.error(`нет ${REGISTRY_REL} — нечего проверять`);
    process.exit(0);
  }
  if (cmd === 'ask-check') {
    askCheckCommand(registry, argv, asJson);
    return;
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
