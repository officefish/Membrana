#!/usr/bin/env node
/**
 * persona-memory-extract — детерминированная дистилляция журнала субъектного
 * опыта персоны из существующих артефактов команды.
 *
 * Фаза 1 инсайта insight-persona-persistent-memory (спринт persona-memory-phase1,
 * спека = docs/insights/insight-persona-persistent-memory/REVIEW.md):
 *   • источники: docs/seanses (реплики `[Роль]:` в протоколах) + REVIEW.md инсайтов
 *     (реплика роли + строка таблицы «Голосование приоритета»);
 *   • БЕЗ LLM: regex/тег-фильтр по метке роли, фиксированный парсер таблиц
 *     (Математик, review) — одинаковый вход → побайтово одинаковый журнал;
 *   • каждая запись с provenance (файл-источник + позиция) и датой;
 *   • токен-бюджет <5000 (~3 симв/токен): отбор top-N по
 *     score = 0.6·recency + 0.4·importance, importance — ЧЕЛОВЕК-флаг из
 *     опционального docs/virtual-team/memory/importance.json, не авто-эвристика;
 *   • человек-гейт на запись: скрипт пишет файл в рабочее дерево — в git журнал
 *     попадает только через обычный PR-флоу (ревью diff человеком).
 *
 * Запуск:
 *   yarn persona:memory dynin            # (пере)построить docs/virtual-team/memory/dynin.md
 *   yarn persona:memory dynin --check    # идемпотентность: сравнить с файлом, exit 3 при дрейфе
 *   yarn persona:memory dynin --stdout   # напечатать, не писать
 *
 * Паттерн — hermes-brief (PR #316): IO (collect*) отделён от чистого рендера,
 * сортировки byCodePoint, graceful fallback на каждый источник.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { PERSONA_ROLE_LABELS, MEMORY_DIR, personaMemoryPath } from './lib/persona-memory.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const SEANSES_DIR = 'docs/seanses';
const INSIGHTS_DIR = 'docs/insights';
const IMPORTANCE_FILE = `${MEMORY_DIR}/importance.json`;

export const TOKEN_BUDGET = 5_000; // жёсткий бюджет журнала (review: <5K токенов)
export const CHARS_PER_TOKEN = 3; // консервативно для кириллицы
export const EXCERPT_CHARS = 280; // выдержка одной записи

// ─── чистые помощники (экспортируются для теста) ─────────────────────────────────

/** Детерминированное сравнение по code-point (НЕ localeCompare — урок hermes-brief). */
export function byCodePoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Дата ISO из имени файла протокола: `...-2026-07-12.md` → `2026-07-12` (берём последнюю). */
export function dateFromFilename(name) {
  const matches = String(name ?? '').match(/\d{4}-\d{2}-\d{2}/g);
  return matches ? matches[matches.length - 1] : null;
}

/** Слаг темы: имя файла без расширения и без хвостовых дат. */
export function topicSlug(name) {
  return String(name ?? '')
    .replace(/\.md$/i, '')
    .replace(/(-\d{4}-\d{2}-\d{2})+$/g, '');
}

/** Обрезка выдержки по границе слова + маркер. Схлопывает переводы строк. */
export function excerpt(text, maxChars = EXCERPT_CHARS) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (flat.length <= maxChars) return flat;
  const cut = flat.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + ' […]';
}

/**
 * Реплики роли из markdown-протокола: строки `[<roleLabel>]: текст` (реплика
 * продолжается до следующего `[Тег]:` / заголовка / разделителя). Возвращает
 * { index, text }, index — порядковый номер реплики роли в файле (с 1).
 */
export function parseRoleReplies(md, roleLabel) {
  if (!md) return [];
  const lines = md.split('\n');
  const replies = [];
  let current = null;
  const anyTag = /^\[[^\]\n]{1,40}\]:/;
  const boundary = /^(#{1,6}\s|---\s*$|\|)/;
  for (const line of lines) {
    if (current != null) {
      if (anyTag.test(line) || boundary.test(line.trim())) {
        replies.push(current.join(' '));
        current = null;
      } else {
        if (line.trim()) current.push(line.trim());
        continue;
      }
    }
    const m = line.match(anyTag);
    if (m && line.startsWith(`[${roleLabel}]:`)) {
      current = [line.slice(`[${roleLabel}]:`.length).trim()];
    }
  }
  if (current != null) replies.push(current.join(' '));
  return replies.map((text, i) => ({ index: i + 1, text }));
}

/**
 * Строка роли из таблицы «Голосование приоритета» REVIEW.md.
 * Фиксированный парсер: ячейки `| Роль | Внедрять | Этап | /10 |`.
 * → { decision, stage, score } | null.
 */
