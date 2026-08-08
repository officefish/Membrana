/**
 * infra-policy — чистое ядро инфраструктурной полиси (#1393 ч.1–2).
 *
 * Жанр #1310: декларация (docs/security/infra-policy.json) — что ДОЛЖНО быть;
 * факт сверяет обвязка (scripts/infra-probe.mjs); расхождение кричит ПО ИМЕНИ.
 * Секретов и балансов в декларации нет — только env-имена, модели оплаты, даты.
 *
 * knownBlocked — ОТДЕЛЬНЫЙ статус (не ok и не красный): гасит красный до решения
 * указанной части, но в выводе не притворяется зелёным.
 * Ни fs, ни сети — обвязка снаружи.
 */

export const BILLING = Object.freeze(['monthly-limit', 'credits', 'rent', 'included']);
export const ENV_KEY_RE = /_API_(KEY|TOKEN)$/u;

/** Структурные проблемы декларации — по именам звеньев. */
export function policyProblems(policy) {
  const problems = [];
  if (!policy || !Array.isArray(policy.links) || policy.links.length === 0) {
    return ['декларация пуста — реестр мощностей обязан нести звенья'];
  }
  const seen = new Set();
  for (const l of policy.links) {
    const id = l?.id ?? '(без id)';
    if (!l?.id) problems.push('звено без id');
    if (seen.has(id)) problems.push(`${id}: дубль id`);
    seen.add(id);
    if (!Array.isArray(l?.envKeys)) problems.push(`${id}: envKeys — массив env-ИМЁН (пустой легален для rent/included)`);
    if (!BILLING.includes(l?.billing)) problems.push(`${id}: billing «${l?.billing}» вне перечня (${BILLING.join('|')})`);
    if (!l?.replenish?.who || !l?.replenish?.signal) problems.push(`${id}: replenish.who/signal обязательны — мощность без пополняющего осиротеет`);
    if (!String(l?.scale ?? '').trim()) problems.push(`${id}: scale (план наращивания) обязателен`);
    if (!String(l?.probe?.method ?? '').trim()) problems.push(`${id}: probe.method обязателен (none — легально, но словом)`);
    if (!String(l?.fallback ?? '').trim()) problems.push(`${id}: fallback обязателен — звено без фолбэка = немой отказ`);
    if (l?.renewsAt != null && !/^\d{4}-\d{2}-\d{2}$/u.test(String(l.renewsAt))) problems.push(`${id}: renewsAt не YYYY-MM-DD`);
    if (l?.knownBlocked != null && (!l.knownBlocked.reason || !l.knownBlocked.until)) {
      problems.push(`${id}: knownBlocked требует reason и until — блок без причины и срока это зелёнка наоборот`);
    }
  }
  return problems;
}

/**
 * Сверка декларация ↔ env по имени (обе стороны красные).
 * @param {object} policy
 * @param {string[]} presentEnvKeys — имена ключей, реально присутствующих в env
 */
export function reconcileEnv(policy, presentEnvKeys) {
  const findings = [];
  const present = new Set(presentEnvKeys ?? []);
  const declared = new Set();
  for (const l of policy?.links ?? []) {
    for (const k of l.envKeys ?? []) declared.add(k);
    const keys = l.envKeys ?? [];
    if (keys.length > 0 && !keys.some((k) => present.has(k))) {
      findings.push(`в полиси есть — ключа нет: «${l.id}» (${keys.join(' | ')}) — звено декларировано, вызвать нечем`);
    }
  }
  for (const k of present) {
    if (ENV_KEY_RE.test(k) && !declared.has(k)) {
      findings.push(`ключ без записи в полиси: «${k}» — мощность живёт вне реестра (немой носитель)`);
    }
  }
  return findings;
}

/**
 * Статус звена по итогу зонда — ТАБЛИЦА ПРЕДСТАВЛЕНИЯ, а не словарь исходов (#1804).
 * Здесь не судят, что случилось: причину именует единственный классификатор
 * (`scripts/network/lib/classify.mjs`, #1449), а эта функция лишь окрашивает его вердикт.
 * Прежний JSDoc перечислял СВОИ слова (`no-key`, `auth/geo`, `balance`, `dpi-block`, `net`)
 * и читался как третий словарь репозитория, хотя код их никогда не разбирал.
 *
 * knownBlocked гасит красный ДО решения части — но это отдельный статус, НЕ ok.
 *
 * @param {object} link
 * @param {string|null} outcome id исхода из закрытого перечня #1449, либо `skipped`/null
 */
export function linkStatus(link, outcome) {
  if (link?.knownBlocked) {
    return {
      status: 'known-blocked',
      note: `${link.knownBlocked.reason} · до: ${link.knownBlocked.until}`,
    };
  }
  if (outcome == null || outcome === 'skipped') return { status: 'skipped', note: link?.probe?.notes ?? 'probe.method=none' };
  if (outcome === 'ok') return { status: 'ok', note: null };
  return { status: 'red', note: outcome };
}

/**
 * «Что кончается и когда» — строки утренней сводки + finding-флаг.
 * Баланс без API — честное «не отдаёт», не ноль.
 * @param {object} policy
 * @param {{balances?: Record<string, string>, statuses?: Record<string, string>} | null} snapshot
 * @param {{today?: string, soonDays?: number}} [opts]
 */
export function expiringSummary(policy, snapshot, opts = {}) {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const soonDays = opts.soonDays ?? 3;
  const lines = [];
  let finding = false;
  for (const l of policy?.links ?? []) {
    if (l.renewsAt) {
      const days = Math.ceil((Date.parse(l.renewsAt) - Date.parse(today)) / 86_400_000);
      const when = days > 0 ? `через ${days} дн.` : days === 0 ? 'СЕГОДНЯ' : `${-days} дн. назад`;
      lines.push(`${l.id}: ${l.billing}, событие ${l.renewsAt} (${when})`);
      if (days <= soonDays) finding = true;
    }
    if (l.knownBlocked) {
      lines.push(`${l.id}: known-blocked — ${l.knownBlocked.reason} (до: ${l.knownBlocked.until})`);
      finding = true;
    }
    const bal = snapshot?.balances?.[l.id];
    if (bal != null) lines.push(`${l.id}: остаток ${bal}`);
    else if (l.billing === 'credits' && !l.knownBlocked) {
      lines.push(`${l.id}: остаток — ${String(l.balanceApi ?? '').startsWith('http') ? 'нет снимка (yarn infra:probe)' : 'API не отдаёт (смотреть консолью)'}`);
    }
  }
  if (!snapshot) lines.push('снимок probe отсутствует — балансы n/a (прогнать yarn infra:probe)');
  return { lines, finding };
}
