/**
 * network-probes — чистое ядро ночного такта контейнера network (#1913,
 * вердикты В4/В5 заседания network-container, ратифицированы 13.08).
 *
 * Нормализация результатов зондов в зонд-снимки по схеме дома
 * (docs/audit/network/schema.json), пересчёт overwrite-проекций registry из
 * append-ленты, проверка снимков против политики машин (T_night v1).
 *
 * КОНТРАКТ ПЕРЕСЧЁТА (хвост сборки заседания, README дома): пересчёт создаёт
 * ТОЛЬКО {probe_id}.json и summary.json — рукописные нормы (egress-rules,
 * machine-policy, probes-plan, budget) не трогает НИКОГДА.
 *
 * Чистые функции: ноль ФС и сети.
 */

export const STATUS_VALUES = Object.freeze(['ok', 'degraded', 'down', 'unknown', 'partial']);
export const OUTCOME_VALUES = Object.freeze(['executed', 'failed']);
/** Имена файлов registry, которые пересчёт НЕ смеет трогать (рукописные нормы). */
export const HANDWRITTEN_NORMS = Object.freeze([
  'egress-rules.json',
  'machine-policy.json',
  'network-policy-violations-budget.json',
  'probes-plan.json',
]);

/**
 * Классификация HTTP-исхода в словарь состояний (В2, тождественная логика для
 * organ=net:http): 2xx/3xx → ok; 4xx → degraded; 5xx → down; сетевые
 * ошибки/timeout → down. `unknown` от http-зонда не рождается.
 * @param {number | null} httpStatus
 * @param {string | null} errorClass
 * @returns {'ok'|'degraded'|'down'}
 */
export function classifyHttp(httpStatus, errorClass) {
  if (httpStatus !== null && Number.isInteger(httpStatus)) {
    if (httpStatus >= 200 && httpStatus < 400) return 'ok';
    if (httpStatus >= 400 && httpStatus < 500) return 'degraded';
    return 'down';
  }
  return errorClass ? 'down' : 'down';
}

/**
 * Нормализовать сырой результат зонда в снимок схемы дома.
 *
 * @param {{ probe_id: string, organ: string, target: string, infra_node_id?: string }} planEntry
 * @param {{ at: string, machine: string, httpStatus?: number | null, latencyMs?: number | null, errorClass?: string | null, executed: boolean }} raw
 * @returns {object} снимок по schema.json (additionalProperties: false)
 */
export function normalizeSnapshot(planEntry, raw) {
  /** @type {Record<string, any>} */
  const snap = {
    organ: planEntry.organ,
    probe_id: planEntry.probe_id,
    at: raw.at,
    machine: raw.machine,
    target: sanitizeTarget(planEntry.target),
    outcome: raw.executed ? 'executed' : 'failed',
  };
  if (raw.executed) {
    snap.status = classifyHttp(raw.httpStatus ?? null, raw.errorClass ?? null);
  }
  const metrics = {};
  if (typeof raw.latencyMs === 'number' && raw.latencyMs >= 0) metrics.latencyMs = Math.round(raw.latencyMs);
  if (Number.isInteger(raw.httpStatus)) metrics.httpStatus = raw.httpStatus;
  if (Object.keys(metrics).length) snap.metrics = metrics;
  if (planEntry.infra_node_id) snap.route = { infra_node_id: planEntry.infra_node_id };
  if (raw.errorClass) snap.error_class = raw.errorClass;
  return snap;
}

/**
 * Санитизация цели (запрещённые классы 1–2): без userinfo, query и фрагментов.
 * @param {string} target
 */
export function sanitizeTarget(target) {
  try {
    const u = new URL(target);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return String(target).split('?')[0].split('@').pop() ?? '';
  }
}

/**
 * Лёгкая валидация снимка против закрытой схемы (без ajv — голый node).
 * @param {unknown} snap
 * @returns {string[]} problems
 */
export function snapshotProblems(snap) {
  const s = /** @type {Record<string, any>} */ (snap);
  const problems = [];
  if (!s || typeof s !== 'object') return ['снимок: не объект'];
  for (const f of ['organ', 'at', 'machine', 'target']) {
    if (typeof s[f] !== 'string' || !s[f].trim()) problems.push(`снимок: ${f} пуст`);
  }
  if (!OUTCOME_VALUES.includes(s.outcome)) problems.push(`снимок: outcome ∉ {${OUTCOME_VALUES.join(', ')}}`);
  if (s.outcome === 'executed' && !STATUS_VALUES.includes(s.status)) {
    problems.push(`снимок: status «${String(s.status)}» ∉ словаря при executed`);
  }
  if (s.outcome === 'failed' && s.status !== undefined) {
    problems.push('снимок: при failed поле status не интерпретируется — не пишем его');
  }
  if (/[@?#]/u.test(String(s.target ?? ''))) problems.push('снимок: target несёт userinfo/query — запрещённые классы 1–2');
  return problems;
}

/**
 * Пересчёт overwrite-проекций из записей ленты (обычно одной ночи).
 *
 * @param {object[]} records снимки ленты
 * @param {{ generatedAt: string }} meta
 * @returns {{ projections: Record<string, object>, summary: object }}
 *   projections: имя файла → содержимое ({probe_id}.json)
 */
export function recomputeProjections(records, meta) {
  /** @type {Record<string, object>} */
  const byProbe = {};
  const statuses = { ok: 0, degraded: 0, down: 0, unknown: 0, partial: 0 };
  let failed = 0;
  for (const r of records) {
    if (r.outcome === 'failed') failed += 1;
    else if (r.status in statuses) statuses[r.status] += 1;
    const key = r.probe_id ?? `${r.organ}:${r.target}`;
    const prev = /** @type {any} */ (byProbe[key]);
    if (!prev || Date.parse(r.at) >= Date.parse(prev.latest.at)) {
      byProbe[key] = { probe_id: key, latest: r, meta: { generated_at: meta.generatedAt } };
    }
  }
  const summary = {
    meta: { generated_at: meta.generatedAt },
    records: records.length,
    probes: Object.keys(byProbe).length,
    statuses,
    failed,
    blind: 'машинная классификация целей по dest_class отсутствует — сверка снимков с egress-rules по направлениям ждёт классификатора (хвост T_night)',
  };
  return {
    projections: Object.fromEntries(Object.entries(byProbe).map(([k, v]) => [`${k}.json`, v])),
    summary,
  };
}

/**
 * T_night v1: снимки против политики машин — machine обязан быть в политике.
 * Сверка направлений с egress-rules — за классификатором целей (слепота названа
 * в summary.blind). Находки — в канал M4 через summary.findings.
 *
 * @param {object[]} records
 * @param {{ machines: { machine: string }[] }} policy
 * @returns {{ kind: string, detail: string }[]}
 */
export function checkAgainstPolicy(records, policy) {
  const known = new Set((policy.machines ?? []).map((m) => m.machine));
  const findings = [];
  for (const r of records) {
    if (!known.has(r.machine)) {
      findings.push({
        kind: 'machine-unknown',
        detail: `снимок ${r.probe_id ?? r.target}: машина «${r.machine}» не объявлена в machine-policy`,
      });
    }
  }
  return findings;
}
