#!/usr/bin/env node
/**
 * Hermes brief — детерминированный сборщик состояния сессии.
 *
 * Собирает 6 разбросанных источников (HANDOFF ночного билда, MAIN_DAY_ISSUE,
 * активные карточки реестра, открытые PR, память агента, git за сегодня) в один
 * иерархичный `docs/HERMES_BRIEF.md`. Это **функция ритма**, не 6-я роль команды:
 * бриф ДЕСКРИПТИВНЫЙ (ссылается на артефакты), НЕ нормативный (не переписывает
 * plan:day / standup) и БЕЗ LLM-резюме — только факты и ссылки.
 *
 * Контракт детерминизма (Математик): один вход (commit hash + набор файлов) →
 * побайтово одинаковый выход, кроме явного блока «Метаданные» с timestamp.
 * IO отделён (`collectState`) от чистого рендера (`renderBrief`).
 *
 * Разграничение (Структурщик): скрипт ЧИТАЕТ выходные артефакты plan:day / standup /
 * night, но НЕ импортирует их логику — он агрегатор ссылок. git-контекст дня
 * переиспользуется из `lib/git-day-context.mjs`, не дублируется.
 *
 * Инсайт: insight-hermes-liaison-agent (adopted, вес 7.4/10). Владелец — Dynin.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { todaysCommits, todaysChangedFiles } from './lib/git-day-context.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const OUTPUT = 'docs/HERMES_BRIEF.md';
const NA = '_н/д_';

// ─── низкоуровневые обёртки IO (возвращают null на любой сбой, не бросают) ────────

function readTextOrNull(absPath) {
  try {
    return readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }
}

function runOrNull(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

// ─── чистые помощники (экспортируются для теста) ─────────────────────────────────

/**
 * Детерминированное сравнение строк по code-point (UTF-16), НЕ локале-зависимое.
 * localeCompare ломает контракт «побайтово одинаковый выход» между сборками Node
 * (full-icu vs small-icu). Конвенция кодовой базы — обычный `.sort()`; здесь явно.
 */
