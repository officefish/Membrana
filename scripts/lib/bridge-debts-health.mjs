/**
 * bridge-debts-health — здоровье реестра долгов попугая (заседание bridge-ledger-toolset,
 * M1–M3 ратифицированы владельцем 2026-07-25).
 *
 * Чистые функции — только парсинг/арифметика, без сети и fs (fs инъектируется вызывающим,
 * bridge.mjs). Инвариант тайминга детерминирован: `today` передаётся, не берётся из часов.
 *
 * M1 (контракт вещдока): пока долги — вольный текст, kind извлекается эвристикой из
 * evidence; целевой контракт — {kind, ref, verifiedAt}. `prose` — честный запасной тип:
 * непроверяемо → всегда unknown → audit-открыто.
 * M3 (порядок зубов): здесь — ЗУБ 1 `validate` (дёшево, offline: живость ref + возраст).
 */

/** @typedef {import('./bridge-debts.mjs').Debt} Debt */

/** file:line с опциональным символом сразу за ним — «code-review.mjs:160 anthropicPost». */
const FILE_LINE_SYMBOL_RE = /([\w./@-]+\.\w+):(\d+)(?:\s+([A-Za-z_$][\w$]*))?/gu;
/** Issue/PR-ссылка — «#1094», «Issue #933», «PR #746». */
const ISSUE_RE = /#(\d+)\b/gu;
/** date: время-ограниченный долг — «date:2026-08-01» (после порога гаснет/проверить снятие). */
const DATE_RE = /\bdate:(\d{4}-\d{2}-\d{2})\b/gu;
/** absent: долг «нужен файл X» — «absent:.gitleaks.toml» (гаснет, когда файл ПОЯВИТСЯ; инверсия). */
const ABSENT_RE = /\babsent:([\w./@-]+)/gu;

/**
 * Извлечь типизированные ссылки из вольного текста вещдока (M1-эвристика до миграции).
 * @param {string} evidence
 * @returns {Array<{kind:'symbol'|'file'|'issue', ref:string, file?:string, line?:number, symbol?:string, issue?:number}>}
 */
export function extractRefs(evidence) {
  const text = String(evidence ?? '');
  const refs = [];
  for (const m of text.matchAll(FILE_LINE_SYMBOL_RE)) {
    const [ref, file, line, symbol] = m;
    refs.push(
      symbol
        ? { kind: 'symbol', ref, file, line: Number(line), symbol }
        : { kind: 'file', ref, file, line: Number(line) },
    );
  }
  for (const m of text.matchAll(ISSUE_RE)) {
    refs.push({ kind: 'issue', ref: m[0], issue: Number(m[1]) });
  }
  for (const m of text.matchAll(DATE_RE)) {
    refs.push({ kind: 'date', ref: m[0], date: m[1] });
  }
  for (const m of text.matchAll(ABSENT_RE)) {
    refs.push({ kind: 'absent', ref: m[0], file: m[1] });
  }
  return refs;
}

/**
 * Возраст долга в днях (детерминированно: обе даты — ISO `YYYY-MM-DD`, строкой).
 * @param {string} dateStr
 * @param {string} today
 * @returns {number} целые дни (≥ 0); при нечитаемых датах → 0
 */
