/**
 * Intern T3 (#197): утренний research-дайджест через Perplexity Sonar.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { perplexityAsk } from './insight-ritual.mjs';

export const DEFAULT_DIGEST_TOPIC =
  'acoustic detection of small UAVs / drones open models and field systems 2025-2026';

export function resolveDigestTopic(env = process.env) {
  return env.OFFICE_DIGEST_TOPIC?.trim() || DEFAULT_DIGEST_TOPIC;
}

/** @param {string} isoDate YYYY-MM-DD */
export function digestPathForDate(repoRoot, isoDate) {
  return join(repoRoot, 'docs', 'research', `digest-${isoDate}.md`);
}

export function todayIso(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Промпт для Sonar: секретарский регистр, жёсткий формат.
 * @param {string} topic
 * @param {string} date
 */
export function buildDigestQuery(topic, date) {
  return [
    `You are a briefing secretary. Topic: ${topic}.`,
    `As of ${date}, list 5 to 7 of the most important recent developments.`,
    'Rules:',
    '- Neutral secretary register only: facts and sourcing, no advice, no "should try", no action items.',
    '- Rank by importance (most important first).',
    '- Each item: 1-2 sentences max.',
    '- Every item MUST include a public source URL and a publication date (YYYY-MM-DD if known, else year-month).',
    '- Omit anything that cannot be sourced.',
    '',
    'Output EXACTLY this markdown shape (no intro, no outro):',
    '1. <one or two sentences>',
    '   - Source: <url> (<date>)',
    '2. ...',
  ].join('\n');
}

/**
 * Грубая разборка ответа Sonar в пункты (best-effort).
 * @param {string} raw
 * @returns {{text:string, source:string, date:string}[]}
 */
export function parseDigestItems(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return [];
  const chunks = text.split(/\n(?=\d+\.\s+)/);
  const items = [];
  for (const chunk of chunks) {
    const m = chunk.match(
      /^\d+\.\s+([\s\S]+?)\n[ \t]*[-*][ \t]*Source:[ \t]*(\S+)[ \t]*\(([^)]+)\)/i,
    );
    if (!m) continue;
    const body = m[1].trim().replace(/\s+/g, ' ');
    const source = m[2].trim();
    const date = m[3].trim() || 'n/a';
    if (!body || !source) continue;
    items.push({ text: body, source, date });
    if (items.length >= 7) break;
  }
  return items;
}

/**
 * @param {{topic:string, date:string, items:{text:string,source:string,date:string}[], model?:string}} opts
 */
export function renderDigestMarkdown(opts) {
  const { topic, date, items, model = 'sonar' } = opts;
  const lines = [
    `# Research digest — ${date}`,
    '',
    `Topic: ${topic}`,
    `Source: Perplexity ${model}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Brief',
    '',
  ];
  items.forEach((item, i) => {
    lines.push(`${i + 1}. ${item.text}`);
    lines.push(`   - Source: ${item.source} (${item.date})`);
    lines.push('');
  });
  return `${lines.join('\n').trimEnd()}\n`;
}

/**
 * @param {{
 *   repoRoot: string,
 *   apiKey?: string,
 *   topic?: string,
 *   date?: string,
 *   dryRun?: boolean,
 *   force?: boolean,
 *   ask?: (key: string, query: string) => Promise<string>,
 * }} opts
 */
export async function runResearchDigest(opts) {
  const date = opts.date ?? todayIso();
  const topic = opts.topic ?? resolveDigestTopic();
  const outPath = digestPathForDate(opts.repoRoot, date);

  if (!opts.force && !opts.dryRun && existsSync(outPath)) {
    return { outcome: 'skipped-exists', path: outPath, date, topic };
  }

  const apiKey = opts.apiKey?.trim();
  if (!apiKey) {
    return { outcome: 'no-key', path: outPath, date, topic };
  }

  const ask = opts.ask ?? perplexityAsk;
  const raw = await ask(apiKey, buildDigestQuery(topic, date));
  const items = parseDigestItems(raw);
  if (items.length < 1) {
    return { outcome: 'parse-empty', path: outPath, date, topic, raw };
  }

  const markdown = renderDigestMarkdown({ topic, date, items: items.slice(0, 7) });
  if (opts.dryRun) {
    return { outcome: 'dry-run', path: outPath, date, topic, markdown, items };
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, markdown, 'utf8');
  return { outcome: 'written', path: outPath, date, topic, markdown, items };
}