export function byCodePoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Снять markdown-эмфазу (`**`, `*`, `` ` ``) с текста заголовка — чтобы не вложить bold в bold. */
export function stripEmphasis(text) {
  return String(text ?? '')
    .replace(/[*`]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Заголовки markdown (строки с #), с уровнем и текстом (эмфаза снята). `#` внутри code-fence игнорируется. */
export function extractHeadings(md) {
  if (!md) return [];
  const out = [];
  let inFence = false;
  for (const l of md.split('\n')) {
    if (/^\s*(```|~~~)/.test(l)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = l.match(/^(#{1,6})\s+(.*\S)\s*$/);
    if (m) out.push({ level: m[1].length, text: stripEmphasis(m[2]) });
  }
  return out;
}

/** Активные карточки реестра → стабильно отсортированы по id. */
export function selectActiveCards(registry) {
  const tasks = (registry && Array.isArray(registry.tasks) ? registry.tasks : []).filter(
    (t) => t && t.status === 'active',
  );
  const cards = tasks
    .map((t) => ({ id: String(t.id ?? ''), title: String(t.title ?? '') }))
    .sort((a, b) => byCodePoint(a.id, b.id));
  return { cards, total: cards.length };
}

/** Открытые PR → стабильно отсортированы по номеру (возрастание). */
export function sortPRs(prs) {
  return [...(Array.isArray(prs) ? prs : [])]
    .map((p) => ({
      number: Number(p.number),
      title: String(p.title ?? ''),
      headRefName: String(p.headRefName ?? ''),
    }))
    .sort((a, b) => a.number - b.number);
}

/** Из списка {date, path} выбрать самый свежий (по лексикографич. дате ISO). */
export function pickLatestHandoff(entries) {
  const sorted = [...(Array.isArray(entries) ? entries : [])].sort((a, b) =>
    byCodePoint(b.date, a.date),
  );
  return sorted[0] ?? null;
}

// ─── сбор источников (IO; каждый с graceful fallback → { ok:false }) ─────────────

function collectFocus() {
  const rel = 'docs/MAIN_DAY_ISSUE.md';
  const md = readTextOrNull(path.join(REPO_ROOT, rel));
  if (md == null) return { ok: false, reason: 'нет docs/MAIN_DAY_ISSUE.md' };
  const headings = extractHeadings(md);
  const title = headings.find((h) => h.level === 1)?.text ?? null;
  const focusHeading = headings.find((h) => h.level === 2)?.text ?? null;
  return { ok: true, link: rel, title, focusHeading };
}

function collectHandoff() {
  const dirRel = 'docs/archive/night-build';
  const dirAbs = path.join(REPO_ROOT, dirRel);
  let dates = [];
  try {
    dates = readdirSync(dirAbs, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(path.join(dirAbs, d.name, 'HANDOFF.md')))
      .map((d) => ({ date: d.name, path: `${dirRel}/${d.name}/HANDOFF.md` }));
  } catch {
    return { ok: false, reason: 'нет docs/archive/night-build' };
  }
  const latest = pickLatestHandoff(dates);
  if (!latest) return { ok: false, reason: 'нет ни одного HANDOFF.md' };
  const md = readTextOrNull(path.join(REPO_ROOT, latest.path));
  const headings = extractHeadings(md);
  const title = headings.find((h) => h.level === 1)?.text ?? null;
  const sections = headings.filter((h) => h.level === 2).map((h) => h.text);
  return { ok: true, date: latest.date, link: latest.path, title, sections };
}

function collectActiveCards() {
  const rel = 'docs/tasks/registry.json';
  const raw = readTextOrNull(path.join(REPO_ROOT, rel));
  if (raw == null) return { ok: false, reason: 'нет docs/tasks/registry.json' };
  let registry;
  try {
    registry = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'registry.json не парсится' };
  }
  return { ok: true, link: rel, ...selectActiveCards(registry) };
}

function collectOpenPRs() {
  const out = runOrNull('gh', [
    'pr',
    'list',
    '--json',
    'number,title,headRefName',
    '--limit',
    '50',
  ]);
  if (out == null) return { ok: false, reason: 'gh недоступен / не авторизован' };
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch {
    return { ok: false, reason: 'gh вернул не-JSON' };
  }
  return { ok: true, prs: sortPRs(parsed) };
}

/**
 * Слаг проекта Claude Code из абсолютного пути репо: `C:\Users\x\repo` →
 * `c--Users-x-repo` (первый символ в lower, `:`/`\`/`/` → `-`). Детерминированно.
 */
export function claudeProjectSlug(repoRoot) {
  const p = repoRoot.length > 0 ? repoRoot[0].toLowerCase() + repoRoot.slice(1) : repoRoot;
  return p.replace(/[:\\/]/g, '-');
}

/**
 * Кандидаты на путь индекса памяти агента, по приоритету:
 * 1) HERMES_MEMORY_PATH (явный override);
 * 2) авто-память Claude Code: ~/.claude/projects/<slug>/memory/MEMORY.md;
 * 3) legacy: MEMORY.md в корне репо.
 */
export function memoryPathCandidates({ repoRoot = REPO_ROOT, home = os.homedir(), env = process.env } = {}) {
  const out = [];
  if (env.HERMES_MEMORY_PATH) {
    const rel = env.HERMES_MEMORY_PATH;
    out.push(path.isAbsolute(rel) ? rel : path.join(repoRoot, rel));
  }
  out.push(path.join(home, '.claude', 'projects', claudeProjectSlug(repoRoot), 'memory', 'MEMORY.md'));
  out.push(path.join(repoRoot, 'MEMORY.md'));
  return out;
}

function collectMemory() {
  const candidates = memoryPathCandidates();
  for (const abs of candidates) {
    const md = readTextOrNull(abs);
    if (md == null) continue;
    const entryCount = md.split('\n').filter((l) => /^\s*[-*]\s+/.test(l)).length;
    return { ok: true, link: abs, entryCount };
  }
  return { ok: false, reason: `нет MEMORY.md (проверены ${candidates.length} пути)` };
}

function collectGit() {
  return {
    commit: (runOrNull('git', ['rev-parse', '--short', 'HEAD']) || '').trim() || null,
    commits: todaysCommits({ limit: 15 }),
    changed: todaysChangedFiles(),
  };
}

/** Полный сбор состояния (единственная IO-точка). */
export function collectState({ generatedAt } = {}) {
  const git = collectGit();
  return {
    focus: collectFocus(),
    openPRs: collectOpenPRs(),
    activeCards: collectActiveCards(),
    handoff: collectHandoff(),
    memory: collectMemory(),
    git,
    meta: { commit: git.commit, generatedAt: generatedAt ?? new Date().toISOString() },
  };
}

// ─── чистый рендер markdown (детерминирован по состоянию) ─────────────────────────

const CARDS_IN_NOW = 8; // «Сейчас» держим коротким (Музыкант)
const HANDOFF_SECTIONS_CAP = 6; // не вываливать все чекпоинты ночей

function link(text, href) {
  return `[${text}](${href})`;
}

/** @returns {string} markdown-бриф. Чистая функция от state. */
export function renderBrief(state) {
  const L = [];
  L.push('# HERMES_BRIEF — состояние сессии');
  L.push('');
  L.push('> Автогенерация `yarn hermes:brief`. Дескриптивный сборник ссылок на 6 источников —');
  L.push('> не переписывает `plan:day` / `standup`, не резюмирует их своими словами.');
  L.push('');

  // ── Сейчас ──────────────────────────────────────────────────────────────────
  L.push('## Сейчас');
  L.push('');
  if (state.focus.ok) {
    const f = state.focus;
    const focusTxt = f.focusHeading ? `**${f.focusHeading}**` : (f.title ?? 'см. документ');
    L.push(`- **Фокус дня:** ${focusTxt} — ${link(f.title ?? 'MAIN_DAY_ISSUE', f.link)}`);
  } else {
    L.push(`- **Фокус дня:** ${NA} (${state.focus.reason})`);
  }

  if (state.openPRs.ok) {
    const prs = state.openPRs.prs;
    L.push(`- **Открытые PR (${prs.length}):**`);
    if (prs.length === 0) L.push('  - _нет открытых PR_');
    for (const p of prs) L.push(`  - #${p.number} — ${p.title} \`${p.headRefName}\``);
  } else {
    L.push(`- **Открытые PR:** ${NA} (${state.openPRs.reason})`);
  }

  if (state.activeCards.ok) {
    const { cards, total } = state.activeCards;
    L.push(`- **Активные карточки (${total}):**`);
    for (const c of cards.slice(0, CARDS_IN_NOW)) L.push(`  - \`${c.id}\` — ${c.title}`);
    if (total > CARDS_IN_NOW) {
      L.push(`  - …ещё ${total - CARDS_IN_NOW} — см. ${link('registry.json', state.activeCards.link)}`);
    }
  } else {
    L.push(`- **Активные карточки:** ${NA} (${state.activeCards.reason})`);
  }
  L.push('');

  // ── Контекст ─────────────────────────────────────────────────────────────────
  L.push('## Контекст');
  L.push('');
  L.push('### HANDOFF ночного билда');
  if (state.handoff.ok) {
    const h = state.handoff;
    L.push(`- ${link(h.title ?? `HANDOFF ${h.date}`, h.link)} (дата: ${h.date})`);
    if (h.sections.length) {
      const shown = h.sections.slice(0, HANDOFF_SECTIONS_CAP).map((s) => `«${s}»`).join(', ');
      const more = h.sections.length > HANDOFF_SECTIONS_CAP
        ? ` …ещё ${h.sections.length - HANDOFF_SECTIONS_CAP}`
        : '';
      L.push(`- Разделы: ${shown}${more}`);
    }
  } else {
    L.push(`- ${NA} (${state.handoff.reason})`);
  }
  L.push('');

  L.push('### Git за сегодня');
  if (state.git.commits) {
    L.push('```text');
    L.push(state.git.commits);
    L.push('```');
  } else {
    L.push('- _коммитов за сегодня нет_');
  }
  const changed = state.git.changed;
  if (changed.files.length) {
    const more = changed.more ? ` (+ещё ${changed.more})` : '';
    L.push(`- Затронуто файлов: ${changed.files.length}${more}`);
  }
  L.push('');

  L.push('### Память агента');
  if (state.memory.ok) {
    L.push(`- ${link(state.memory.link, state.memory.link)} — индекс, записей: ${state.memory.entryCount}`);
  } else {
    L.push(`- ${NA} (${state.memory.reason})`);
  }
  L.push('');

  // ── Метаданные (единственный недетерминированный блок — «датчик возраста») ─────
  L.push('## Метаданные');
  L.push('');
  L.push(`- commit: \`${state.meta.commit ?? 'н/д'}\``);
  L.push(`- сгенерировано: ${state.meta.generatedAt}`);
  L.push('');

  return L.join('\n');
}

/** Вырезает блок «Метаданные» — для сравнения детерминизма в тесте. */
export function stripMetadata(md) {
  return md.split('\n## Метаданные')[0];
}

// ─── CLI ─────────────────────────────────────────────────────────────────────────

function main() {
  const state = collectState();
  const md = renderBrief(state);
  const outAbs = path.join(REPO_ROOT, OUTPUT);
  writeFileSync(outAbs, md, 'utf8');
  console.log(`Hermes brief → ${OUTPUT} (commit ${state.meta.commit ?? 'н/д'})`);
}

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
