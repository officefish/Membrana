/**
 * forecast-record — схема ЧЕТВЁРТОГО рода записи памяти: «моё предсказание ↔ его исход».
 *
 * Отличие от трёх известных родов (позиция · след исполнения · оценка чужого) — в записи
 * ДВА момента времени и обязательный порядок между ними. Три известных рода отвечают на
 * «что было», четвёртый — на «насколько я умею предсказывать», и потому единственный, кто
 * может выйти плохим о САМОМ АВТОРЕ.
 *
 * Единственная защита рода: `predicted` неизменяем после фиксации. Автор, правящий своё
 * предсказание после исхода, всегда прав — и запись перестаёт учить. Отсюда два инварианта
 * не гигиены, а существования: `predictedAt < observedAt` и append-only.
 *
 * ШОВ Phase 3 (односторонне НЕ решается): живой архив несёт `class: position` + `kind: verbatim`,
 * вердикт M8 говорит `kind: execution`. Здесь выбран `class: 'forecast'` — живая форма авторитет
 * для живого архива; сведение дискриминатора — на Interface Consilium.
 */

/** Дискриминатор рода в живом архиве `docs/virtual-team/memory/archive/<persona>.jsonl`. */
export const FORECAST_CLASS = 'forecast';

/** Подвиды: один подвид — один автор — одна мерка. */
export const SUBJECTS = Object.freeze(['cut', 'stop']);

/** Закрытый алфавит сопоставления. «Почти» не существует (вердикт M3). */
export const OUTCOMES = Object.freeze(['hit', 'miss', 'not-observed']);

/** Адресуемые виды вещдока: проза вещдоком не является. */
export const REF_TYPES = Object.freeze(['path', 'sha', 'pr', 'card', 'artifact']);

/** Заявка тимлида — перечисление, не число: исход придёт в бинарной шкале ревью. */
export const CUT_CLAIMS = Object.freeze(['fits', 'does-not-fit']);

/** Наблюдаемый вердикт по блоку. */
export const CUT_VERDICTS = Object.freeze(['fitted', 'overflowed']);

/** Канонические слаги персон из `docs/virtual-team/memory/*.md`. Не имя модели, не sessionId. */
export const PERSONA_IDS = Object.freeze([
  'tarasov', 'angelina', 'vesnin', 'ozhegov', 'dynin', 'kuryokhin', 'rodchenko', 'farrell',
]);

const CUT_BLOCK_ID = /^[a-z0-9][a-z0-9-]*$/u;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;

/**
 * Легальное «нет с причиной» — приём живого `case-store.mjs`. Отказ обязан быть читаемым:
 * `null` и пропуск поля неразличимы от забывчивости, а забывчивость — не отказ.
 */
export function isLegalNo(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    && Object.keys(v).length === 1 && typeof v.none === 'string' && v.none.trim().length > 0;
}

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isIso = (v) => isStr(v) && ISO.test(v);
const isRef = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
  && REF_TYPES.includes(v.type) && isStr(v.value);

/** Стабильный адресуемый id записи: `<personaId>-<sprintId>-<subject>-<seq>`. */
export function forecastRecordId({ personaId, sprintId, subject, seq }) {
  if (!Number.isInteger(seq) || seq < 1) throw new Error('forecastRecordId: seq — целое ≥ 1');
  return `${personaId}-${sprintId}-${subject}-${seq}`;
}

function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const v of Object.values(value)) deepFreeze(v);
  return Object.freeze(value);
}

/**
 * Собрать запись рода. `predicted` замораживается ГЛУБОКО — попытка правки предсказания
 * после фиксации падает в strict-режиме модуля, а не «просто не рекомендуется».
 */
export function makeForecastRecord(input) {
  const seq = Number.isInteger(input.seq) ? input.seq : 1;
  const record = {
    id: isStr(input.id) ? input.id : forecastRecordId({ ...input, seq }),
    class: FORECAST_CLASS,
    subject: input.subject,
    personaId: input.personaId,
    sprintId: input.sprintId,
    predicted: deepFreeze(structuredClone(input.predicted)),
    predictedAt: input.predictedAt,
    ratifiedBy: input.ratifiedBy,
    observed: input.observed,
    observedAt: input.observedAt === undefined ? null : input.observedAt,
    outcome: input.outcome,
    evidence: Array.isArray(input.evidence) ? input.evidence : [],
    provenance: input.provenance,
  };
  return deepFreeze(record);
}

