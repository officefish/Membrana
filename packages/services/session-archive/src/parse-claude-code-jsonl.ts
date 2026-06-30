import { randomUUID } from 'node:crypto';
import type { Turn } from './types.js';

interface RawEntry {
  uuid?: string;
  sessionId?: string;
  type?: string;
  role?: string;
  timestamp?: string;
  message?: {
    role?: string;
    content?: unknown;
  };
  content?: unknown;
}

function contentToString(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((part: unknown) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          const p = part as Record<string, unknown>;
          if (typeof p.text === 'string') return p.text;
          if (typeof p.content === 'string') return p.content;
        }
        return '';
      })
      .join('');
  }
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if (typeof r.text === 'string') return r.text;
  }
  return JSON.stringify(raw ?? '');
}

/**
 * Парсит Claude Code JSONL-файл в нормализованный список Turn.
 * Одна строка JSONL = одна запись; некорректные строки пропускаются.
 */
export function parseClaudeCodeJSONL(buffer: Buffer): Turn[] {
  const lines = buffer.toString('utf8').split('\n');
  const sessionId = randomUUID();

  const turns: Turn[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry: RawEntry;
    try {
      entry = JSON.parse(trimmed) as RawEntry;
    } catch {
      continue;
    }

    const role =
      entry.message?.role ??
      entry.role ??
      entry.type ??
      'unknown';

    const rawContent =
      entry.message?.content ??
      entry.content ??
      '';

    turns.push({
      uuid: entry.uuid ?? randomUUID(),
      sessionId: entry.sessionId ?? sessionId,
      role,
      timestamp: entry.timestamp ?? new Date(0).toISOString(),
      content: contentToString(rawContent),
    });
  }

  return turns;
}
