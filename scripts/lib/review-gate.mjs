/**
 * review-gate — шип-гейт: мердж в main только через ревью-вердикт тимлида,
 * привязанный к HEAD SHA (карточка `ship-review-tooth` #924; слово владельца 29.07:
 * «весь код PR-ов, попадающий в main, прогнать через ревью с тимлидом», BLOCK — стоп).
 *
 * Почему по SHA, а не «ревью было»: ревью без привязки к содержанию обходится молча —
 * прогнал на одном коммите, дописал второй, влил неревьюенное. Вердикт принадлежит
 * ИМЕННО той версии кода, которую смотрели; новый коммит протухает вердикт.
 *
 * Три исхода, третий честен:
 *   · pass    — LGTM по текущему HEAD SHA;
 *   · block   — BLOCK по текущему SHA (или вердикт есть, но по другому коммиту);
 *   · unknown — ревью не прогонялось / канал недоступен. НЕ pass: недоступность
 *     проверки никогда не считается её прохождением (тот же закон, что у infra:probe).
 *
 * Обход существует и ГРОМКИЙ: REVIEW_GATE_OVERRIDE=1 требует причины в
 * REVIEW_GATE_OVERRIDE_REASON и попадает в вывод — иначе при мёртвом LLM-канале
 * контур замирает целиком (Anthropic исчерпан до 01.08 — живой риск, не гипотеза).
 *
 * Чистые функции: ни ФС, ни сети — адаптеры снаружи.
 */

export const REVIEW_STATUS_CONTEXT = 'review/teamlead';
export const VERDICT_MARKER = '<!-- review-verdict';

/**
 * Разбор вердикта из markdown ревью: маркер несёт SHA и решение.
 * Форма: `<!-- review-verdict sha:<40hex> verdict:LGTM|BLOCK lead:<id> at:<iso> -->`
 * @param {string} md
 * @returns {{sha: string, verdict: 'LGTM'|'BLOCK', lead: string|null, at: string|null} | null}
 */
export function parseVerdict(md) {
  const m = /<!--\s*review-verdict\s+sha:([0-9a-f]{7,40})\s+verdict:(LGTM|BLOCK)(?:\s+lead:(\S+))?(?:\s+at:(\S+))?\s*-->/u.exec(String(md ?? ''));
  if (!m) return null;
  return { sha: m[1], verdict: m[2], lead: m[3] ?? null, at: m[4] ?? null };
}

/** Маркер для записи в файл ревью (обвязка подставляет факты). */
export function renderVerdictMarker({ sha, verdict, lead, at }) {
  return `<!-- review-verdict sha:${sha} verdict:${verdict} lead:${lead ?? 'unknown'} at:${at ?? new Date().toISOString()} -->`;
}

/**
 * Решение гейта.
 * @param {{headSha: string|null, verdict: ReturnType<typeof parseVerdict>, override?: {enabled: boolean, reason?: string}}} input
 * @returns {{state: 'pass'|'block'|'unknown', reason: string}}
 */
export function reviewGateDecision({ headSha, verdict, override } = {}) {
  if (override?.enabled) {
    const reason = String(override.reason ?? '').trim();
    if (!reason) {
      return {
        state: 'block',
        reason: 'обход шип-гейта запрошен без причины — REVIEW_GATE_OVERRIDE=1 требует REVIEW_GATE_OVERRIDE_REASON (молчаливый обход = дыра, ради которой гейт и строился)',
      };
    }
    return { state: 'pass', reason: `ОБХОД владельца: ${reason} — ревью тимлида НЕ проходилось, факт записан в вывод` };
  }
  if (!headSha) {
    return { state: 'unknown', reason: 'HEAD SHA не определился — к чему привязывать вердикт, неизвестно (git недоступен?)' };
  }
  if (!verdict) {
    return { state: 'unknown', reason: `ревью тимлида по этому PR не найдено — прогнать: yarn code-review:pr <N> (вердикт привяжется к ${headSha.slice(0, 8)})` };
  }
  if (!sameSha(verdict.sha, headSha)) {
    return {
      state: 'block',
      reason: `вердикт протух: смотрели ${verdict.sha.slice(0, 8)}, на ветке ${headSha.slice(0, 8)} — после ревью появились коммиты; перепрогнать ревью`,
    };
  }
  if (verdict.verdict === 'BLOCK') {
    return { state: 'block', reason: `тимлид дал BLOCK по ${headSha.slice(0, 8)} — устранить замечания и перепрогнать ревью (жёсткий стоп, слово владельца 29.07)` };
  }
  return { state: 'pass', reason: `LGTM тимлида (${verdict.lead ?? 'lead'}) по ${headSha.slice(0, 8)}` };
}

/** Сравнение SHA с учётом коротких форм (7+ hex). */
export function sameSha(a, b) {
  const x = String(a ?? '').toLowerCase();
  const y = String(b ?? '').toLowerCase();
  if (!x || !y) return false;
  const n = Math.min(x.length, y.length);
  return n >= 7 && x.slice(0, n) === y.slice(0, n);
}

/** Состояние → commit status GitHub (context REVIEW_STATUS_CONTEXT). */
export function statusFromDecision(decision) {
  if (decision.state === 'pass') return { state: 'success', description: decision.reason.slice(0, 140) };
  if (decision.state === 'block') return { state: 'failure', description: decision.reason.slice(0, 140) };
  return { state: 'pending', description: decision.reason.slice(0, 140) };
}
