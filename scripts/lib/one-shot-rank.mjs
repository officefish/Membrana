/**
 * rankOneShotCandidates — подбор кандидатов one-shot (M5A / #1064 / EPIC V8).
 *
 * Возвращает **ранжированный список с обоснованием, не вердикт**.
 * Допуск (штамп S) остаётся у тимлида — самоаттестация исключена.
 *
 * Канон: docs/seanses/tasks-workshop-m5a-pick-2026-07-23.md · EPIC V8.
 * Предикат S по диффу — соседний `evaluateOneShotS` (#1022); здесь — до диффа.
 */

import { isForbiddenServerPath, ONE_SHOT_S_DEFAULTS } from './one-shot-s-predicate.mjs';

/** @typedef {'ready' | 'pending' | 'error'} DataReadiness */
/** @typedef {'unknown' | 'low' | 'medium' | 'critical'} ServerImpactClue */

/**
 * @typedef {object} RankSource
 * @property {string} id
 * @property {number} value  [0,1]
 * @property {DataReadiness} dataReadiness
 * @property {string} [note]
 */

/**
 * @typedef {object} RankedCandidate
 * @property {string} cardId
 * @property {number} score
 * @property {string} reasoning
 * @property {RankSource[]} sources
 * @property {ServerImpactClue} serverImpactClue
 */

/**
 * @typedef {object} ExcludedCandidate
 * @property {string} cardId
 * @property {string[]} reasons
 */

/**
 * @typedef {object} OneShotRankResult
 * @property {true} ok
 * @property {RankedCandidate[]} candidates
 * @property {ExcludedCandidate[]} excluded
 * @property {{ weights: typeof RANK_WEIGHTS, maxSizeHours: number, scoreThreshold: number }} meta
 */

export const RANK_WEIGHTS = Object.freeze({
  size: 0.3,
  server: 0.3,
  scope: 0.2,
  history: 0.2,
});

/** Часы по size карточки (оценка человека). Жёсткая отсечка: ≤ MAX_SIZE_HOURS. */
export const SIZE_HOURS = Object.freeze({ S: 3, M: 8, L: 16 });

export const MAX_SIZE_HOURS = 5;
export const SCORE_THRESHOLD = 0.4;

const CRITICAL_RE =
  /\b(background-office|background-media|background-cabinet|prisma\/migrations|deploy\/|production\s*db|prod\s*deploy)\b/iu;
const MEDIUM_RE =
  /\b(nestjs?|docker|vds|ssh\s+deploy|migrate|office\.mmbrn|media\.mmbrn)\b/iu;
const LOW_HINT_RE = /\b(docs\/|readme|typo|lint|comment|jsdoc)\b/iu;

/**
 * @param {number} n
 * @returns {number}
 */
function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * @param {object} card
 * @returns {string}
 */
export function cardCorpus(card) {
  return [card?.title, card?.notes, card?.promptPath, card?.archiveNotes, card?.id]
    .filter((x) => typeof x === 'string' && x.trim())
    .join('\n');
}

/**
 * Эвристика серверности до диффа (слои 2–4 EPIC; слой 1 — options.diffPaths).
 *
 * @param {object} card
 * @param {{ diffPaths?: string[] }} [opts]
 * @returns {{ clue: ServerImpactClue, readiness: DataReadiness, note: string }}
 */