/**
 * Валидатор рода: невалидная запись отвергается С ПРИЧИНОЙ. «Почти проходит» не существует.
 *
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function validateForecastRecord(rec) {
  const problems = [];
  if (rec === null || typeof rec !== 'object' || Array.isArray(rec)) {
    return { ok: false, problems: ['запись — не объект'] };
  }
  if (!isStr(rec.id)) problems.push('id — не непустая строка (запись рода обязана быть адресуема)');
  if (rec.class !== FORECAST_CLASS) problems.push(`class — не «${FORECAST_CLASS}» (дискриминатор рода)`);
  if (!SUBJECTS.includes(rec.subject)) problems.push(`subject — вне перечня (${SUBJECTS.join(' | ')})`);
  if (!PERSONA_IDS.includes(rec.personaId)) problems.push('personaId — вне канона персон (не имя модели и не sessionId)');
  if (!isStr(rec.sprintId)) problems.push('sprintId — не непустая строка (окно предсказания не названо)');
  if (!isIso(rec.predictedAt)) problems.push('predictedAt — не ISO-метка');
  if (!OUTCOMES.includes(rec.outcome)) problems.push(`outcome — вне закрытого алфавита (${OUTCOMES.join(' | ')}); «почти» не существует`);
  if (!Array.isArray(rec.evidence) || !rec.evidence.every(isRef)) {
    problems.push('evidence — не массив адресуемых Ref{type,value}; проза вещдоком не является');
  }
  if (rec.provenance === null || typeof rec.provenance !== 'object' || !isStr(rec.provenance.planRef)) {
    problems.push('provenance.planRef — не назван (сессия транспорт, а не автор: sessionId только здесь)');
  }

  // ratifiedBy: для 'cut' обязателен — план нарезки ратифицируется владельцем.
  if (rec.ratifiedBy !== 'owner' && !isLegalNo(rec.ratifiedBy)) {
    problems.push('ratifiedBy — не «owner» и не легальное «нет с причиной»; молчание ратификацией не является');
  }

  problems.push(...validatePredicted(rec));
  problems.push(...validateObserved(rec));

  // Несущий инвариант рода: два момента и порядок между ними.
  if (isIso(rec.predictedAt) && isIso(rec.observedAt) && !(rec.predictedAt < rec.observedAt)) {
    problems.push('predictedAt < observedAt нарушен — предсказание не может быть зафиксировано после исхода');
  }
  if (rec.observed !== undefined && !isLegalNo(rec.observed) && rec.observedAt === null) {
    problems.push('observed есть, а observedAt = null — момент наблюдения обязателен');
  }
  if (isLegalNo(rec.observed) && rec.observedAt !== null) {
    problems.push('observed — легальное «нет», но observedAt заполнен: исхода нет, момента наблюдения быть не может');
  }
  if (isLegalNo(rec.observed) && rec.outcome !== 'not-observed') {
    problems.push('observed — легальное «нет», outcome обязан быть «not-observed»');
  }
  return { ok: problems.length === 0, problems };
}

function validatePredicted(rec) {
  const problems = [];
  const p = rec.predicted;
  if (p === null || typeof p !== 'object' || Array.isArray(p)) {
    return ['predicted — не объект (предсказание обязательно; легальное «нет» здесь не предусмотрено)'];
  }
  if (rec.subject === 'cut') {
    if (!Array.isArray(p.blocks) || p.blocks.length === 0) {
      problems.push('predicted.blocks — не непустой массив блоков нарезки');
      return problems;
    }
    const seen = new Set();
    for (const b of p.blocks) {
      if (!isStr(b.cutBlockId) || !CUT_BLOCK_ID.test(b.cutBlockId)) {
        problems.push(`predicted.blocks[].cutBlockId «${String(b.cutBlockId)}» — не слаг ^[a-z0-9][a-z0-9-]*$ (не путь, не имя персоны, не номер PR)`);
        continue;
      }
      if (seen.has(b.cutBlockId)) problems.push(`cutBlockId «${b.cutBlockId}» повторяется — уникальность в пределах sprintId нарушена`);
      seen.add(b.cutBlockId);
      if (!PERSONA_IDS.includes(b.contextPersonaId)) problems.push(`блок «${b.cutBlockId}»: contextPersonaId вне канона персон`);
      if (!CUT_CLAIMS.includes(b.claim)) problems.push(`блок «${b.cutBlockId}»: claim вне перечня (${CUT_CLAIMS.join(' | ')}); число строк — наблюдение, а не заявка`);
    }
    return problems;
  }
  if (rec.subject === 'stop') {
    if (!isStr(p.stopId)) problems.push('predicted.stopId — не непустая строка');
    if (!isStr(p.stageId)) problems.push('predicted.stageId — не непустая строка');
    if (!isRef(p.objectRef)) {
      problems.push('predicted.objectRef — не Ref{type,value}: остановка без названного объекта НЕВЫЧИСЛИМА по полезности, это дефект записи, а не неизвестный исход');
    }
    if (p.claim !== 'stage-not-passed') problems.push('predicted.claim — не «stage-not-passed» (единственная заявка ведущей)');
    if (!isIso(p.stoppedAt)) problems.push('predicted.stoppedAt — не ISO-метка');
  }
  return problems;
}

function validateObserved(rec) {
  const problems = [];
  const o = rec.observed;
  if (o === undefined) return ['observed — поле отсутствует; отсутствие выражается формой { none: причина }, а не пропуском'];
  if (isLegalNo(o)) return problems;
  if (o === null || typeof o !== 'object' || Array.isArray(o)) {
    return ['observed — ни объект исхода, ни легальное «нет с причиной»; null отказом не является'];
  }
  if (rec.subject === 'cut') {
    if (!Array.isArray(o.blocks)) return ['observed.blocks — не массив'];
    for (const b of o.blocks) {
      if (!isStr(b.cutBlockId)) {
        problems.push('observed.blocks[]: сегмент ревью без cutBlockId — привязка требуется ЯВНО, по путям файлов не угадывается');
        continue;
      }
      if (!Number.isInteger(b.changedLines) || b.changedLines < 0) {
        problems.push(`блок «${b.cutBlockId}»: changedLines — не целое ≥ 0 (единица объёма = insertions + deletions)`);
      }
      if (b.verdict !== undefined && !CUT_VERDICTS.includes(b.verdict)) {
        problems.push(`блок «${b.cutBlockId}»: verdict вне перечня (${CUT_VERDICTS.join(' | ')})`);
      }
    }
    return problems;
  }
  if (rec.subject === 'stop') {
    if (o.resolvedAt !== null && !isIso(o.resolvedAt)) problems.push('observed.resolvedAt — ни null, ни ISO-метка');
    if (!Array.isArray(o.changes) || !o.changes.every(isRef)) problems.push('observed.changes — не массив адресуемых Ref');
    if (o.useful !== null && typeof o.useful !== 'boolean') problems.push('observed.useful — ни boolean, ни null');
    if (isIso(o.resolvedAt) && isIso(rec.predicted?.stoppedAt) && !(rec.predicted.stoppedAt <= o.resolvedAt)) {
      problems.push('stoppedAt ≤ resolvedAt нарушен');
    }
  }
  return problems;
}

/**
 * Append-only: журнал рода только растёт, а `predicted`/`predictedAt` уже лежащих записей
 * неизменяемы. Это машинная проверка того, что нельзя переписать предсказание, увидев исход.
 *
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function checkAppendOnly(before, after) {
  const problems = [];
  const prev = new Map(before.map((r) => [r.id, r]));
  const next = new Map(after.map((r) => [r.id, r]));
  if (next.size !== after.length) {
    const seen = new Set();
    for (const r of after) {
      if (seen.has(r.id)) problems.push(`id «${r.id}» повторяется — запись рода обязана быть адресуема однозначно`);
      seen.add(r.id);
    }
  }
  for (const [id] of prev) {
    if (!next.has(id)) problems.push(`запись «${id}» исчезла — журнал рода append-only`);
  }
  for (let i = 0; i < before.length; i += 1) {
    if (after[i] === undefined || after[i].id !== before[i].id) {
      problems.push(`порядок записей изменён на позиции ${i} — журнал рода append-only`);
      break;
    }
  }
  for (const [id, oldRec] of prev) {
    const newRec = next.get(id);
    if (newRec === undefined) continue;
    if (JSON.stringify(newRec.predicted) !== JSON.stringify(oldRec.predicted)) {
      problems.push(`запись «${id}»: predicted изменён — предсказание неизменяемо после фиксации`);
    }
    if (newRec.predictedAt !== oldRec.predictedAt) {
      problems.push(`запись «${id}»: predictedAt изменён — момент фиксации неизменяем`);
    }
  }
  return { ok: problems.length === 0, problems };
}
