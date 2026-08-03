/**
 * procedure-run-journal — local JSONL trail for procedure executions.
 *
 * The journal records execution coverage; run-ledger can later protect the
 * record hash. Keep clocks and sequence numbers at the boundary.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { leafHash } from './run-ledger/index.mjs';

export const JOURNAL_SCHEMA = 'procedure-run-journal@1';

/**
 * `started` добавлен 03.08 (спринт `run-journal-producer`, блок 1): статус open-записи
 * прогона. НЕ `pass` — сознательно: pass означает «шаг отработал», а «прогон стартовал» —
 * другое семантическое поле, и подмена ради экономии значения была бы ложью статусом.
 */
export const VALID_STATUSES = new Set(['pass', 'fail', 'blocked', 'skipped', 'started']);

/**
 * Фазы записи над идентичностью прогона (runId). Журнал append-only с leafHash по телу,
 * поэтому любое «изменение состояния прогона» — НОВАЯ запись, ссылающаяся на прежнюю,
 * а не мутация: open/close/поправка трения — события, не правки.
 *
 * Обратная совместимость чтения: записи БЕЗ runPhase (вся история до 03.08 и точечные
 * записи шотов) читаются как закрытые — кандидатами в сироты не становятся.
 */
export const RUN_PHASES = Object.freeze(['open', 'close', 'friction-amend']);

/** Gap, которым ленивое закрытие помечает осиротевший прогон. */
export const ORPHANED_GAP = 'orphaned';

/**
 * Валидация одной шероховатости. Форма — по логике прецедентов
 * (симптом → корень → фикс → профилактика), но в момент прогона честно известен ТОЛЬКО
 * симптом — он один обязателен; остальное — nullable-долг, дозаписываемый амандментом.
 *
 * @param {unknown} f
 * @param {string} label
 * @returns {{symptom: string, root: string|null, fix: string|null, prevention: string|null}}
 */
export function normalizeFriction(f, label = 'friction') {
  const symptom = String(/** @type {any} */ (f)?.symptom ?? '').trim();
  if (!symptom) throw new Error(`${label}: symptom обязателен — трение без симптома не наблюдение, а мнение`);
  const opt = (v) => {
    const s = v == null ? null : String(v).trim();
    return s === '' || s === null ? null : s;
  };
  return {
    symptom,
    root: opt(/** @type {any} */ (f).root),
    fix: opt(/** @type {any} */ (f).fix),
    prevention: opt(/** @type {any} */ (f).prevention),
  };
}

export function defaultTrailPath(dateIso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    throw new Error(`dateIso must be YYYY-MM-DD: ${dateIso}`);
  }
  return `docs/procedure-runs/trail/${dateIso}.jsonl`;
}

function asArray(value, field) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  return value.map((x) => String(x).trim()).filter(Boolean);
}

function normalizeStatus(status) {
  const s = String(status ?? '').trim().toLowerCase();
  if (!VALID_STATUSES.has(s)) {
    throw new Error(`status must be one of ${[...VALID_STATUSES].join(', ')}: ${status}`);
  }
  return s;
}

function cleanString(value, field) {
  const s = String(value ?? '').trim();
  if (!s) throw new Error(`${field} is required`);
  return s;
}

