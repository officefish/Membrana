/**
 * Полиси защиты ветки: чистое сравнение ДЕКЛАРАЦИИ с ФАКТОМ (#1310).
 * Декларация — docs/security/branch-protection-policy.json; факт — ответ
 * GitHub API branches/<branch>/protection. Здесь нет fs и сети: обвязка снаружи
 * (scripts/verify-branch-protection.mjs), сбой сети — honest unknown, не «ок».
 *
 * Findings говорят ИМЕНАМИ: «required_checks: заявлен X — не стоит», не «mismatch».
 * Легальное «нет» (required:false c $why) — валидное состояние, зуб его не чинит
 * и не оспаривает: правила ветки — слово владельца.
 */

/** @typedef {{ level: 'error'|'unknown', field: string, message: string }} Finding */

/**
 * @param {object} policy — декларация (см. branch-protection-policy.json)
 * @param {object|null} fact — ответ API или null (сеть недоступна / нет прав)
 * @returns {{ ok: boolean, findings: Finding[] }}
 */
export function compareProtection(policy, fact) {
  /** @type {Finding[]} */
  const findings = [];

  if (!policy || typeof policy !== 'object') {
    return { ok: false, findings: [{ level: 'error', field: 'policy', message: 'декларация не читается — полиси нет, сверять нечего' }] };
  }
  if (fact == null) {
    return {
      ok: false,
      findings: [{ level: 'unknown', field: 'fact', message: 'факт недоступен (сеть/права) — honest unknown, НЕ «ок»' }],
    };
  }

  // Обязательные проверки: каждая заявленная обязана стоять; лишние на факте — тоже находка
  const wantChecks = policy.requiredStatusChecks?.contexts ?? [];
  const haveChecks = fact.required_status_checks?.contexts ?? [];
  for (const c of wantChecks) {
    if (!haveChecks.includes(c)) {
      findings.push({ level: 'error', field: 'required_checks', message: `заявлена обязательная проверка «${c}» — на ветке НЕ стоит` });
    }
  }
  for (const c of haveChecks) {
    if (!wantChecks.includes(c)) {
      findings.push({ level: 'error', field: 'required_checks', message: `на ветке стоит проверка «${c}», которой нет в декларации — полиси отстала или правка мимо слова владельца` });
    }
  }
  const wantStrict = Boolean(policy.requiredStatusChecks?.strict);
  const haveStrict = Boolean(fact.required_status_checks?.strict);
  if (wantStrict !== haveStrict) {
    findings.push({ level: 'error', field: 'strict', message: `strict: заявлено ${wantStrict}, стоит ${haveStrict}` });
  }

  // Бинарные правила
  const pairs = [
    ['allowForcePushes', Boolean(policy.allowForcePushes), Boolean(fact.allow_force_pushes?.enabled), 'force-push'],
    ['allowDeletions', Boolean(policy.allowDeletions), Boolean(fact.allow_deletions?.enabled), 'удаление ветки'],
    ['enforceAdmins', Boolean(policy.enforceAdmins?.required), Boolean(fact.enforce_admins?.enabled), 'правила для админов'],
    ['requiredLinearHistory', Boolean(policy.requiredLinearHistory?.required), Boolean(fact.required_linear_history?.enabled), 'линейная история'],
  ];
  for (const [field, want, have, label] of pairs) {
    if (want !== have) {
      findings.push({ level: 'error', field, message: `${label}: заявлено ${want ? 'включено' : 'выключено'}, стоит ${have ? 'включено' : 'выключено'}` });
    }
  }

  // Ревью: policy.required=false — легальное «нет»; факт с ревью при заявленном «нет» — находка
  const wantReviews = Boolean(policy.requiredPullRequestReviews?.required);
  const haveReviews = fact.required_pull_request_reviews != null;
  if (wantReviews !== haveReviews) {
    findings.push({
      level: 'error',
      field: 'reviews',
      message: `обязательное ревью: заявлено ${wantReviews ? 'да' : 'нет (легальное «нет», см. $why)'} — стоит ${haveReviews ? 'да' : 'нет'}`,
    });
  }

  return { ok: findings.length === 0, findings };
}

/**
 * Вёрстка отчёта — одна строка на находку, глагол ремонта в хвосте.
 * @param {{ ok: boolean, findings: Finding[] }} result
 * @param {string} branch
 * @returns {string}
 */
export function formatProtectionReport(result, branch) {
  if (result.ok) return `verify:branch-protection — OK: защита «${branch}» совпадает с декларацией`;
  const lines = result.findings.map((f) => `  ${f.level === 'unknown' ? '?' : '✗'} [${f.field}] ${f.message}`);
  return [
    `verify:branch-protection — расхождения (${result.findings.length}):`,
    ...lines,
    '  ремонт: настройки ветки правит владелец (Settings → Branches) ЛИБО декларация приводится к факту его словом',
  ].join('\n');
}
