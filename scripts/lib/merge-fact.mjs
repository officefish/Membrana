/**
 * merge-fact — установление факта мерджа PR по origin/<base>, а не по gh (#1320).
 *
 * Вещдок 27.07 (блок доставки): при ожидании автослияния gh через прокси отдавал
 * противоречивые ответы — merged true/false вперемешку между соседними вызовами
 * (GraphQL и REST), фантомные SHA. Правду держит только граф: git fetch +
 * сквош-/merge-коммит «#N» в origin/<base>. gh здесь вспомогательный источник
 * (номер PR, подсказки) — решает git.
 *
 * Чистый вердикт (assessMergeFact) отделён от git-адаптеров: тестируется без сети.
 */
import { execFileSync } from 'node:child_process';

/** Явный таймаут внешних вызовов (#1320): дефолтный «без таймаута» вис на прокси. */
export const EXTERNAL_CALL_TIMEOUT_MS = 30_000;

/**
 * Чистый вердикт по собранным фактам.
 *
 * Иерархия источников: коммит в origin/<base> (git) решает; gh — вспомогательный.
 * gh «MERGED» без коммита в свежем origin/<base> — НЕ подтверждение (так прокси
 * и врал), а несвежий origin (fetch не прошёл) — honest unknown, не «ок» и не «нет».
 *
 * @param {{ prNumber?: number|string|null, base?: string, fetchOk?: boolean,
 *           commitInBase?: string|null, ghState?: string|null, ghMergeCommit?: string|null,
 *           ghShaInBase?: boolean }} facts
 * @returns {{ verdict: 'merged'|'not-merged'|'unknown', sha: string|null, reasons: string[] }}
 */
export function assessMergeFact(facts = {}) {
  const base = facts.base ?? 'main';
  const ghState = String(facts.ghState ?? '').toUpperCase();
  if (facts.commitInBase) {
    return {
      verdict: 'merged',
      sha: facts.commitInBase,
      reasons: [`коммит PR #${facts.prNumber ?? '?'} найден в origin/${base} (${String(facts.commitInBase).slice(0, 8)})`],
    };
  }
  if (facts.ghMergeCommit && facts.ghShaInBase === true) {
    return {
      verdict: 'merged',
      sha: facts.ghMergeCommit,
      reasons: [`mergeCommit ${String(facts.ghMergeCommit).slice(0, 8)} — предок origin/${base} (подтверждено графом)`],
    };
  }
  if (facts.fetchOk !== true) {
    return {
      verdict: 'unknown',
      sha: null,
      reasons: [
        `origin/${base} не обновился (сеть/прокси) — факт мерджа НЕ устанавливается`,
        ghState ? `gh говорит state=${ghState}, но gh вспомогательный — не принимать за факт` : 'gh тоже недоступен',
      ],
    };
  }
  const reasons = [`коммита PR #${facts.prNumber ?? '?'} нет в свежем origin/${base}`];
  if (ghState === 'MERGED') {
    reasons.push('gh говорит MERGED — расхождение с графом: gh вспомогательный, факт НЕ подтверждён (вещдок 27.07: прокси отдавал merged вперемешку)');
  }
  return { verdict: 'not-merged', sha: null, reasons };
}

/**
 * Паттерны коммита, приземляющего PR #N: сквош «title (#N)» (якорь конца строки —
 * «… (PR #N)» в середине текста НЕ считается) и явный merge-коммит.
 * @param {number|string} prNumber
 * @returns {string[]} расширенные regex для git log --grep
 */
export function prLandingPatterns(prNumber) {
  const n = String(prNumber).replace(/\D/gu, '');
  return [`\\(#${n}\\)$`, `^Merge pull request #${n} `];
}

/** Обновить origin/<base>. false — сеть/прокси не дали (honest unknown, не «ок»). */
export function fetchBase(base = 'main', run = execFileSync) {
  try {
    run('git', ['fetch', 'origin', base], { stdio: ['ignore', 'ignore', 'ignore'], timeout: EXTERNAL_CALL_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

/**
 * SHA коммита, приземлившего PR #N в origin/<base> (по локальному снимку —
 * свежесть обеспечивает fetchBase выше). null — не найден.
 */
export function findPrCommitInBase(prNumber, base = 'main', run = execFileSync) {
  try {
    const args = ['log', `origin/${base}`, '-E', '-1', '--format=%H'];
    for (const p of prLandingPatterns(prNumber)) args.push(`--grep=${p}`);
    const out = String(run('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: EXTERNAL_CALL_TIMEOUT_MS })).trim();
    return out || null;
  } catch {
    return null;
  }
}

/** Является ли sha предком origin/<base> (git-подтверждение чужого показания). */
export function shaInBase(sha, base = 'main', run = execFileSync) {
  try {
    run('git', ['merge-base', '--is-ancestor', sha, `origin/${base}`], { stdio: ['ignore', 'ignore', 'ignore'], timeout: EXTERNAL_CALL_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

/**
 * Merged-событие в таймлайне PR (REST) — самый несбиваемый ВСПОМОГАТЕЛЬНЫЙ сигнал
 * (27.07: gh state и даже git-реплики за прокси врали вперемешку, таймлайн — ни разу).
 * Решающим остаётся git-факт; таймлайн говорит «сервер слил, жди реплику».
 * @returns {boolean|null} null — выяснить не удалось (сеть)
 */
export function mergedEventSeen(prNumber, run = execFileSync) {
  try {
    const raw = String(run('gh', ['api', `repos/{owner}/{repo}/issues/${prNumber}/timeline`, '--jq', '[.[]|select(.event=="merged")]|length'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: EXTERNAL_CALL_TIMEOUT_MS,
    })).trim();
    const n = Number(raw);
    return Number.isFinite(n) ? n > 0 : null;
  } catch {
    return null;
  }
}

/**
 * Однострочный факт для гарда повторного хвоста (#1320): PR уже в origin/<base>?
 * fetch + поиск; gh не участвует. null — не найден ИЛИ не удалось установить
 * (различие для гарда не критично: гард при null просто идёт обычным путём).
 * @returns {string|null} sha приземлившего коммита
 */
export function alreadyInBase(prNumber, base = 'main', run = execFileSync) {
  if (prNumber == null) return null;
  fetchBase(base, run); // best-effort: локальный снимок мог уже содержать коммит
  return findPrCommitInBase(prNumber, base, run);
}