export function buildProcedureRunRecord(input, opts = {}) {
  const procedureId = cleanString(input.procedureId, 'procedureId');
  const runId = cleanString(input.runId, 'runId');
  const status = normalizeStatus(input.status);
  const subject = cleanString(input.subject, 'subject');
  const at = cleanString(input.at ?? opts.nowIso, 'at');
  const sequence = Number(input.sequence ?? opts.sequence);

  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error(`sequence must be a positive integer: ${input.sequence ?? opts.sequence}`);
  }

  const evidence = asArray(input.evidence, 'evidence');
  const gaps = asArray(input.gaps, 'gaps');
  if (status === 'pass' && evidence.length === 0) {
    // У амандмента своя формулировка того же закона: вызывающий должен понять, ЧЕГО не хватает.
    throw new Error(
      input.runPhase === 'friction-amend'
        ? 'friction-amend без evidence — дозаписанный корень доказывается разбором, не словом'
        : 'pass record must name at least one evidence item',
    );
  }

  const record = {
    schema: JOURNAL_SCHEMA,
    sequence,
    at,
    runId,
    procedureId,
    status,
    subject,
    coverage: {
      evidence,
      gaps,
    },
  };

  if (input.frameId) record.frameId = String(input.frameId).trim();
  if (input.stepId) record.stepId = String(input.stepId).trim();
  if (input.note) record.note = String(input.note).trim();

  // ── фазы прогона (блок journal-friction-fail, 03.08) ────────────────────────
  if (input.runPhase !== undefined) {
    if (!RUN_PHASES.includes(input.runPhase)) {
      throw new Error(`runPhase «${String(input.runPhase)}» вне {${RUN_PHASES.join('|')}}`);
    }
    record.runPhase = input.runPhase;
  }
  // started ⟺ open: статус старта существует только у открывающей записи, и открывающая
  // запись не бывает ничем иным — иначе «прогон стартовал» размазывается по значениям.
  if (record.status === 'started' && record.runPhase !== 'open') {
    throw new Error('status «started» законен только у записи runPhase: open');
  }
  if (record.runPhase === 'open' && record.status !== 'started') {
    throw new Error('open-запись несёт status «started» — pass здесь был бы подменой семантики');
  }
  if (record.status === 'started' && evidence.length === 0) {
    throw new Error('started без evidence — старт прогона доказывается манифестом/планом');
  }

  if (input.friction !== undefined) {
    if (!Array.isArray(input.friction)) throw new Error('friction must be an array');
    record.friction = input.friction.map((f, i) => normalizeFriction(f, `friction[${i}]`));
  }

  if (record.runPhase === 'friction-amend') {
    const a = input.amends;
    if (
      !a ||
      typeof a.runId !== 'string' ||
      !Number.isSafeInteger(a.sequence) ||
      !Number.isSafeInteger(a.frictionIndex)
    ) {
      throw new Error('friction-amend требует amends: {runId, sequence, frictionIndex}');
    }
    const patch = {};
    for (const k of ['root', 'fix', 'prevention']) {
      const v = input[k] == null ? null : String(input[k]).trim();
      if (v) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) {
      throw new Error('friction-amend без содержания — хотя бы одно из root/fix/prevention');
    }
    if (evidence.length === 0) {
      throw new Error('friction-amend без evidence — дозаписанный корень доказывается разбором, не словом');
    }
    record.amends = { runId: a.runId, sequence: a.sequence, frictionIndex: a.frictionIndex };
    Object.assign(record, patch);
  }

  if (input.orphanedBy !== undefined) {
    const o = input.orphanedBy;
    if (!o || typeof o.runId !== 'string' || !Number.isSafeInteger(o.sequence)) {
      throw new Error('orphanedBy требует {runId, sequence} вытеснившей записи');
    }
    record.orphanedBy = { runId: o.runId, sequence: o.sequence };
  }

  record.ledger = {
    algorithm: 'run-ledger.leafHash@1',
    leafHash: leafHash(record),
  };
  return record;
}

export function validateProcedureRunRecord(record) {
  const problems = [];
  if (record?.schema !== JOURNAL_SCHEMA) problems.push('schema');
  if (!Number.isSafeInteger(record?.sequence) || record.sequence < 1) problems.push('sequence');
  for (const field of ['at', 'runId', 'procedureId', 'status', 'subject']) {
    if (typeof record?.[field] !== 'string' || record[field].trim() === '') problems.push(field);
  }
  if (!VALID_STATUSES.has(record?.status)) problems.push('status');
  if (!Array.isArray(record?.coverage?.evidence)) problems.push('coverage.evidence');
  if (!Array.isArray(record?.coverage?.gaps)) problems.push('coverage.gaps');
  if (record?.status === 'pass' && record?.coverage?.evidence?.length === 0) {
    problems.push('pass-without-evidence');
  }
  if (record?.runPhase !== undefined && !RUN_PHASES.includes(record.runPhase)) {
    problems.push('runPhase');
  }
  if (record?.status === 'started' && record?.runPhase !== 'open') problems.push('started-not-open');
  if (record?.runPhase === 'open' && record?.status !== 'started') problems.push('open-not-started');
  if (record?.friction !== undefined) {
    if (!Array.isArray(record.friction)) problems.push('friction');
    else {
      record.friction.forEach((f, i) => {
        if (typeof f?.symptom !== 'string' || f.symptom.trim() === '') {
          problems.push(`friction[${i}].symptom`);
        }
      });
    }
  }
  if (record?.ledger?.leafHash !== leafHash({ ...record, ledger: undefined })) {
    problems.push('ledger.leafHash');
  }
  return problems;
}

