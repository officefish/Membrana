/**
 * Грязный слой слепка links для validateTask / validateRegistry (M4B / #1061).
 *
 * Сеть и fs — только здесь. Недоступность внешней системы → `unknown`, не throw.
 * Предикаты в task-validity.mjs остаются чистыми.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  computeReadmeMatchesRegistry,
  emptyTaskLinks,
} from './task-validity.mjs';

/** Маркеры заготовки промпта (живой дефект 23.07). */
const STUB_MARKERS = [
  'ЗАПОЛНИТЬ до кода',
  'Acceptance criteria (scaffold)',
  '> Заполнить до кода.',
  '- [ ] …',
];

/**
 * @param {string} text
 * @returns {boolean}
 */
export function detectPromptStub(text) {
  if (typeof text !== 'string' || !text.trim()) return true;
  let hits = 0;
  for (const m of STUB_MARKERS) {
    if (text.includes(m)) hits += 1;
  }
  // Двух маркеров достаточно: один «…» может встретиться в живом AC.
  return hits >= 2;
}

/**
 * @param {string} cwd
 * @param {string | null | undefined} promptPath
 * @returns {{ promptExists: boolean | 'unknown', promptIsStub: boolean | 'unknown' }}
 */
export function collectPromptFacts(cwd, promptPath) {
  if (!promptPath || typeof promptPath !== 'string' || !promptPath.trim()) {
    return { promptExists: false, promptIsStub: false };
  }
  try {
    const abs = resolve(cwd, promptPath.trim());
    if (!existsSync(abs)) {
      return { promptExists: false, promptIsStub: false };
    }
    const text = readFileSync(abs, 'utf8');
    return { promptExists: true, promptIsStub: detectPromptStub(text) };
  } catch {
    return { promptExists: 'unknown', promptIsStub: 'unknown' };
  }
}

/**
 * @param {string} cwd
 * @param {string | null | undefined} insightId
 * @returns {boolean | 'unknown' | null}
 */
export function collectInsightExists(cwd, insightId) {
  if (!insightId || typeof insightId !== 'string' || !insightId.trim()) return null;
  try {
    const id = insightId.trim();
    const candidates = [
      join(cwd, 'docs', 'insights', `${id}.md`),
      join(cwd, 'docs', 'insights', 'active', `${id}.md`),
      join(cwd, 'docs', 'insights', 'archive', `${id}.md`),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return true;
    }
    return false;
  } catch {
    return 'unknown';
  }
}

/**
 * Offline/default: issue/linear → unknown (не ходим в сеть).
 * Промпт и insight — с диска.
 *
 * @param {object} card
 * @param {string} cwd
 */
export function collectTaskLinksOffline(card, cwd) {
  const base = emptyTaskLinks(card);
  const prompt = collectPromptFacts(cwd, card?.promptPath);
  return {
    ...base,
    promptExists: prompt.promptExists,
    promptIsStub: prompt.promptIsStub,
    insightExists: collectInsightExists(cwd, card?.insightId),
  };
}

/**
 * @param {object[]} cards
 * @param {string} cwd
 * @param {{ readmeText?: string | null }} [opts]
 */
export function collectRegistryLinksOffline(cards, cwd, opts = {}) {
  /** @type {Record<string, ReturnType<typeof collectTaskLinksOffline>>} */
  const byCard = {};
  for (const card of cards ?? []) {
    if (!card?.id) continue;
    byCard[card.id] = collectTaskLinksOffline(card, cwd);
  }

  let readmeMatchesRegistry = /** @type {boolean | 'unknown'} */ ('unknown');
  try {
    const text =
      opts.readmeText != null
        ? opts.readmeText
        : readFileSync(join(cwd, 'docs', 'tasks', 'README.md'), 'utf8');
    readmeMatchesRegistry = computeReadmeMatchesRegistry(cards, text);
  } catch {
    readmeMatchesRegistry = 'unknown';
  }

  return { byCard, readmeMatchesRegistry };
}
