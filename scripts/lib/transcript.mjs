/**
 * transcript — поиск реплик владельца в jsonl-транскриптах Claude Code (#595 п.1)
 * и Cursor agent-transcripts (role=user + nested <sessionId>/<sessionId>.jsonl).
 *
 * Реплика прячется в ТРЁХ местах (Claude), и фильтр по `type === 'user'` трижды за сессию
 * 17.07 объявлял живую реплику несуществующей:
 *   1. `type: user` — `message.content` строка ИЛИ массив text-блоков;
 *   2. `type: attachment`, `attachment.type: queued_command` — реплика, присланная
 *      посреди хода; `attachment.prompt` бывает строкой И массивом `{type:'text',text}`
 *      (замер 19.07 по живым транскриптам: 21 строка / 50 массивов);
 *   3. `tool_result` внутри `message.content` записи `type: user` — клик по вариантам.
 *
 * Cursor (22.07): `role: 'user'` без `type`/`sessionId`/`uuid`; текст в
 * `<user_query>…</user_query>`; сессии вложены на один уровень.
 *
 * Чистая lib: без CLI, без process.exit. Потребители: `truth utterance`,
 * скилл membrana-truth-crystallization, будущий валидатор указателей.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

/**
 * Каталог транскриптов проекта: ~/.claude/projects/<slug>, где slug — путь cwd
 * с заменой `[:\\/]` на дефисы. Буква диска встречается в обоих регистрах
 * (наблюдение 19.07: рядом лежат `c--Users-…` и `C--Users-…`) — берём существующий.
 *
 * @param {string} [cwd]
 * @returns {string|null} абсолютный путь или null, если каталога нет
 */
export function defaultTranscriptDir(cwd = process.cwd()) {
  // Замена ПО СИМВОЛУ, без схлопывания: `c:\Users` → `c--Users` (двойной дефис).
  const slug = resolve(cwd).replace(/[:\\/]/g, '-');
  if (!slug) return null;
  const base = join(homedir(), '.claude', 'projects');
  for (const candidate of [slug, slug[0].toLowerCase() + slug.slice(1), slug[0].toUpperCase() + slug.slice(1)]) {
    const abs = join(base, candidate);
    if (existsSync(abs)) return abs;
  }
  return null;
}

/** Текст из content-блока anthropic-формата (строка | {type:'text'} | {type:'tool_result'}). */
function textOfBlock(block) {
  if (typeof block === 'string') return block;
  if (block && typeof block.text === 'string') return block.text;
  if (block && typeof block.content === 'string') return block.content;
  if (block && Array.isArray(block.content)) {
    return block.content.map(textOfBlock).filter(Boolean).join('\n');
  }
  return '';
}

/**
 * Cursor agent-transcripts кладут реплику в `<user_query>…</user_query>` внутри
 * text-блока; для указателя и цитаты берём внутренность, если тег есть.
 * @param {string} text
 * @returns {string}
 */
function unwrapUserQuery(text) {
  const m = String(text).match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/i);
  return m ? m[1].trim() : text;
}

/**
 * ISO-ish из Cursor `<timestamp>Wednesday, Jul 22, 2026, 7:30 PM (UTC+3)</timestamp>`.
 * @param {string} text
 * @returns {string|null}
 */
function timestampFromCursorText(text) {
  const m = String(text).match(/<timestamp>\s*([^<]+?)\s*<\/timestamp>/i);
  if (!m) return null;
  const d = Date.parse(m[1].replace(/\s*\(UTC([+-]\d+)\)\s*$/i, ' GMT$1'));
  return Number.isFinite(d) ? new Date(d).toISOString() : null;
}

/**
 * Все владельческие тексты одной custom записи транскрипта с их видом.
 *
 * @param {object} record разобранная строка jsonl
 * @returns {{kind: 'user'|'queued_command'|'tool_result', text: string, raw?: string, timestampHint?: string|null}[]}
 */
