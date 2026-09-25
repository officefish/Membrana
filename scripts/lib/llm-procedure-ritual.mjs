/**
 * Ritual entry for LLM procedures (Phase B wire).
 * Loads secrets, resolves chain, runs transport — no experimental/ imports.
 */
import { anthropicPost, loadDotEnv } from '../_anthropic-env.mjs';
import { llmProxyPost, loadLlmProxyDotEnv } from '../_llm-proxy-env.mjs';
import { renderCounterProbeHint } from '../network/lib/probe-core.mjs';
import { runProcedureChain } from './llm-procedure-chain.mjs';
import { PANEL_PULL, pullOfficeOverlay } from './llm-procedure-office.mjs';
import { loadProcedureDefaults } from './llm-procedure-registry.mjs';
import { formatChainLine, overlayDroppedSteps, resolveEffective } from './llm-procedure-resolve.mjs';

/**
 * Отказ процедуры, когда панель не ответила. Отдельный класс, а не строка: вызывающему
 * нужно уметь отличить «панель молчит» от провала цепочки, не разбирая текст.
 *
 * Текст отказа НАЗЫВАЕТ причину и несёт встречную пробу: прецедент 10.09 показал, что
 * «недоступно» с одной машины не отличает мёртвый сервер от мёртвого канала к нему, и
 * ровно одна команда со второй машины закрыла диагноз, на который ушёл час.
 */
export class PanelUnreachableError extends Error {
  /**
   * @param {string} procedureId
   * @param {{why: string, transportCause: string|null, baseUrl: string}} pull
   */
  constructor(procedureId, pull) {
    super(
      [
        `[llm] ПАНЕЛЬ НЕ ОТВЕТИЛА (${procedureId}): ${pull.why}.`,
        `Набор звеньев не прочитан с ${pull.baseUrl} — ЗВЕНЬЯ НЕ ПРОБОВАЛИСЬ, и цепочка не шла.`,
        'Исход: `panel_unreachable` (docs/network/outcomes.yml)' +
          (pull.transportCause ? `, транспортная причина: \`${pull.transportCause}\`.` : '.'),
        '',
        ...renderCounterProbeHint({ url: `${pull.baseUrl}/health`, what: 'панель' }),
        '',
        'Работать без панели — разовое решение ВЛАДЕЛЬЦА: LLM_NO_OVERLAY=1 берёт умолчания',
        'репозитория. Молча откатываться сюда нельзя: тогда «панель молчит» снова станет',
        'неотличимо от нормальной работы.',
      ].join('\n'),
    );
    this.name = 'PanelUnreachableError';
    this.outcome = 'panel_unreachable';
    this.procedureId = procedureId;
    this.transportCause = pull.transportCause;
    this.linksAttempted = false;
  }
}

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
    const pull = await pullOfficeOverlay({
      env: args.env,
      fetchImpl: args.fetchImpl,
      baseUrl: args.officeBaseUrl,
      token: args.officeToken,
      timeoutMs: args.officeTimeoutMs,
    });
    // ЗОНД ПАНЕЛИ ПЕРЕД ПРОЦЕДУРОЙ, а не внутри цепочки (10.09). Панель промолчала
    // транспортом ⇒ набор звеньев не прочитан, и цепочка НЕ ИДЁТ: четыре попытки к
    // моделям после этого не диагностика, а четыре «неизвестно» поверх стёртой причины.
    // Панель ответила чем угодно (401, 500, пусто) — это её живой отказ, прежний откат
    // на умолчания остаётся: поведение при живой панели не меняется.
    if (pull.status === PANEL_PULL.UNREACHABLE) {
      throw new PanelUnreachableError(args.procedureId, pull);
    }
    overlay = pull.procedures;
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
      // Кристалл procedure-must-follow-panel-chain: находка адресуется ВЛАДЕЛЬЦУ
      // (панель — его рука), а не подсказывает агенту тихий обход.
      console.error(`[llm] ⚠ overlay панели не несёт звеньев умолчаний: ${dropped.map((s) => `${s.provider}/${s.model}`).join(', ')} — правка цепочки: панель (владелец)`);
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
    console.error(
      `[llm] ПАНЕЛЬНАЯ ЦЕПОЧКА НЕ ОТДАЛА КОНТЕНТ (${args.procedureId}): все звенья overlay исчерпаны; ` +
        `непробованные звенья умолчаний: ${dropped.map((s) => s.provider).join(', ')}. ` +
        'Решение владельца: поправить overlay в панели ЛИБО разово разрешить умолчания (LLM_NO_OVERLAY=1 — только по его слову).',
    );
  }
  return result;
}