export function ageDays(dateStr, today) {
  const a = Date.parse(`${String(dateStr).trim()}T00:00:00Z`);
  const b = Date.parse(`${String(today).trim()}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/**
 * ЗУБ 1 — validate: живость ссылок вещдока + возраст. Offline.
 * fs инъектируется: `resolveFile(path) → text|null` (null = файла нет).
 * symbol-ref: файл есть, но символа в нём НЕТ → мёртвая ссылка (протухший claim —
 * ровно случай `code-review.mjs:160 anthropicPost`).
 *
 * @param {Debt} debt
 * @param {{resolveFile:(p:string)=>string|null, today:string, maxAgeDays?:number}} deps
 * @returns {{id:string, refs:number, deadRefs:Array<{ref:string, why:string}>, age:number, aged:boolean, verdict:'ok'|'stale-ref'|'aged'}}
 */
export function validateDebt(debt, { resolveFile, today, maxAgeDays = 3 }) {
  const refs = extractRefs(debt.evidence);
  const deadRefs = [];
  const resolvedHints = []; // сигналы, что долг ПОРА снять (date истёк / absent-файл появился)
  for (const r of refs) {
    if (r.kind === 'issue') continue; // issue-состояние решает audit (сеть), не validate
    if (r.kind === 'date') {
      if (String(today) > r.date) resolvedHints.push({ ref: r.ref, why: `срок истёк (${r.date}) — проверить снятие` });
      continue;
    }
    if (r.kind === 'absent') {
      // инверсия: долг «нужен файл X». Файл появился → снять; отсутствует → долг ещё жив.
      if (resolveFile(r.file) != null) resolvedHints.push({ ref: r.ref, why: `нужный файл появился: ${r.file}` });
      continue;
    }
    const text = resolveFile(r.file);
    if (text == null) {
      deadRefs.push({ ref: r.ref, why: `файла нет: ${r.file}` });
      continue;
    }
    if (r.kind === 'symbol' && !text.includes(r.symbol)) {
      deadRefs.push({ ref: r.ref, why: `символа «${r.symbol}» нет в ${r.file}` });
    }
  }
  const age = ageDays(debt.date, today);
  const aged = debt.status === 'open' && age > maxAgeDays;
  const verdict =
    deadRefs.length > 0 ? 'stale-ref' : resolvedHints.length > 0 ? 'resolved-hint' : aged ? 'aged' : 'ok';
  return { id: debt.id, refs: refs.length, deadRefs, resolvedHints, age, aged, verdict };
}

/**
 * ЗУБ 2a — пересечения по общему issue-вещдоку (decidable-прокси кластера, offline).
 * Семантические кластеры (напр. anthropic-limit ⊂ codereview ⊂ ritual-bypass — «каналы/LLM»)
 * offline НЕ решаемы: им нужен `theme` из контракта M1. Здесь — только то, что решает grep:
 * два+ открытых долга, ссылающихся на ОДИН issue.
 * @param {Debt[]} debts
 * @returns {Array<{issue:number, ids:string[]}>}
 */
export function sharedIssueOverlaps(debts) {
  const byIssue = new Map();
  for (const d of debts ?? []) {
    if (d.status !== 'open') continue;
    for (const r of extractRefs(d.evidence)) {
      if (r.kind !== 'issue') continue;
      const arr = byIssue.get(r.issue) ?? [];
      arr.push(d.id);
      byIssue.set(r.issue, arr);
    }
  }
  return [...byIssue.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([issue, ids]) => ({ issue, ids }));
}

/**
 * Группировка открытых долгов по теме (безтемные — каждый свой узел, ключ по id).
 * @param {Debt[]} debts
 * @returns {Map<string, Debt[]>}
 */
function openByTheme(debts) {
  const groups = new Map();
  for (const d of (debts ?? []).filter((x) => x.status === 'open')) {
    const key = d.theme ? `theme:${d.theme}` : `solo:${d.id}`;
    (groups.get(key) ?? groups.set(key, []).get(key)).push(d);
  }
  return groups;
}

/**
 * ЗУБ 2a — семантические кластеры по теме (M1 разблокировал): темы с ≥2 открытыми долгами.
 * Ровно то, что раньше было offline не решаемо («каналы-LLM»: 4 долга → 1 узел).
 * @param {Debt[]} debts
 * @returns {Array<{theme:string, ids:string[]}>}
 */
export function themeClusters(debts) {
  const out = [];
  for (const [key, group] of openByTheme(debts)) {
    if (key.startsWith('theme:') && group.length >= 2) {
      out.push({ theme: key.slice('theme:'.length), ids: group.map((d) => d.id) });
    }
  }
  return out;
}

/**
 * ЗУБ 2b — realActiveCount: честное число живых. Узел-тема, у которой есть хоть один
 * НЕ-стухший открытый долг, считается за 1 (кластер схлопывается). Тема, где ВСЕ долги
 * стухли по ссылке, из счёта выпадает. prose не гасится (на слово владельца).
 * @param {Debt[]} debts
 * @param {Array<ReturnType<typeof validateDebt>>} validations
 * @returns {{declaredOpen:number, themeNodes:number, staleRef:number, realActive:number}}
 */
export function realActiveCount(debts, validations) {
  const open = (debts ?? []).filter((d) => d.status === 'open');
  const vById = new Map((validations ?? []).map((v) => [v.id, v]));
  const isStale = (d) => vById.get(d.id)?.verdict === 'stale-ref';
  const groups = openByTheme(debts);
  let realActive = 0;
  for (const group of groups.values()) {
    if (group.some((d) => !isStale(d))) realActive += 1; // узел жив, если есть не-стухший долг
  }
  return {
    declaredOpen: open.length,
    themeNodes: groups.size,
    staleRef: open.filter(isStale).length,
    realActive,
  };
}

/** Возрастная корзина долга (для decompose --by age). */
export function ageBucket(days) {
  if (days <= 0) return 'сегодня';
  if (days <= 3) return '≤3д';
  return '>3д';
}

/**
 * ЗУБ 4a — decompose: раскладка ОТКРЫТЫХ долгов по оси. Offline, детерминир.
 * @param {Debt[]} debts
 * @param {'theme'|'age'|'status'} axis
 * @param {string} [today] нужен для axis='age'
 * @returns {{axis:string, groups:Array<{key:string, count:number, ids:string[]}>}}
 */
export function decompose(debts, axis, today = '') {
  const src = axis === 'status' ? (debts ?? []) : (debts ?? []).filter((d) => d.status === 'open');
  const keyOf = (d) =>
    axis === 'theme' ? (d.theme || '—без-темы') : axis === 'age' ? ageBucket(ageDays(d.date, today)) : d.status;
  const map = new Map();
  for (const d of src) {
    const k = keyOf(d);
    const g = map.get(k) ?? { key: k, count: 0, ids: [] };
    g.count += 1;
    g.ids.push(d.id);
    map.set(k, g);
  }
  return { axis, groups: [...map.values()].sort((a, b) => b.count - a.count) };
}

/**
 * ЗУБ 3 — audit: сверка issue-вещдока с main (то, что validate не судит — нужна сеть).
 * `resolveIssue(n) → 'resolved'|'live'|'unknown'` инъектируется (в команде — gh).
 * Долг с issue CLOSED/MERGED → resolved (кандидат в settle). Без issue-ссылок → 'n/a'.
 * @param {Debt} debt
 * @param {{resolveIssue:(n:number)=>'resolved'|'live'|'unknown'}} deps
 * @returns {{id:string, issues:number[], verdict:'resolved'|'live'|'unknown'|'n/a'}}
 */
export function auditDebt(debt, { resolveIssue }) {
  const issues = extractRefs(debt.evidence).filter((r) => r.kind === 'issue').map((r) => r.issue);
  if (issues.length === 0) return { id: debt.id, issues: [], verdict: 'n/a' };
  const states = issues.map((n) => resolveIssue(n));
  // resolved только если ВСЕ issue закрыты; хоть один live → live; иначе unknown
  const verdict = states.every((s) => s === 'resolved')
    ? 'resolved'
    : states.some((s) => s === 'live')
      ? 'live'
      : 'unknown';
  return { id: debt.id, issues, verdict };
}

/**
 * ЗУБ 4b — propose: синтез validate+audit+invariants в предложение действий.
 * @param {Debt[]} debts
 * @param {Array<ReturnType<typeof validateDebt>>} validations
 * @param {Array<ReturnType<typeof auditDebt>>} audits
 * @returns {{settle:Array<{id:string, why:string}>, supersede:Array<{id:string, why:string}>, hold:string[], auditOpen:string[]}}
 */
export function propose(debts, validations, audits) {
  const vById = new Map((validations ?? []).map((v) => [v.id, v]));
  const aById = new Map((audits ?? []).map((a) => [a.id, a]));
  const out = { settle: [], supersede: [], hold: [], auditOpen: [] };
  for (const d of (debts ?? []).filter((x) => x.status === 'open')) {
    const v = vById.get(d.id);
    const a = aById.get(d.id);
    if (a?.verdict === 'resolved') {
      out.settle.push({ id: d.id, why: `issue #${a.issues.join('/#')} закрыт` });
    } else if (v?.verdict === 'resolved-hint') {
      out.settle.push({ id: d.id, why: v.resolvedHints.map((r) => r.why).join('; ') });
    } else if (v?.verdict === 'stale-ref') {
      out.supersede.push({ id: d.id, why: v.deadRefs.map((r) => r.why).join('; ') });
    } else if (extractRefs(d.evidence).length === 0 && (!a || a.verdict === 'n/a')) {
      out.auditOpen.push(d.id); // prose без issue — машиной не решить
    } else {
      out.hold.push(d.id);
    }
  }
  return out;
}

