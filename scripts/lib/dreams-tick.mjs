/**
 * Тик синтеза сна (M5): пара тезисов → failover-кубик → append в DreamsLog.
 * Провайдеры снаружи через DreamSynthesisPort; классы отказа — classifyOutcome
 * (balance/auth/rate-limit → следующий; терминал synthesisFailed).
 */
import { rollProvider, DREAM_PROVIDERS } from './dreams-select.mjs';
import { classifyOutcome } from '../llm-probe.mjs';
import {
  DREAM_MASTER_AUTHOR,
  dreamMasterVersion,
  validateDreamEvent,
} from './dreams-log.mjs';

/** Классы, при которых кубик крутит следующего провайдера. */
export const FAILOVER_CLASSES = new Set([
  'balance',
  'auth/geo',
  'rate-limit',
  'blocked-html',
  'net',
  'timeout',
  'tls-fail',
]);

/**
 * Нужен ли failover на следующий провайдер по исходу зонда/вызова.
 * @param {string} outcomeClass
 */
export function shouldFailover(outcomeClass) {
  if (FAILOVER_CLASSES.has(outcomeClass)) return true;
  if (/^http-5/u.test(outcomeClass)) return true;
  return false;
}

/**
 * Собрать seed тика (воспроизводим): day + hour + pair.
 * @param {{day: string, hour: number, pair: [string, string]}} input
 */
export function tickSeed(input) {
  return `${input.day}|h${input.hour}|${input.pair[0]}+${input.pair[1]}`;
}

/**
 * Один тик. `synthesize(provider, ctx)` — порт; бросает или возвращает
 * `{ ok:false, status?, bodyText?, error? }` / `{ ok:true, text, score? }`.
 *
 * @param {{
 *   day: string,
 *   hour: number,
 *   pair: [string, string] | null,
 *   promptMd: string,
 *   synthesize: (provider: string, ctx: object) => Promise<object>,
 *   seed?: string,
 * }} input
 * @returns {Promise<object>} событие для DreamsLog.append (ещё не записано)
 */
export async function runDreamTick(input) {
  const version = dreamMasterVersion(input.promptMd);
  const hour = Number(input.hour);
  const day = input.day;

  if (input.pair == null) {
    return {
      day,
      hour,
      status: 'skipped',
      author: DREAM_MASTER_AUTHOR,
      version,
      reason: 'no-pair',
      attempts: [],
    };
  }

  const pair = input.pair;
  const seed = input.seed ?? tickSeed({ day, hour, pair });
  /** @type {object[]} */
  const attempts = [];

  for (let attempt = 0; attempt < DREAM_PROVIDERS.length; attempt += 1) {
    const provider = rollProvider(seed, attempt);
    if (provider == null) break;
    try {
      const result = await input.synthesize(provider, { day, hour, pair, seed, attempt, version });
      if (result?.ok === true && typeof result.text === 'string' && result.text.trim()) {
        attempts.push({ provider, attempt, outcome: 'ok' });
        const event = {
          day,
          hour,
          status: 'synthesized',
          author: DREAM_MASTER_AUTHOR,
          version,
          pair,
          provider,
          seed,
          attempts,
          score: typeof result.score === 'number' ? result.score : 0.5,
          text: result.text.trim(),
          phase: 'synthesize',
        };
        const v = validateDreamEvent(event);
        if (!v.ok) throw new Error(v.reason);
        return v.event;
      }
      const outcome = classifyOutcome({
        status: result?.status,
        bodyText: result?.bodyText ?? result?.error ?? '',
        error: result?.error,
      });
      attempts.push({ provider, attempt, outcome, detail: result?.error ?? result?.bodyText ?? null });
      if (!shouldFailover(outcome)) {
        break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const outcome = classifyOutcome({ error: msg });
      attempts.push({ provider, attempt, outcome, detail: msg });
      if (!shouldFailover(outcome)) break;
    }
  }

  return {
    day,
    hour,
    status: 'synthesisFailed',
    author: DREAM_MASTER_AUTHOR,
    version,
    pair,
    seed,
    attempts,
    phase: 'synthesize',
  };
}

/**
 * Записать тик в лог. Если слот уже есть — не ретраим (анти-залп).
 * @param {import('./dreams-log.mjs').DreamsLog} log
 * @param {Parameters<typeof runDreamTick>[0]} input
 */
export async function commitDreamTick(log, input) {
  if (log.hasSlot(input.day, Number(input.hour))) {
    return { ok: false, reason: 'slot-exists', skipped: true };
  }
  const event = await runDreamTick(input);
  return log.append(event);
}
