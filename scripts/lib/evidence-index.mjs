/**
 * Индекс вещдоков (#1303, магистраль-цепочка 27.07): чистое ядро.
 * Несущий предикат дома: вещдок без ХЕША и без АДРЕСА — не вещдок.
 * Хеш даёт тождество, адрес — достижимость, описание — смысл (отдельным слоем:
 * measured — машиной, about — интерпретация, помечена).
 *
 * Реестр — append-only JSONL; байты живут в СКЛАДЕ (Affine/локально/URL), индекс —
 * в репозитории. Индекс переживает склад: хранилище сменное, строки вечные.
 * Ни fs, ни сети — обвязка в scripts/evidence.mjs.
 */

/** @typedef {{kind:'local'|'affine'|'url'|'archivarius', ref:string}} Location */
/** @typedef {{
 *   id:string, sha256:string, bytes:number, addedAt:string,
 *   source:string, location:Location, about?:string,
 *   measured?:Record<string,unknown>
 * }} EvidenceRecord */

const ID_RE = /^[a-z0-9][a-z0-9-]{2,63}$/u;
const SHA_RE = /^[0-9a-f]{64}$/u;
const LOCATION_KINDS = new Set(['local', 'affine', 'url', 'archivarius']);

/**
 * Валидность записи — по предикату дома. Находки по именам.
 * @param {Partial<EvidenceRecord>} r
 * @returns {string[]}
 */
export function recordProblems(r) {
  const p = [];
  if (!r || typeof r !== 'object') return ['запись не объект'];
  if (!ID_RE.test(String(r.id ?? ''))) p.push('id: слаг 3-64 [a-z0-9-]');
  if (!SHA_RE.test(String(r.sha256 ?? ''))) p.push('sha256: вещдок без хеша — не вещдок');
  if (!Number.isInteger(r.bytes) || r.bytes <= 0) p.push('bytes: размер обязателен');
  if (!r.location || !LOCATION_KINDS.has(r.location.kind) || !String(r.location.ref ?? '').trim()) {
    p.push('location: вещдок без адреса — не вещдок (kind: local|affine|url|archivarius + ref)');
  }
  if (!String(r.source ?? '').trim()) p.push('source: происхождение обязательно (от кого/откуда)');
  if (!/^\d{4}-\d{2}-\d{2}/u.test(String(r.addedAt ?? ''))) p.push('addedAt: дата приёма обязательна');
  return p;
}

/**
 * Дубли по содержимому: один sha256 под разными id — находка (не ошибка приёма:
 * тот же документ мог прийти дважды разными путями; решает человек).
 * @param {EvidenceRecord[]} records
 * @returns {{sha256:string, ids:string[]}[]}
 */
export function findDuplicates(records) {
  const bySha = new Map();
  for (const r of records ?? []) {
    if (!bySha.has(r.sha256)) bySha.set(r.sha256, []);
    bySha.get(r.sha256).push(r.id);
  }
  return [...bySha.entries()].filter(([, ids]) => ids.length > 1).map(([sha256, ids]) => ({ sha256, ids }));
}

/** @typedef {{id:string, status:'ok'|'hash-mismatch'|'unreachable'|'unknown', detail?:string}} VerifyRow */

/**
 * Сверка индекса с фактом. resolveFn(location) → {sha256,bytes}|null|'skip'.
 * null = адрес недостижим; 'skip' = вид хранилища этой обвязке недоступен (honest
 * unknown, НЕ «ок»): сеть/склад вне зоны — сверка не прогонялась.
 * @param {EvidenceRecord[]} records
 * @param {(loc:Location)=>({sha256:string,bytes:number}|null|'skip')} resolveFn
 * @returns {VerifyRow[]}
 */
export function verifyRecords(records, resolveFn) {
  return (records ?? []).map((r) => {
    const fact = resolveFn(r.location);
    if (fact === 'skip') return { id: r.id, status: 'unknown', detail: `склад ${r.location.kind} недоступен этой обвязке — не «ок»` };
    if (fact == null) return { id: r.id, status: 'unreachable', detail: `${r.location.kind}:${r.location.ref}` };
    if (fact.sha256 !== r.sha256) return { id: r.id, status: 'hash-mismatch', detail: `индекс ${r.sha256.slice(0, 12)}… ≠ факт ${fact.sha256.slice(0, 12)}…` };
    return { id: r.id, status: 'ok' };
  });
}

/**
 * JSONL-парс реестра: битая строка — находка, не молчаливый пропуск.
 * @param {string} text
 * @returns {{records:EvidenceRecord[], broken:{line:number, error:string}[]}}
 */
export function parseRegistry(text) {
  const records = [];
  const broken = [];
  String(text ?? '').split('\n').forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    try {
      const r = JSON.parse(t);
      const p = recordProblems(r);
      if (p.length) broken.push({ line: i + 1, error: p.join('; ') });
      else records.push(r);
    } catch (e) {
      broken.push({ line: i + 1, error: `не JSON: ${e.message.slice(0, 60)}` });
    }
  });
  return { records, broken };
}