/**
 * Health-метрики реестра (M2-ядро: честное число вместо «заявлено N»).
 * `realActiveHint` — грубая нижняя оценка живых: open минус долги с мёртвой ссылкой
 * (протухший claim не считается живым автоматически, но и не гасится — на слово владельца).
 * Полный realActiveCount закроется после audit (ЗУБ 3). Здесь — offline-проекция.
 *
 * @param {Debt[]} debts
 * @param {Array<ReturnType<typeof validateDebt>>} validations
 * @returns {{declaredOpen:number, settled:number, staleRef:number, aged:number, prose:number, realActiveHint:number}}
 */
export function healthMetrics(debts, validations) {
  const list = debts ?? [];
  const open = list.filter((d) => d.status === 'open');
  const settled = list.length - open.length;
  const vById = new Map((validations ?? []).map((v) => [v.id, v]));
  const staleRef = open.filter((d) => vById.get(d.id)?.verdict === 'stale-ref').length;
  const aged = open.filter((d) => vById.get(d.id)?.verdict === 'aged').length;
  // prose: у долга нет ни одной проверяемой ссылки (ни file/symbol, ни issue) → непроверяемо
  const prose = open.filter((d) => extractRefs(d.evidence).length === 0).length;
  return {
    declaredOpen: open.length,
    settled,
    staleRef,
    aged,
    prose,
    realActiveHint: open.length - staleRef,
  };
}
