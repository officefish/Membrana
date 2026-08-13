/**
 * check-bare-fetch — чистое ядро зуба политики машин (#1912, вердикт В7
 * заседания network-container, ратифицирован 13.08).
 *
 * Предикат: файл серверной зоны + `fetch(`-семейство БЕЗ proxy-обвязки + не
 * покрыт allowedBarePackages → находка. Словарь находок ЗАКРЫТ:
 * VIOLATION | LEGACY | AMNESTY | POLICY_INVALID (собственный словарь В7 —
 * не словарь состояний снимка). Зуб называет, НЕ чинит (#1425).
 *
 * Чистые функции: содержимое файлов и нормы приходят параметрами.
 */

export const FINDING_KINDS = Object.freeze(['VIOLATION', 'LEGACY', 'AMNESTY', 'POLICY_INVALID']);

/**
 * Маркеры proxy-обвязки. Живой замер 13.08: шесть proxy-aware файлов office/rag
 * несут хотя бы один, четыре голых из бюджета — ни одного.
 */
export const PROXY_MARKERS = Object.freeze([
  'ProxyAgent',
  'proxy-fetch',
  'proxyFetch',
  'resolveProxyUrl',
]);

/** `fetch(`-семейство: голый вызов, который не видит HTTPS_PROXY (урок night-hunt). */
const FETCH_RE = /\bfetch\s*\(/u;
const MARKER_RE = new RegExp(PROXY_MARKERS.join('|'), 'u');

/**
 * Валидация machine-policy: битая политика — POLICY_INVALID, зуб красный
 * («проекция пуста НЕ потому, что правил нет» — тот же класс, что у атласа).
 *
 * @param {unknown} policy
 * @returns {string[]} problems
 */
export function policyProblems(policy) {
  const problems = [];
  const p = /** @type {Record<string, any>} */ (policy);
  if (!p || typeof p !== 'object') return ['machine-policy: не объект'];
  if (!Array.isArray(p.machines) || p.machines.length === 0) {
    problems.push('machine-policy: machines пуст');
  }
  if (!Array.isArray(p.allowedBarePackages)) {
    problems.push('machine-policy: allowedBarePackages — не массив');
  } else {
    p.allowedBarePackages.forEach((e, i) => {
      if (!e || typeof e !== 'object') return problems.push(`allowedBarePackages[${i}]: не объект`);
      if (e.type !== 'permanent' && e.type !== 'amnesty') {
        problems.push(`allowedBarePackages[${i}]: type ∉ {permanent, amnesty}`);
      }
      if (typeof e.package !== 'string' || !e.package.trim()) {
        problems.push(`allowedBarePackages[${i}]: package пуст`);
      }
      if (typeof e.reason !== 'string' || !e.reason.trim()) {
        problems.push(`allowedBarePackages[${i}]: reason обязателен — исключение без причины не исключение`);
      }
      if (e.type === 'amnesty' && !/^\d{4}-\d{2}-\d{2}$/u.test(String(e.expiresAt ?? ''))) {
        problems.push(`allowedBarePackages[${i}]: amnesty без expiresAt (YYYY-MM-DD)`);
      }
    });
  }
  return problems;
}

/**
 * @param {unknown} budget
 * @returns {string[]}
 */
export function budgetProblems(budget) {
  const b = /** @type {Record<string, any>} */ (budget);
  if (!b || typeof b !== 'object') return ['budget: не объект'];
  const problems = [];
  if (!Number.isInteger(b.maxBareCallsCount) || b.maxBareCallsCount < 0) {
    problems.push('budget: maxBareCallsCount — не целое ≥ 0');
  }
  if (!Array.isArray(b.knownLegacy)) problems.push('budget: knownLegacy — не массив');
  return problems;
}

/**
 * Классифицировать один файл серверной зоны.
 *
 * @param {string} relPath repo-relative, прямые слэши
 * @param {string} content
 * @param {{ allowedBarePackages: {type: string, package: string, reason: string, expiresAt?: string}[] }} policy
 * @param {{ today: string }} ctx YYYY-MM-DD
 * @returns {{ kind: 'clean'|'aware'|'allowed'|'amnesty'|'amnesty-expired'|'bare', exception?: object }}
 */
export function classifyFile(relPath, content, policy, ctx) {
  if (!FETCH_RE.test(content)) return { kind: 'clean' };
  if (MARKER_RE.test(content)) return { kind: 'aware' };
  const norm = relPath.replace(/\\/gu, '/');
  const exception = (policy.allowedBarePackages ?? []).find((e) => norm.startsWith(e.package));
  if (!exception) return { kind: 'bare' };
  if (exception.type === 'permanent') return { kind: 'allowed', exception };
  return Date.parse(exception.expiresAt) >= Date.parse(ctx.today)
    ? { kind: 'amnesty', exception }
    : { kind: 'amnesty-expired', exception };
}

/**
 * Полный прогон зуба по набору файлов.
 *
 * @param {{ path: string, content: string }[]} files файлы серверной зоны
 * @param {unknown} policy machine-policy.json
 * @param {unknown} budget network-policy-violations-budget.json
 * @param {{ today: string }} ctx
 * @returns {{
 *   ok: boolean,
 *   findings: { kind: string, path: string, detail: string }[],
 *   counts: { bare: number, legacy: number, violation: number, amnesty: number, allowed: number, aware: number },
 * }}
 */
export function runBareFetchCheck(files, policy, budget, ctx) {
  const pProblems = policyProblems(policy);
  const bProblems = budgetProblems(budget);
  if (pProblems.length || bProblems.length) {
    return {
      ok: false,
      findings: [...pProblems, ...bProblems].map((d) => ({
        kind: 'POLICY_INVALID',
        path: pProblems.includes(d)
          ? 'docs/audit/network/registry/machine-policy.json'
          : 'docs/audit/network/registry/network-policy-violations-budget.json',
        detail: d,
      })),
      counts: { bare: 0, legacy: 0, violation: 0, amnesty: 0, allowed: 0, aware: 0 },
    };
  }

  const findings = [];
  const counts = { bare: 0, legacy: 0, violation: 0, amnesty: 0, allowed: 0, aware: 0 };
  const max = /** @type {any} */ (budget).maxBareCallsCount;

  const bare = [];
  for (const f of files) {
    const c = classifyFile(f.path, f.content, /** @type {any} */ (policy), ctx);
    if (c.kind === 'aware') counts.aware += 1;
    else if (c.kind === 'allowed') counts.allowed += 1;
    else if (c.kind === 'amnesty') {
      counts.amnesty += 1;
      findings.push({
        kind: 'AMNESTY',
        path: f.path,
        detail: `временное исключение до ${c.exception.expiresAt}: ${c.exception.reason}`,
      });
    } else if (c.kind === 'amnesty-expired') {
      bare.push({ path: f.path, detail: `амнистия истекла ${c.exception.expiresAt} — вызов снова голый` });
    } else if (c.kind === 'bare') {
      bare.push({ path: f.path, detail: 'голый fetch в серверной зоне без proxy-обвязки и без исключения' });
    }
  }

  // Warn-храповик: первые max голых — LEGACY (названы, не амнистированы),
  // всё сверх бюджета — VIOLATION. Детерминизм: сортировка по пути.
  bare.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  counts.bare = bare.length;
  bare.forEach((f, i) => {
    if (i < max) {
      counts.legacy += 1;
      findings.push({ kind: 'LEGACY', path: f.path, detail: `${f.detail} — в бюджете (${i + 1}/${max})` });
    } else {
      counts.violation += 1;
      findings.push({
        kind: 'VIOLATION',
        path: f.path,
        detail: `${f.detail} — СВЕРХ бюджета ${max}: снизь вызов или заведи amnesty-запись с причиной`,
      });
    }
  });

  return { ok: counts.violation === 0, findings, counts };
}
