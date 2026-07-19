/**
 * transcript — поиск реплик владельца в jsonl-транскриптах Claude Code (#595 п.1).
 *
 * Реплика прячется в ТРЁХ местах, и фильтр по `type === 'user'` трижды за сессию
 * 17.07 объявлял живую реплику несуществующей:
 *   1. `type: user` — `message.content` строка ИЛИ массив text-блоков;
 *   2. `type: attachment`, `attachment.type: queued_command` — реплика, присланная
 *      посреди хода; `attachment.prompt` бывает строкой И массивом `{type:'text',text}`
 *      (замер 19.07 по живым транскриптам: 21 строка / 50 массивов);
 *   3. `tool_result` внутри `message.content` записи `type: user` — клик по вариантам.
 *
 * Чистая lib: без CLI, без process.exit. Потребители: `truth utterance`,
 * скилл membrana-truth-crystallization, будущий валидатор указателей.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

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
 * Все владельческие тексты одной записи транскрипта с их видом.
 *
 * @param {object} record разобранная строка jsonl
 * @returns {{kind: 'user'|'queued_command'|'tool_result', text: string}[]}
 */
export function extractUtterances(record) {
  if (!record || typeof record !== 'object') return [];
  const out = [];

  if (record.type === 'user' && record.message) {
    const content = record.message.content;
    if (typeof content === 'string') {
      if (content) out.push({ kind: 'user', text: content });
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === 'tool_result') {
          const text = textOfBlock(block);
          if (text) out.push({ kind: 'tool_result', text });
        } else {
          const text = textOfBlock(block);
          if (text) out.push({ kind: 'user', text });
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

/** Список jsonl-файлов каталога (не рекурсивно — сессии лежат плоско). */
export function listTranscriptFiles(dir) {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => join(dir, f));
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
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue; // битые строки ловит rawScan
      }
      for (const u of extractUtterances(record)) {
        if (match(u.text)) {
          hits.push({
            sessionId: record.sessionId ?? null,
            uuid: record.uuid ?? null,
            timestamp: record.timestamp ?? record.attachment?.timestamp ?? null,
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
