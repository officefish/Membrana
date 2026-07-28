/**
 * BridgeCast — машинный состав комнаты мостика (вердикт M1 заседания
 * bridge-command-post, ратифицирован 27.07; DoD M1 п.1–2).
 *
 * Состав перестаёт быть прозой: cast — артефакт (docs/bridge/cast.json), схема —
 * здесь, чистыми функциями. Инвариант комнаты: declared ⇒ resolvable ∨ explicitAbsent —
 * объявленный участник обязан резолвиться носителем ЛИБО быть помечен absent явно;
 * подпись чужим именем при absent — класс прецедента 25.07, запрещён по построению.
 *
 * Ядро чисто: без fs/сети. Резолв носителей подаёт вызывающий (адаптер bridge.mjs).
 */

/** Рода участников — закрытое множество (M1: lead | voice | memory). */
export const CAST_KINDS = Object.freeze(['lead', 'voice', 'memory']);

/** Носители — закрытое множество v1 (M1: llm-persona | pet-local | kit-engine). */
export const CARRIER_KINDS = Object.freeze(['llm-persona', 'pet-local', 'kit-engine']);

/** Обязательные поля записи cast (DoD M1 п.1). */
const ENTRY_FIELDS = Object.freeze([
  'id', 'kind', 'carrier', 'callsExisting', 'callsInRoom', 'castMandatory',
  'liveMandatory', 'presenceMeaning',
]);

/**
 * Структурные проблемы cast-артефакта. Пусто = схема годна (ещё не резолв!).
 * @param {{entries?: Array<Record<string, unknown>>}} cast
 * @returns {string[]}
 */
export function castSchemaProblems(cast) {
  const problems = [];
  const entries = cast?.entries;
  if (!Array.isArray(entries) || entries.length === 0) return ['entries — не непустой массив'];
  const seen = new Set();
  for (const e of entries) {
    const id = typeof e?.id === 'string' ? e.id : '(без id)';
    if (seen.has(id)) problems.push(`${id}: дубль id`);
    seen.add(id);
    for (const f of ENTRY_FIELDS) {
      if (!(f in (e ?? {}))) problems.push(`${id}: нет поля ${f}`);
    }
    if (e?.kind != null && !CAST_KINDS.includes(e.kind)) {
      problems.push(`${id}: kind «${e.kind}» вне {${CAST_KINDS.join('|')}}`);
    }
    if (e?.carrier != null && !CARRIER_KINDS.includes(e.carrier)) {
      problems.push(`${id}: carrier «${e.carrier}» вне {${CARRIER_KINDS.join('|')}}`);
    }
    if (e?.callsInRoom != null && e.callsInRoom !== 'none' && !Array.isArray(e.callsInRoom)) {
      problems.push(`${id}: callsInRoom — 'none' (явное) или массив каналов`);
    }
  }
  // Маскировка (DoD M1 п.4): попугай — kit-engine, не LLM-персона.
  const parrot = entries.find((e) => e?.id === 'parrot');
  if (parrot && parrot.carrier === 'llm-persona') {
    problems.push('parrot: маскируется под llm-persona — память долгов несёт kit-engine (M1)');
  }
  return problems;
}

/**
 * Инвариант резолва: declared ⇒ resolvable ∨ explicitAbsent.
 * @param {{entries?: Array<object>}} cast
 * @param {{resolve: (entry: object) => boolean, absent?: Set<string>}} io
 *   resolve — носитель существует и вызываем (адаптер решает по carrier);
 *   absent — id, явно объявленные отсутствующими на этот сеанс.
 * @returns {{problems: string[], statuses: Record<string, 'resolvable'|'explicitAbsent'|'violated'>}}
 */
export function castResolveProblems(cast, io) {
  const problems = [];
  const statuses = {};
  for (const e of cast?.entries ?? []) {
    if (io.absent?.has(e.id)) {
      statuses[e.id] = 'explicitAbsent';
      continue;
    }
    if (io.resolve(e)) {
      statuses[e.id] = 'resolvable';
      continue;
    }
    statuses[e.id] = 'violated';
    problems.push(
      `${e.id}: declared, но носитель (${e.carrier}) не резолвится и absent не объявлен — ` +
        'инвариант M1 нарушен (класс прецедента 25.07)',
    );
  }
  return { problems, statuses };
}

/**
 * Правило подписи (DoD M1 п.3 / M5): при absent lead действует session-scribe под
 * СВОИМ статусом; подпись именем участника легитимна только при resolvable.
 * @param {string} author подпись, которой помечается запись/конспект
 * @param {Record<string, string>} statuses из castResolveProblems
 * @returns {string|null} проблема или null
 */
export function signatureProblem(author, statuses) {
  if (author === 'session-scribe') return null;
  const st = statuses[author];
  if (st === undefined) return null; // не имя участника cast — не наш предмет
  if (st === 'resolvable') return null;
  return `подпись «${author}» при статусе ${st} — имя без носителя запрещено (M1, прецедент 25.07); писать как session-scribe`;
}
