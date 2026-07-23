/**
 * Ritual entry for LLM procedures (Phase B wire).
 * Loads secrets, resolves chain, runs transport — no experimental/ imports.
 */
import { anthropicPost, loadDotEnv } from '../_anthropic-env.mjs';
import { llmProxyPost, loadLlmProxyDotEnv } from '../_llm-proxy-env.mjs';
import { runProcedureChain } from './llm-procedure-chain.mjs';
import { fetchOfficeOverlay } from './llm-procedure-office.mjs';
import { resolveEffective } from './llm-procedure-resolve.mjs';

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
  let overlay = args.overlay ?? null;
  if (overlay == null && args.skipOfficeOverlay !== true) {
    overlay = await fetchOfficeOverlay({
      env: args.env,
      fetchImpl: args.fetchImpl,
      baseUrl: args.officeBaseUrl,
      token: args.officeToken,
      timeoutMs: args.officeTimeoutMs,
    });
  }
  const effective = resolveEffective(args.procedureId, { overlay });
  return runProcedureChain({
    effective,
    prompt: args.prompt,
    messages: args.messages,
    maxTokens: args.maxTokens,
    env: args.env,
    postFn: args.postFn ?? createCatalogPostFn(),
    onAttempt: args.onAttempt,
  });
}
