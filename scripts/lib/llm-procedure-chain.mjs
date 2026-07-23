/**
 * Ordered provider chain (F1): try each step; emit per attempt; STOP when exhausted.
 */
import { buildUsageEvent, emitUsage } from './llm-procedure-emit.mjs';
import { callProvider } from './llm-procedure-transport.mjs';

/**
 * @typedef {import('./llm-procedure-resolve.mjs').EffectiveProcedure} EffectiveProcedure
 */

/**
 * @param {{
 *   effective: EffectiveProcedure;
 *   prompt?: string;
 *   messages?: Array<{ role: string; content: unknown }>;
 *   maxTokens?: number;
 *   invokeAttempt?: (step: { provider: string; model: string; attemptIndex: number }) => Promise<{
 *     ok: boolean;
 *     text?: string;
 *     status?: number;
 *     tokensIn?: number | null;
 *     tokensOut?: number | null;
 *     errorClass?: string;
 *     latencyMs?: number;
 *   }>;
 *   emit?: typeof emitUsage;
 *   env?: NodeJS.ProcessEnv;
 *   postFn?: Parameters<typeof callProvider>[0]['postFn'];
 *   now?: () => number;
 *   onAttempt?: (info: { provider: string; model: string; attemptIndex: number; ok: boolean; errorClass?: string }) => void;
 * }} args
 * @returns {Promise<{
 *   ok: boolean;
 *   text: string;
 *   provider: string;
 *   model: string;
 *   source: 'overlay' | 'default';
 *   attempts: number;
 *   errorClass?: string;
 * }>}
 */
export async function runProcedureChain(args) {
  const { effective, prompt, messages } = args;
  const emit = args.emit ?? emitUsage;
  const chain = effective.chain ?? [];
  if (chain.length < 1) {
    throw new Error(`runProcedureChain: пустая chain для «${effective.procedureId}»`);
  }

  let lastErrorClass = 'unknown';

  for (let i = 0; i < chain.length; i += 1) {
    const step = chain[i];
    let result;
    if (typeof args.invokeAttempt === 'function') {
      result = await args.invokeAttempt({
        provider: step.provider,
        model: step.model,
        attemptIndex: i,
      });
    } else {
      result = await callProvider({
        provider: step.provider,
        model: step.model,
        prompt,
        messages,
        maxTokens: args.maxTokens,
        env: args.env,
        postFn: args.postFn,
        now: args.now,
      });
    }

    const latencyMs = typeof result.latencyMs === 'number' ? result.latencyMs : 0;
    const ok = Boolean(result.ok);

    await emit(
      buildUsageEvent({
        procedureId: effective.procedureId,
        provider: step.provider,
        model: step.model,
        source: effective.source,
        tokensIn: result.tokensIn ?? null,
        tokensOut: result.tokensOut ?? null,
        latencyMs,
        ok,
        errorClass: ok ? undefined : result.errorClass ?? 'unknown',
        entryMjs: effective.entryMjs,
      }),
      { env: args.env },
    );

    if (typeof args.onAttempt === 'function') {
      args.onAttempt({
        provider: step.provider,
        model: step.model,
        attemptIndex: i,
        ok,
        errorClass: ok ? undefined : result.errorClass ?? 'unknown',
      });
    }

    if (ok) {
      return {
        ok: true,
        text: typeof result.text === 'string' ? result.text : '',
        provider: step.provider,
        model: step.model,
        source: effective.source,
        attempts: i + 1,
      };
    }
    lastErrorClass = result.errorClass ?? 'unknown';
  }

  return {
    ok: false,
    text: '',
    provider: chain[chain.length - 1].provider,
    model: chain[chain.length - 1].model,
    source: effective.source,
    attempts: chain.length,
    errorClass: lastErrorClass,
  };
}
