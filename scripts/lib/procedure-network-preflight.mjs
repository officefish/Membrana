/**
 * Предполётная проверка сети ПЕРЕД процедурой (блок preflight-wire, 10.09).
 *
 * ЗАЧЕМ ЗДЕСЬ, А НЕ В КАЖДОЙ ПРОЦЕДУРЕ. Глагол `yarn network:preflight` существовал с
 * 29.07 и не был подключён НИ К ЧЕМУ: ни к консилиуму, ни к ревью, ни к отправке. Он умел
 * отвечать на вопрос «если сейчас упадёт — это сеть или не сеть?», и никто его не
 * спрашивал. Процедуры вместо этого узнавали о сети из четырёх неудачных вызовов к
 * моделям, то есть тогда, когда диагноз уже невозможен: цепочка съела причину.
 *
 * ЧТО ЭТО НЕ ДЕЛАЕТ. Не чинит сеть и не решает за владельца. Красное здесь значит ровно
 * одно: звать модели сейчас бессмысленно, и причина названа словом из закрытого словаря.
 */
import { buildSnapshot, needsCounterProbe, preflightExitCode, renderCounterProbeHint } from '../network/lib/probe-core.mjs';
import { loadProfiles, runProbes } from '../network/probe.mjs';
import { collectEnv } from '../network/snapshot.mjs';

/** Код возврата предполётной проверки, означающий транспорт. Это и есть «сеть». */
export const EXIT_TRANSPORT = 10;

/** Звено своей панели в наборе зондов. Его молчание — особый случай. */
export const PANEL_PROBE_ID = 'office-panel';

/**
 * Решение по снимку: идти процедуре или отказать. Чистая функция — ни сети, ни часов.
 *
 * @param {object} snapshot снимок зондов
 * @returns {{ok: boolean, code: number, reason: string, hint: string[]}}
 */
export function preflightDecision(snapshot) {
  const code = preflightExitCode(snapshot);
  const probes = snapshot?.probes ?? [];
  const panel = probes.find((p) => p.id === PANEL_PROBE_ID);
  const hint = needsCounterProbe(snapshot) ? renderCounterProbeHint() : [];

  // Панель молчит ⇒ набор звеньев не прочитать, и это не «сеть вообще», а именно
  // «звенья не пробовались». Отказ адресный, отдельно от провайдерского транспорта.
  if (panel?.isTransport === true) {
    return {
      ok: false,
      code: EXIT_TRANSPORT,
      reason:
        `панель не отвечает (\`${panel.outcome}\`) — набор звеньев не прочитать, ` +
        'звенья не пробовались; исход `panel_unreachable`',
      hint,
    };
  }

  if (code === EXIT_TRANSPORT) {
    const dead = probes.filter((p) => p.isTransport).map((p) => `${p.label}: \`${p.outcome}\``);
    return { ok: false, code, reason: `транспорт молчит — ${dead.join(', ')}`, hint };
  }

  // 20 ключи · 30 доступ/деньги/модель · 40 не опознано — это НЕ сеть, и процедура
  // идёт: её цепочка разберёт свой отказ сама и назовёт его своей причиной.
  return { ok: true, code, reason: snapshot?.summary?.advice ?? 'вердикта нет', hint: [] };
}

/**
 * Предполётная проверка для процедуры. Красное — отказ до первого вызова модели.
 *
 * @param {{
 *   procedureId: string;
 *   env?: NodeJS.ProcessEnv;
 *   log?: (line: string) => void;
 *   probesImpl?: typeof runProbes;
 *   profilesImpl?: typeof loadProfiles;
 *   now?: () => string;
 * }} args
 * @returns {Promise<{ok: boolean, skipped: boolean, code: number, reason: string, text: string}>}
 */
export async function runProcedurePreflight(args) {
  const env = args.env ?? process.env;
  const log = args.log ?? ((line) => console.error(line));

  // Разовый обход — решение владельца, названное явно, как LLM_NO_OVERLAY для панели.
  if (env.NETWORK_PREFLIGHT_SKIP === '1') {
    log(`[net] предполётная проверка пропущена (NETWORK_PREFLIGHT_SKIP=1) — ${args.procedureId}`);
    return { ok: true, skipped: true, code: 0, reason: 'пропущена по слову владельца', text: '' };
  }

  let snapshot;
  try {
    const probes = await (args.probesImpl ?? runProbes)({ profiles: (args.profilesImpl ?? loadProfiles)() });
    snapshot = buildSnapshot({ probes, env: collectEnv(env), generatedAt: (args.now ?? (() => new Date().toISOString()))() });
  } catch (error) {
    // Проверка НЕ СОСТОЯЛАСЬ — это не «всё зелено». Процедура идёт, но знает, что не мерили.
    const why = `предполётная проверка не состоялась: ${error?.message ?? error}`;
    log(`[net] ⚠ ${why} — ${args.procedureId} идёт без замера`);
    return { ok: true, skipped: true, code: 2, reason: why, text: '' };
  }

  const decision = preflightDecision(snapshot);
  if (decision.ok) {
    log(`[net] предполётная проверка (${args.procedureId}): код ${decision.code} — ${decision.reason}`);
    return { ...decision, skipped: false, text: '' };
  }

  const text = [
    `[net] ПРОЦЕДУРА НЕ ИДЁТ (${args.procedureId}): ${decision.reason}.`,
    'Это транспорт: звать модели сейчас бессмысленно, и четыре попытки к ним диагноз не',
    'улучшат — они его сотрут, как 10.09.',
    ...(decision.hint.length ? ['', ...decision.hint] : []),
    '',
    'Разовый обход — слово владельца: NETWORK_PREFLIGHT_SKIP=1.',
  ].join('\n');
  log(text);
  return { ...decision, skipped: false, text };
}