export function parseReviewVote(md, roleLabel) {
  if (!md) return null;
  const lines = md.split('\n');
  const start = lines.findIndex((l) => /^##\s+Голосование/.test(l.trim()));
  if (start === -1) return null;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^##\s/.test(line)) break;
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim());
    // cells[0] и последняя — пустые края `| a | b |`
    if (cells.length >= 5 && cells[1] === roleLabel) {
      // Пустая строка-заглушка (все ячейки — прочерки) = роль не голосовала.
      const dash = (s) => /^[-—–\s]*$/.test(s);
      if (dash(cells[2]) && dash(cells[3]) && dash(cells[4])) return null;
      return { decision: cells[2], stage: cells[3], score: cells[4] };
    }
  }
  return null;
}

/** Чистый рендер ОДНОЙ записи журнала — он же мера стоимости при отборе под бюджет. */
export function renderEntry(e) {
  return [`### ${e.date ?? 'н/д'} · ${e.kind} · ${e.topic}`, '', `> ${e.body}`, '', `— источник: \`${e.provenance}\``, ''].join('\n');
}

/**
 * Отбор записей под токен-бюджет: score = 0.6·recency + 0.4·importance.
 * recency — нормированный ранг даты (свежее → 1) по УНИКАЛЬНЫМ датам кандидатов;
 * importance ∈ [0..1] — человек-флаг по ключу provenance (importance.json).
 * Тай-брейк детерминирован: дата ↓, provenance ↑ (byCodePoint).
 * Отобранные записи возвращаются в стабильном порядке: дата ↓, provenance ↑.
 */
export function selectEntries(candidates, { importance = {}, budgetChars = TOKEN_BUDGET * CHARS_PER_TOKEN } = {}) {
  const dates = [...new Set(candidates.map((c) => c.date ?? '0000-00-00'))].sort(byCodePoint);
  const denom = Math.max(1, dates.length - 1);
  const scored = candidates.map((c) => {
    const recency = dates.length === 1 ? 1 : dates.indexOf(c.date ?? '0000-00-00') / denom;
    const imp = Number(importance[c.provenance]) || 0;
    return { ...c, score: 0.6 * recency + 0.4 * Math.min(1, Math.max(0, imp)) };
  });
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      byCodePoint(b.date ?? '', a.date ?? '') ||
      byCodePoint(a.provenance, b.provenance),
  );
  const picked = [];
  let used = 0;
  for (const c of scored) {
    const cost = renderEntry(c).length; // честная стоимость = отрендеренная запись
    if (used + cost > budgetChars) continue;
    used += cost;
    picked.push(c);
  }
  picked.sort((a, b) => byCodePoint(b.date ?? '', a.date ?? '') || byCodePoint(a.provenance, b.provenance));
  return picked;
}

/** Чистый рендер журнала. Полностью детерминирован (без timestamp). */
export function renderJournal({ slug, roleLabel, entries, totalCandidates }) {
  const L = [];
  L.push(`# Журнал субъектного опыта — ${slug} (${roleLabel})`);
  L.push('');
  L.push('> Автогенерация `yarn persona:memory ' + slug + '` — файл перезаписывается целиком,');
  L.push('> руками не редактировать. Человек-гейт = ревью diff в PR. Фаза 1 инсайта');
  L.push('> `insight-persona-persistent-memory`; важность записи — человек-флаг в');
  L.push(`> \`${IMPORTANCE_FILE}\` (ключ = provenance).`);
  L.push('');
  L.push(`Записей: ${entries.length} из ${totalCandidates} кандидатов (бюджет <${TOKEN_BUDGET} токенов).`);
  L.push('');
  for (const e of entries) {
    L.push(renderEntry(e));
  }
  return L.join('\n');
}

// ─── сбор кандидатов (IO; graceful на каждый источник) ────────────────────────────

function readTextOrNull(absPath) {
  try {
    return readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }
}

function collectSeansesCandidates(roleLabel, { repoRoot = REPO_ROOT } = {}) {
  const dirAbs = path.join(repoRoot, SEANSES_DIR);
  let files = [];
  try {
    files = readdirSync(dirAbs)
      .filter((f) => f.endsWith('.md') && f !== 'README.md')
      .sort(byCodePoint);
  } catch {
    return [];
  }
  const out = [];
  for (const f of files) {
    const md = readTextOrNull(path.join(dirAbs, f));
    const replies = parseRoleReplies(md, roleLabel);
    if (!replies.length) continue;
    // Позиция персоны в сеансе = ПЕРВАЯ реплика (стартовая позиция); остальные
    // реплики сеанса учитываются счётчиком — фаза 1 держит журнал компактным.
    const first = replies[0];
    const rel = `${SEANSES_DIR}/${f}`;
    out.push({
      kind: 'позиция',
      topic: topicSlug(f),
      date: dateFromFilename(f),
      body:
        excerpt(first.text) + (replies.length > 1 ? ` _(реплик в сеансе: ${replies.length})_` : ''),
      provenance: `${rel}#reply-${first.index}`,
    });
  }
  return out;
}

