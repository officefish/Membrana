/**
 * mint-intent — контракт мостик ↔ граф правды, фаза before-mana (M3, #1352).
 *
 * По умолчанию — ПОТОК: в гранит не попадает ничто без пакета намерения и допуска.
 * Треугольник: озвученная мысль (SpeechRef) + ДВА различных proof пользы продукту
 * с якорем + limit (что НЕ сказано). Твёрдость — качественная ось для человека
 * (casual|aimed|committed), НЕ числовой порог допуска. Мана machinely ∄:
 * admit_v2 — именованный пустой слот, экономику не изобретаем (BLOCK M3).
 *
 * admit_v1(p) ⇔ validPacket(p) ∧ ¬ownerMarkedStream ∧ initiatedBy = lead.
 * Отказ — ТОЛЬКО из закрытого словаря REJECT_REASONS. Авто-прогон всех мыслей — BLOCK.
 *
 * Чистые предикаты без сети и LLM-судьи пользы: benefitRef — ссылка на артефакт/
 * issue/path/repro; истинность пользы остаётся человеческой. ФС/вызов mint — в CLI.
 */

export const HARDNESS = Object.freeze(['casual', 'aimed', 'committed']);
export const REJECT_REASONS = Object.freeze([
  'no_triangle', 'proofs_weak', 'stream_only_by_owner', 'mana_required_later',
  'duplicate_thought', 'not_lead', 'invalid_ref',
]);

/** Слот admit_v2 (with-mana): именован, но пуст — cost/balance TBD владельцем. */
export const MANA_MODEL = null;

const isNonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

/** SpeechRef — тот же указатель, что у токена: sessionId · uuid · timestamp · quote · limit. */
export function hasSpeechRef(thought) {
  return Boolean(thought && isNonEmpty(thought.sessionId) && isNonEmpty(thought.uuid)
    && isNonEmpty(thought.timestamp) && isNonEmpty(thought.quote));
}

/** BenefitRef: одна строка «что улучшит» + якорь (issue/path/artifact/repro). */
export function isBenefitRef(p) {
  return Boolean(p && isNonEmpty(p.benefit) && isNonEmpty(p.anchor));
}

/**
 * validPacket(p) ⇔ hasSpeechRef ∧ |proofs|=2 ∧ ∀ benefitRef ∧ distinct(P1,P2)
 *                ∧ limit≠"" ∧ initiatedBy — назван.
 * @returns {{ok: true} | {ok: false, reason: string, detail: string}}
 */
export function validPacket(p) {
  if (!p || typeof p !== 'object') return { ok: false, reason: 'invalid_ref', detail: 'пакет не объект' };
  if (!hasSpeechRef(p.thought)) {
    return { ok: false, reason: 'invalid_ref', detail: 'thought — не SpeechRef ({sessionId, uuid, timestamp, quote})' };
  }
  const proofs = Array.isArray(p.proofs) ? p.proofs : [];
  if (proofs.length !== 2 || !proofs.every(isBenefitRef)) {
    return { ok: false, reason: 'no_triangle', detail: `треугольник не собран: нужно РОВНО два proof пользы с якорем (есть ${proofs.filter(isBenefitRef).length})` };
  }
  if (proofs[0].benefit === proofs[1].benefit && proofs[0].anchor === proofs[1].anchor) {
    return { ok: false, reason: 'proofs_weak', detail: 'два proof обязаны быть РАЗЛИЧНЫМИ — один довод дважды не треугольник' };
  }
  if (!isNonEmpty(p.limit)) {
    return { ok: false, reason: 'no_triangle', detail: 'нет limit — поле «что НЕ сказано» обязательно' };
  }
  if (p.hardness != null && !HARDNESS.includes(p.hardness)) {
    return { ok: false, reason: 'invalid_ref', detail: `hardness из (${HARDNESS.join('|')}) — качественная ось, не свободный текст` };
  }
  if (!isNonEmpty(p.initiatedBy)) {
    return { ok: false, reason: 'not_lead', detail: 'initiatedBy пуст — жест без инициатора не жест' };
  }
  return { ok: true };
}

/**
 * admit_v1 = validPacket ∧ ¬ownerMarkedStream ∧ initiatedBy = lead ∧ ¬duplicate.
 * @param {object} p — MintIntentPacket
 * @param {{leadRefs?: string[], ownerMarkedStream?: boolean, existingThoughtKeys?: Set<string>}} ctx
 * @returns {{ok: true} | {ok: false, reason: string, detail: string}}
 */
export function admitV1(p, ctx = {}) {
  const form = validPacket(p);
  if (!form.ok) return form;
  const leads = ctx.leadRefs ?? ['lead', 'angelina'];
  if (!leads.includes(String(p.initiatedBy).toLowerCase())) {
    return { ok: false, reason: 'not_lead', detail: `жест mint_intent инициирует lead (${leads.join('|')}); «${p.initiatedBy}» — нет. Агент не чеканит по усмотрению` };
  }
  if (ctx.ownerMarkedStream === true) {
    return { ok: false, reason: 'stream_only_by_owner', detail: 'владелец пометил мысль потоком — в гранит не идёт, и это успех контракта, не сбой' };
  }
  const key = thoughtKey(p.thought);
  if (ctx.existingThoughtKeys?.has(key)) {
    return { ok: false, reason: 'duplicate_thought', detail: `эта реплика уже чеканилась (${key}) — дубль мысли в граф не идёт` };
  }
  return { ok: true };
}

/** Ключ дубля мысли: та же реплика (sessionId+uuid) — один кристалл. */
export function thoughtKey(thought) {
  return `${thought?.sessionId ?? '?'}#${thought?.uuid ?? '?'}`;
}

/** Ключи уже зачеканенных мыслей из реестра графа (utterance-указатели токенов). */
export function existingThoughtKeysFromRegistry(registry) {
  const keys = new Set();
  for (const t of registry?.tokens ?? []) {
    const u = t?.source?.utterance;
    if (u?.sessionId && u?.uuid) keys.add(`${u.sessionId}#${u.uuid}`);
  }
  return keys;
}

/**
 * Токен для существующего `yarn truth mint` из допущенного пакета.
 * Класс owner (мысль — озвученное слово владельца), отзыв — словом владельца.
 */
export function tokenFromPacket(p) {
  return {
    id: p.tokenId,
    claim: p.claim,
    class: 'owner',
    parents: p.parents ?? [],
    source: {
      kind: 'owner',
      date: String(p.thought.timestamp).slice(0, 10),
      utterance: {
        sessionId: p.thought.sessionId,
        uuid: p.thought.uuid,
        timestamp: p.thought.timestamp,
        kind: p.thought.kind ?? 'user',
        quote: p.thought.quote,
        limit: p.limit,
      },
    },
    revocation: { kind: 'owner', value: 'до слова владельца' },
  };
}