export function inferServerImpactClue(card, opts = {}) {
  const paths = Array.isArray(opts.diffPaths) ? opts.diffPaths : null;
  if (paths && paths.length > 0) {
    const hit = paths.filter((p) => isForbiddenServerPath(p, ONE_SHOT_S_DEFAULTS));
    if (hit.length > 0) {
      return {
        clue: 'critical',
        readiness: 'ready',
        note: `diff touches server: ${hit.slice(0, 3).join(', ')}`,
      };
    }
    return { clue: 'low', readiness: 'ready', note: 'diff present, no forbidden server paths' };
  }

  const text = cardCorpus(card);
  if (!text.trim()) {
    return { clue: 'unknown', readiness: 'pending', note: 'no text to judge server impact' };
  }
  if (CRITICAL_RE.test(text)) {
    return { clue: 'critical', readiness: 'ready', note: 'critical keywords in card text' };
  }
  if (MEDIUM_RE.test(text)) {
    return { clue: 'medium', readiness: 'ready', note: 'medium server-adjacent keywords' };
  }
  if (LOW_HINT_RE.test(text)) {
    return { clue: 'low', readiness: 'ready', note: 'docs/typo-like hints' };
  }
  return { clue: 'unknown', readiness: 'pending', note: 'no server signal; treat as unknown' };
}

/**
 * @param {ServerImpactClue} clue
 * @returns {number} risk [0,1]
 */
export function serverImpactRisk(clue) {
  switch (clue) {
    case 'critical':
      return 1;
    case 'medium':
      return 0.55;
    case 'low':
      return 0.2;
    case 'unknown':
    default:
      return 0.35;
  }
}

/**
 * @param {object} card
 * @returns {{ value: number, readiness: DataReadiness, note: string }}
 */
export function scoreScopeClarity(card) {
  const title = typeof card?.title === 'string' ? card.title.trim() : '';
  const notes = typeof card?.notes === 'string' ? card.notes.trim() : '';
  if (!title) {
    return { value: 0, readiness: 'error', note: 'empty title' };
  }
  let v = 0.4;
  if (title.length >= 24) v += 0.2;
  if (notes.length >= 40) v += 0.25;
  if (/\b(DoD|acceptance|AC|проверить|тест)\b/iu.test(`${title}\n${notes}`)) v += 0.15;
  return { value: clamp01(v), readiness: 'ready', note: 'title/notes heuristics' };
}

/**
 * @param {object} card
 * @param {Record<string, { successRate?: number, shots?: number }> | null | undefined} history
 * @returns {{ value: number, readiness: DataReadiness, note: string }}
 */
export function scoreHistoricalReputation(card, history) {
  if (history == null) {
    return { value: 0.5, readiness: 'pending', note: 'no history feed (trail — v9)' };
  }
  if (typeof history !== 'object') {
    return { value: 0.5, readiness: 'error', note: 'history malformed' };
  }
  const id = card?.id != null ? String(card.id) : '';
  const lemmas = [id, ...(String(card?.title ?? '').toLowerCase().split(/\W+/u).filter((w) => w.length > 4))];
  let best = null;
  for (const key of lemmas) {
    if (history[key] && typeof history[key] === 'object') {
      best = history[key];
      break;
    }
  }
  if (!best) {
    return { value: 0.45, readiness: 'ready', note: 'no matching history lemma' };
  }
  const rate = Number(best.successRate);
  if (!Number.isFinite(rate)) {
    return { value: 0.5, readiness: 'error', note: 'successRate missing' };
  }
  return {
    value: clamp01(rate),
    readiness: 'ready',
    note: `history shots=${best.shots ?? '?'} rate=${rate}`,
  };
}

/**
 * @param {string | null | undefined} size
 * @returns {{ hours: number | null, readiness: DataReadiness, note: string }}
 */
export function resolveSizeHours(size) {
  if (size == null || size === '') {
    return { hours: null, readiness: 'error', note: 'size missing' };
  }
  const key = String(size).trim().toUpperCase();
  if (!(key in SIZE_HOURS)) {
    return { hours: null, readiness: 'error', note: `size «${size}» not S|M|L` };
  }
  return { hours: SIZE_HOURS[/** @type {keyof typeof SIZE_HOURS} */ (key)], readiness: 'ready', note: `size ${key}` };
}

/**
 * @param {number} hours
 * @returns {number}
 */
export function sizeNormFromHours(hours) {
  return clamp01((MAX_SIZE_HOURS - hours) / MAX_SIZE_HOURS);
}