function collectReviewCandidates(roleLabel, { repoRoot = REPO_ROOT } = {}) {
  const dirAbs = path.join(repoRoot, INSIGHTS_DIR);
  let ids = [];
  try {
    ids = readdirSync(dirAbs, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_')) // _template — не инсайт
      .map((d) => d.name)
      .sort(byCodePoint);
  } catch {
    return [];
  }
  const out = [];
  for (const id of ids) {
    const rel = `${INSIGHTS_DIR}/${id}/REVIEW.md`;
    const md = readTextOrNull(path.join(repoRoot, rel));
    if (md == null) continue;
    let date = null;
    try {
      const meta = JSON.parse(readTextOrNull(path.join(repoRoot, INSIGHTS_DIR, id, 'meta.json')) ?? '');
      date = meta.reviewedAt ?? meta.createdAt ?? null;
    } catch {
      /* meta опциональна */
    }
    const vote = parseReviewVote(md, roleLabel);
    const reply = parseRoleReplies(md, roleLabel)[0] ?? null;
    if (!vote && !reply) continue;
    const parts = [];
    if (vote) parts.push(`внедрять: ${vote.decision} · этап: ${vote.stage} · оценка: ${vote.score}/10`);
    if (reply) parts.push(excerpt(reply.text));
    out.push({
      kind: 'голос',
      topic: id,
      date,
      body: parts.join(' — '),
      provenance: `${rel}#vote`,
    });
  }
  return out;
}

function collectImportance({ repoRoot = REPO_ROOT } = {}) {
  const raw = readTextOrNull(path.join(repoRoot, IMPORTANCE_FILE));
  if (raw == null) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Полная сборка журнала персоны (единственная IO-точка). */
export function buildJournal(slug, { repoRoot = REPO_ROOT } = {}) {
  const roleLabel = PERSONA_ROLE_LABELS[slug];
  if (!roleLabel) {
    throw new Error(`Неизвестная персона "${slug}". Доступные: ${Object.keys(PERSONA_ROLE_LABELS).join(', ')}.`);
  }
  const candidates = [
    ...collectSeansesCandidates(roleLabel, { repoRoot }),
    ...collectReviewCandidates(roleLabel, { repoRoot }),
  ];
  const HEADER_ALLOWANCE = 600; // шапка журнала тоже живёт в токен-бюджете
  const entries = selectEntries(candidates, {
    importance: collectImportance({ repoRoot }),
    budgetChars: TOKEN_BUDGET * CHARS_PER_TOKEN - HEADER_ALLOWANCE,
  });
  return renderJournal({ slug, roleLabel, entries, totalCandidates: candidates.length });
}

// ─── CLI ─────────────────────────────────────────────────────────────────────────

function main() {
  const argv = process.argv.slice(2);
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const slug = (argv.find((a) => !a.startsWith('--')) ?? '').toLowerCase();

  if (flags.has('--help') || flags.has('-h') || !slug) {
    console.log(`Usage: yarn persona:memory <persona> [--check | --stdout]

Персоны: ${Object.keys(PERSONA_ROLE_LABELS).sort(byCodePoint).join(', ')}
  --check    не писать; сравнить с ${MEMORY_DIR}/<persona>.md, exit 3 при расхождении
  --stdout   напечатать журнал в stdout, файл не трогать`);
    process.exit(slug ? 0 : 1);
  }

  let journal;
  try {
    journal = buildJournal(slug);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  const outRel = personaMemoryPath(slug);
  const outAbs = path.join(REPO_ROOT, outRel);

  if (flags.has('--stdout')) {
    console.log(journal);
    return;
  }
  if (flags.has('--check')) {
    const existing = existsSync(outAbs) ? readFileSync(outAbs, 'utf8') : null;
    if (existing === journal) {
      console.log(`OK: ${outRel} соответствует пересборке (идемпотентно).`);
      return;
    }
    console.error(`DRIFT: ${outRel} ${existing == null ? 'отсутствует' : 'отличается от пересборки'} — запусти yarn persona:memory ${slug}.`);
    process.exit(3);
  }
  mkdirSync(path.dirname(outAbs), { recursive: true });
  writeFileSync(outAbs, journal, 'utf8');
  console.log(`persona-memory → ${outRel}`);
}

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
