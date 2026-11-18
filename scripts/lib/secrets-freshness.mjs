/**
 * Ядро проверки свежести секретов (#2662).
 *
 * Реестр — markdown-таблица в `docs/security/SECRETS_REGISTRY.md` между маркерами
 * `<!-- secrets-registry:start -->` / `<!-- secrets-registry:end -->`. Значений секретов в нём
 * нет; проверка читает только имена, места и даты.
 *
 * Судит:
 *   - секрет, названный в workflows (`secrets.<ИМЯ>`), обязан иметь строку реестра с местом
 *     «GitHub secret» или «GitHub Actions» — иначе находка `unregistered` (красный);
 *   - записанная дата истечения прошла — `expired` (красный);
 *   - до даты ≤ warnDays — `expiring` (предупреждение);
 *   - «неизвестно …» — `unknown` (сводка для владельца, не красит).
 *
 * Чистые функции; ФС и печать — у вызывающего.
 */

export const START = '<!-- secrets-registry:start -->';
export const END = '<!-- secrets-registry:end -->';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Строки таблицы реестра → записи. Бросает, если маркеров или колонок нет. */
export function parseRegistry(markdown) {
  const text = String(markdown);
  const a = text.indexOf(START);
  const b = text.indexOf(END);
  if (a < 0 || b < 0 || b < a) throw new Error('реестр: нет маркеров secrets-registry:start/end');
  const lines = text
    .slice(a + START.length, b)
    .split(/\r?\n/u)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'));
  if (lines.length < 2) throw new Error('реестр: таблица пуста');
  const cells = (l) =>
    l
      .replace(/^\|/u, '')
      .replace(/\|$/u, '')
      .split('|')
      .map((c) => c.trim());
  const header = cells(lines[0]);
  const col = (name) => {
    const i = header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    if (i < 0) throw new Error(`реестр: нет колонки «${name}»`);
    return i;
  };
  const iName = col('Имя');
  const iWhere = col('Где лежит');
  const iExp = col('Истекает');
  const iUpd = col('Обновлён');
  const rows = [];
  for (const line of lines.slice(1)) {
    if (/^\|[\s|:-]+\|$/u.test(line)) continue; // разделитель
    const c = cells(line);
    const m = c[iName]?.match(/`([^`]+)`/u);
    rows.push({
      name: m ? m[1] : (c[iName] ?? ''),
      label: c[iName] ?? '',
      where: c[iWhere] ?? '',
      updated: c[iUpd] ?? '',
      expires: c[iExp] ?? '',
    });
  }
  return rows;
}

/** Имена `secrets.<ИМЯ>` в тексте workflow. */
export function workflowSecretNames(yamlText) {
  const out = new Set();
  for (const m of String(yamlText).matchAll(/secrets\.([A-Za-z_][A-Za-z0-9_]*)/gu)) out.add(m[1]);
  return out;
}

export function isGithubRow(row) {
  return /GitHub (secret|Actions)/iu.test(row.where);
}

/** Классификация колонки «Истекает». */
export function expiryKind(value) {
  const v = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/u.test(v)) return 'date';
  if (/^неизвестно/iu.test(v)) return 'unknown';
  if (/^(не истекает|на прогон|—|-)$/iu.test(v)) return 'none';
  return 'invalid';
}

/**
 * @param {ReturnType<typeof parseRegistry>} rows
 * @param {Map<string, string[]>} used имя секрета → workflows, где он назван
 * @param {{today: string, warnDays?: number}} opts today — ГГГГ-ММ-ДД
 */
export function checkFreshness(rows, used, { today, warnDays = 14 }) {
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(now)) throw new Error(`неверная дата today: ${today}`);
  const errors = [];
  const warnings = [];
  const unknown = [];
  const githubNames = new Set(rows.filter(isGithubRow).map((r) => r.name));
  for (const [name, files] of [...used].sort(([x], [y]) => x.localeCompare(y))) {
    if (!githubNames.has(name)) errors.push({ kind: 'unregistered', name, files });
  }
  for (const r of rows) {
    const kind = expiryKind(r.expires);
    if (kind === 'unknown') unknown.push({ kind: 'unknown', name: r.label });
    else if (kind === 'invalid') errors.push({ kind: 'invalid', name: r.label, value: r.expires });
    else if (kind === 'date') {
      const days = Math.floor((Date.parse(`${r.expires}T00:00:00Z`) - now) / DAY_MS);
      if (days < 0) errors.push({ kind: 'expired', name: r.label, expires: r.expires, days });
      else if (days <= warnDays) warnings.push({ kind: 'expiring', name: r.label, expires: r.expires, days });
    }
  }
  return { ok: errors.length === 0, errors, warnings, unknown, total: rows.length };
}