/**
 * @param {RankSource[]} sources
 * @returns {number}
 */
export function computeScore(sources) {
  const byId = Object.fromEntries(sources.map((s) => [s.id, s.value]));
  return clamp01(
    RANK_WEIGHTS.size * (byId.size ?? 0) +
      RANK_WEIGHTS.server * (byId.server ?? 0) +
      RANK_WEIGHTS.scope * (byId.scope ?? 0) +
      RANK_WEIGHTS.history * (byId.history ?? 0),
  );
}

/**
 * @param {RankedCandidate} c
 * @returns {string}
 */
function formatReasoning(c) {
  const bits = c.sources.map((s) => `${s.id}=${s.value.toFixed(2)}[${s.dataReadiness}]`);
  return `score=${c.score.toFixed(3)}; server=${c.serverImpactClue}; ${bits.join(' · ')}`;
}

/**
 * rankOneShotCandidates(cards, options) → Result
 *
 * Чистая: без fs/сети. История и дифф — только из options.
 *
 * @param {object[]} cards
 * @param {{
 *   history?: Record<string, { successRate?: number, shots?: number }> | null,
 *   diffByCard?: Record<string, string[]>,
 * }} [options]
 * @returns {OneShotRankResult}
 */
export function rankOneShotCandidates(cards, options = {}) {
  /** @type {RankedCandidate[]} */
  const candidates = [];
  /** @type {ExcludedCandidate[]} */
  const excluded = [];

  for (const card of cards ?? []) {
    const cardId = card?.id != null ? String(card.id) : '(без id)';
    /** @type {string[]} */
    const reasons = [];

    const sizeInfo = resolveSizeHours(card?.size);
    if (sizeInfo.hours == null) {
      reasons.push(`size_invalid:${sizeInfo.note}`);
    } else if (sizeInfo.hours > MAX_SIZE_HOURS) {
      reasons.push(`size_hours>${MAX_SIZE_HOURS} (${sizeInfo.hours}h)`);
    }

    const diffPaths = options.diffByCard?.[cardId];
    const server = inferServerImpactClue(card, { diffPaths });
    if (server.clue === 'critical') {
      reasons.push('serverImpactClue=critical');
    }

    if (reasons.length > 0) {
      excluded.push({ cardId, reasons });
      continue;
    }

    const sizeValue = sizeNormFromHours(/** @type {number} */ (sizeInfo.hours));
    const risk = serverImpactRisk(server.clue);
    const scope = scoreScopeClarity(card);
    const hist = scoreHistoricalReputation(card, options.history);

    /** @type {RankSource[]} */
    const sources = [
      { id: 'size', value: sizeValue, dataReadiness: sizeInfo.readiness, note: sizeInfo.note },
      {
        id: 'server',
        value: clamp01(1 - risk),
        dataReadiness: server.readiness,
        note: server.note,
      },
      { id: 'scope', value: scope.value, dataReadiness: scope.readiness, note: scope.note },
      { id: 'history', value: hist.value, dataReadiness: hist.readiness, note: hist.note },
    ];

    const score = computeScore(sources);
    if (score < SCORE_THRESHOLD) {
      excluded.push({ cardId, reasons: [`score<${SCORE_THRESHOLD} (${score.toFixed(3)})`] });
      continue;
    }

    /** @type {RankedCandidate} */
    const ranked = {
      cardId,
      score,
      reasoning: '',
      sources,
      serverImpactClue: server.clue,
    };
    ranked.reasoning = formatReasoning(ranked);
    candidates.push(ranked);
  }

  candidates.sort((a, b) => b.score - a.score || a.cardId.localeCompare(b.cardId));

  return {
    ok: true,
    candidates,
    excluded,
    meta: {
      weights: RANK_WEIGHTS,
      maxSizeHours: MAX_SIZE_HOURS,
      scoreThreshold: SCORE_THRESHOLD,
    },
  };
}
