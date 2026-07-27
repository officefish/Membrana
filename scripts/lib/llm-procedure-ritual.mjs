/**
 * Ritual entry for LLM procedures (Phase B wire).
 * Loads secrets, resolves chain, runs transport — no experimental/ imports.
 */
import { anthropicPost, loadDotEnv } from '../_anthropic-env.mjs';
import { llmProxyPost, loadLlmProxyDotEnv } from '../_llm-proxy-env.mjs';
import { runProcedureChain } from './llm-procedure-chain.mjs';
import { fetchOfficeOverlay } from './llm-procedure-office.mjs';
import { loadProcedureDefaults } from './llm-procedure-registry.mjs';
import { formatChainLine, overlayDroppedSteps, resolveEffective } from './llm-procedure-resolve.mjs';

/**
 * POST dispatcher: anthropic Messages API vs openai-compatible
 * (openrouter / deepseek / perplexity / openai).
 * @returns {(url: string, opts: { headers: Record<string, string>; bodyJson: Record<string, unknown> }) => Promise<{ ok: boolean; status: number; text: string }>}
 */
export function createCatalogPostFn() {
  return async (url, { headers, bodyJson }) => {
    if (headers['anthropic-version'] || /api\.anthropic\.com/i.test(url)) {
      return anthropicPost(url, { headers, bodyJson });
    }
    return llmProxyPost(url, { headers, bodyJson });
  };
}

/**
 * Ensure root `.env` + `.env.llm-proxy` are loaded (idempotent).
 */
export function loadRitualLlmEnv() {
  loadDotEnv();
  loadLlmProxyDotEnv();
}

/**
 * @param {{
 *   procedureId: string;
 *   prompt?: string;
 *   messages?: Array<{ role: string; content: unknown }>;
 *   maxTokens?: number;
 *   overlay?: Record<string, { chain: Array<{ provider: string; model: string }> }> | null;
 *   env?: NodeJS.ProcessEnv;
 *   postFn?: ReturnType<typeof createCatalogPostFn>;
 *   onAttempt?: Parameters<typeof runProcedureChain>[0]['onAttempt'];
 * }} args
 */
export async function invokeProcedureLlm(args) {
  loadRitualLlmEnv();
  const env = args.env ?? process.env;
  // #1306: разовый обход overlay — обещанный каноном escape-hatch, которого не было.
  const noOverlay = env.LLM_NO_OVERLAY === '1' || args.skipOfficeOverlay === true;
  let overlay = args.overlay ?? null;
  if (overlay == null && !noOverlay) {
    overlay = await fetchOfficeOverlay({
      env: args.env,
      fetchImpl: args.fetchImpl,
      baseUrl: args.officeBaseUrl,
      token: args.officeToken,
      timeoutMs: args.officeTimeoutMs,
    });
  }
  const effective = resolveEffective(args.procedureId, { overlay });
  // #1306: действующая цепочка печатается ДО попыток, с источником; усечение — не молча.
  console.error(formatChainLine(effective) + (noOverlay ? ' [LLM_NO_OVERLAY]' : ''));
  let dropped = [];
  if (effective.source === 'overlay') {
    try {
      dropped = overlayDroppedSteps(effective.chain, loadProcedureDefaults()[args.procedureId]?.chain ?? []);
    } catch { /* defaults недоступны — предупреждение лучше пропустить, чем уронить вызов */ }
    if (dropped.length) {
      console.error(`[llm] ⚠ overlay убрал звенья умолчаний: ${dropped.map((s) => `${s.provider}/${s.model}`).join(', ')} (обход: LLM_NO_OVERLAY=1)`);
    }
  }
  const result = await runProcedureChain({
    effective,
    prompt: args.prompt,
    messages: args.messages,
    maxTokens: args.maxTokens,
    env: args.env,
    postFn: args.postFn ?? createCatalogPostFn(),
    onAttempt: args.onAttempt,
  });
  if (!result.ok && dropped.length) {
    console.error(`[llm] цепочка исчерпана (источник: overlay), НЕпробованные живые звенья умолчаний: ${dropped.map((s) => s.provider).join(', ')} — LLM_NO_OVERLAY=1 для прогона по умолчаниям`);
  }
  return result;
}