/**
 * Незакрытые прогоны в ленте: open-запись, у чьего runId нет close-записи.
 * Записи без runPhase — история и точечные записи шотов — читаются как ЗАКРЫТЫЕ:
 * кандидатами в сироты не становятся (обратная совместимость чтения).
 *
 * @param {Array<Record<string, any>>} records
 * @param {string} [procedureId] сузить до одной процедуры
 * @returns {Array<Record<string, any>>} open-записи незакрытых прогонов
 */
export function findUnclosedRuns(records, procedureId) {
  const closed = new Set(
    records.filter((r) => r?.runPhase === 'close').map((r) => r.runId),
  );
  return records.filter(
    (r) =>
      r?.runPhase === 'open' &&
      !closed.has(r.runId) &&
      (procedureId === undefined || r.procedureId === procedureId),
  );
}

/** Следующий sequence внутри runId: счёт прогона продолжается, не обнуляется. */
export function nextSequenceOf(records, runId) {
  const seqs = records.filter((r) => r?.runId === runId).map((r) => Number(r.sequence) || 0);
  return (seqs.length === 0 ? 0 : Math.max(...seqs)) + 1;
}

/**
 * Открыть прогон процедуры. ЛЕНИВОЕ ЗАКРЫТИЕ здесь: перед новой open-записью незакрытые
 * прогоны той же процедуры закрываются fail с gap `orphaned` и ссылкой `orphanedBy` на
 * вытеснившую запись. Автор close-сироты — новый прогон: это он обнаружил обрыв.
 * Побочный эффект честный: первый обрыв виден только на втором запуске — журнал не
 * ясновидящий.
 *
 * @param {string} repoRoot
 * @param {string} trailRelPath
 * @param {{procedureId: string, runId: string, subject: string, at: string, evidence: string[], note?: string}} input
 * @returns {{record: object, orphansClosed: object[]}}
 */
export function openProcedureRun(repoRoot, trailRelPath, input) {
  const records = readProcedureRunTrail(repoRoot, trailRelPath);
  const orphans = findUnclosedRuns(records, input.procedureId);
  const orphansClosed = [];
  // Закрытия сирот допишутся ДО open-записи; если среди сирот тот же runId (переоткрытие
  // оборванного прогона), их close-записи сдвинут его счёт — учитываем сдвиг заранее,
  // чтобы ссылка orphanedBy указывала на настоящий номер open-записи.
  const sameRunOrphans = orphans.filter((o) => o.runId === input.runId).length;
  const openSeq = nextSequenceOf(records, input.runId) + sameRunOrphans;

  for (const orphan of orphans) {
    const closeRec = buildProcedureRunRecord({
      procedureId: orphan.procedureId,
      runId: orphan.runId,
      sequence: nextSequenceOf(records, orphan.runId),
      status: 'fail',
      runPhase: 'close',
      subject: `прогон оборван: open ${orphan.at} не был закрыт — закрыт лениво следующим прогоном процедуры`,
      at: input.at,
      evidence: [`вытеснившая запись: ${input.runId}#${openSeq}`],
      gaps: [ORPHANED_GAP],
      orphanedBy: { runId: input.runId, sequence: openSeq },
    });
    appendProcedureRunRecord(repoRoot, trailRelPath, closeRec);
    records.push(closeRec);
    orphansClosed.push(closeRec);
  }

  const record = buildProcedureRunRecord({
    procedureId: input.procedureId,
    runId: input.runId,
    sequence: openSeq,
    status: 'started',
    runPhase: 'open',
    subject: input.subject,
    at: input.at,
    evidence: input.evidence,
    note: input.note,
  });
  appendProcedureRunRecord(repoRoot, trailRelPath, record);
  return { record, orphansClosed };
}

/**
 * Закрыть прогон. Open-запись обязана существовать и быть незакрытой — закрыть то, что не
 * открывалось, значит выдумать прогон.
 *
 * @param {string} repoRoot
 * @param {string} trailRelPath
 * @param {{runId: string, status: 'pass'|'fail'|'blocked'|'skipped', subject: string, at: string, evidence?: string[], gaps?: string[], friction?: Array<object>}} input
 * @returns {object}
 */