export function extractUtterances(record) {
  if (!record || typeof record !== 'object') return [];
  const out = [];

  // Claude Code: type === 'user'
  // Cursor: role === 'user' (type отсутствует; sessionId/uuid на записи нет)
  const isUser =
    (record.type === 'user' || record.role === 'user') && record.message;
  if (isUser) {
    const content = record.message.content;
    if (typeof content === 'string') {
      if (content) {
        const text = unwrapUserQuery(content);
        /** @type {{kind: string, text: string, raw?: string, timestampHint?: string|null}} */
        const entry = { kind: 'user', text };
        if (text !== content) entry.raw = content;
        const ts = timestampFromCursorText(content);
        if (ts) entry.timestampHint = ts;
        out.push(entry);
      }
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === 'tool_result') {
          const text = textOfBlock(block);
          if (text) out.push({ kind: 'tool_result', text });
        } else {
          const raw = textOfBlock(block);
          if (raw) {
            const text = unwrapUserQuery(raw);
            /** @type {{kind: string, text: string, raw?: string, timestampHint?: string|null}} */
            const entry = { kind: 'user', text };
            if (text !== raw) entry.raw = raw;
            const ts = timestampFromCursorText(raw);
            if (ts) entry.timestampHint = ts;
            out.push(entry);
          }
        }
      }
    }
    return out;
  }

  if (record.type === 'attachment' && record.attachment?.type === 'queued_command') {
    const prompt = record.attachment.prompt;
    if (typeof prompt === 'string') {
      if (prompt) out.push({ kind: 'queued_command', text: prompt });
    } else if (Array.isArray(prompt)) {
      for (const block of prompt) {
        const text = textOfBlock(block);
        if (text) out.push({ kind: 'queued_command', text });
      }
    }
  }
  return out;
}

/** @param {string|RegExp} pattern @returns {(text: string) => boolean} */
function matcherOf(pattern) {
  if (pattern instanceof RegExp) return (text) => pattern.test(text);
  const needle = String(pattern).toLowerCase();
  return (text) => text.toLowerCase().includes(needle);
}

/**
 * Список jsonl-файлов каталога.
 * Claude Code — плоско; Cursor `agent-transcripts/<sessionId>/<sessionId>.jsonl` —
 * на один уровень глубже → обходим рекурсивно (глубина ≤ 3).
 * @param {string} dir
 * @param {number} [depth]
 * @returns {string[]}
 */
export function listTranscriptFiles(dir, depth = 0) {
  if (!dir || !existsSync(dir) || depth > 3) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) out.push(...listTranscriptFiles(abs, depth + 1));
    else if (name.endsWith('.jsonl')) out.push(abs);
  }
  return out;
}

/** sessionId из пути Cursor/Claude, если в записи поля нет. */
function sessionIdFromFile(file) {
  const base = basename(file, '.jsonl');
  const parent = basename(dirname(file));
  // Cursor: …/agent-transcripts/<uuid>/<uuid>.jsonl
  if (parent && parent !== 'agent-transcripts' && parent === base) return parent;
  return base;
}

/**
 * Структурный поиск указателя правды по всем трём местам.
 *
 * @param {string|RegExp} pattern подстрока (case-insensitive) или RegExp
 * @param {{dir: string}} opts каталог с *.jsonl
 * @returns {{sessionId: string, uuid: string, timestamp: string, kind: string,
 *            text: string, file: string}[]}
 */
export function findUtterances(pattern, { dir }) {
  const match = matcherOf(pattern);
  const hits = [];
  for (const file of listTranscriptFiles(dir)) {
    let raw;
    try {
      raw = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = raw.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.trim()) continue;
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue; // битые строки ловит rawScan
      }
      for (const u of extractUtterances(record)) {
        // Матч по цитате И по сырому блоку (Cursor: ищем «A» или кусок timestamp-обёртки).
        if (match(u.text) || (u.raw && match(u.raw))) {
          hits.push({
            sessionId: record.sessionId ?? sessionIdFromFile(file),
            // Cursor не пишет uuid — стабильный указатель на строку файла (очная ставка).
            uuid: record.uuid ?? `cursor-line-${i + 1}`,
            timestamp:
              record.timestamp ??
              record.attachment?.timestamp ??
              u.timestampHint ??
              null,
            kind: u.kind,
            text: u.text,
            file,
          });
        }
      }
    }
  }
  return hits;
}

/**
 * Фолбэк: сырой поиск строкой по файлам — когда структурный парс промахнулся
 * (битый JSON, новый тип записи). Норма #595 п.4: перед «не найдено» проверить
 * сырой строкой; результат предъявлять со способом поиска и его границей.
 *
 * @param {string|RegExp} pattern
 * @param {{dir: string}} opts
 * @returns {{file: string, line: number, snippet: string}[]}
 */
export function rawScan(pattern, { dir }) {
  const match = matcherOf(pattern);
  const hits = [];
  for (const file of listTranscriptFiles(dir)) {
    let raw;
    try {
      raw = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = raw.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i] && match(lines[i])) {
        hits.push({ file, line: i + 1, snippet: lines[i].slice(0, 200) });
      }
    }
  }
  return hits;
}