export function closeProcedureRun(repoRoot, trailRelPath, input) {
  const records = readProcedureRunTrail(repoRoot, trailRelPath);
  const open = records.find((r) => r?.runPhase === 'open' && r.runId === input.runId);
  if (!open) throw new Error(`закрыть нечего: open-записи прогона «${input.runId}» в ленте нет`);
  if (records.some((r) => r?.runPhase === 'close' && r.runId === input.runId)) {
    throw new Error(`прогон «${input.runId}» уже закрыт — второе закрытие было бы второй правдой`);
  }
  const record = buildProcedureRunRecord({
    procedureId: open.procedureId,
    runId: input.runId,
    sequence: nextSequenceOf(records, input.runId),
    status: input.status,
    runPhase: 'close',
    subject: input.subject,
    at: input.at,
    evidence: input.evidence,
    gaps: input.gaps,
    friction: input.friction,
  });
  appendProcedureRunRecord(repoRoot, trailRelPath, record);
  return record;
}

/**
 * Дозапись корня/фикса/профилактики к шероховатости — АМАНДМЕНТ, не мутация: лента
 * append-only, leafHash по телу. Читатель видит обе версии по времени: симптом — в момент
 * прогона, корень — когда его вправду узнали.
 *
 * @param {string} repoRoot
 * @param {string} trailRelPath
 * @param {{runId: string, sequence: number, frictionIndex: number, root?: string, fix?: string, prevention?: string, at: string, evidence: string[], subject?: string}} input
 * @returns {object}
 */
export function appendFrictionAmend(repoRoot, trailRelPath, input) {
  const records = readProcedureRunTrail(repoRoot, trailRelPath);
  const target = records.find((r) => r?.runId === input.runId && r?.sequence === input.sequence);
  if (!target) throw new Error(`амандмент в пустоту: записи ${input.runId}#${input.sequence} нет`);
  if (!Array.isArray(target.friction) || target.friction[input.frictionIndex] === undefined) {
    throw new Error(`амандмент в пустоту: friction[${input.frictionIndex}] у записи ${input.runId}#${input.sequence} нет`);
  }
  const record = buildProcedureRunRecord({
    procedureId: target.procedureId,
    runId: input.runId,
    sequence: nextSequenceOf(records, input.runId),
    status: 'pass',
    runPhase: 'friction-amend',
    subject: input.subject ?? `поправка к трению: ${target.friction[input.frictionIndex].symptom}`,
    at: input.at,
    evidence: input.evidence,
    amends: { runId: input.runId, sequence: input.sequence, frictionIndex: input.frictionIndex },
    root: input.root,
    fix: input.fix,
    prevention: input.prevention,
  });
  appendProcedureRunRecord(repoRoot, trailRelPath, record);
  return record;
}

export function appendProcedureRunRecord(repoRoot, trailRelPath, record) {
  const problems = validateProcedureRunRecord(record);
  if (problems.length > 0) {
    throw new Error(`invalid procedure run record: ${problems.join(', ')}`);
  }
  const abs = resolve(repoRoot, trailRelPath);
  mkdirSync(dirname(abs), { recursive: true });
  appendFileSync(abs, `${JSON.stringify(record)}\n`, 'utf8');
  return abs;
}

export function readProcedureRunTrail(repoRoot, trailRelPath) {
  const abs = resolve(repoRoot, trailRelPath);
  if (!existsSync(abs)) return [];
  return readFileSync(abs, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        const err = new Error(`invalid JSONL at ${trailRelPath}:${index + 1}: ${e.message}`);
        err.cause = e;
        throw err;
      }
    });
}

export function summarizeProcedureRunTrail(records) {
  if (!Array.isArray(records)) throw new Error('records must be an array');
  const summary = {
    total: records.length,
    gaps: [],
  };
  for (const status of VALID_STATUSES) summary[status] = 0;

  records.forEach((record, index) => {
    if (!VALID_STATUSES.has(record?.status)) {
      throw new Error(`records[${index}].status must be one of ${[...VALID_STATUSES].join(', ')}`);
    }
    const gaps = record.coverage?.gaps ?? [];
    if (!Array.isArray(gaps)) throw new Error(`records[${index}].coverage.gaps must be an array`);

    summary[record.status] += 1;
    for (const gap of gaps) {
      summary.gaps.push({ runId: record.runId, procedureId: record.procedureId, gap });
    }
  });
  return summary;
}
