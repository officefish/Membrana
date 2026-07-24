/**
 * Аудит приёмки в day-sprint CLOSURE.md (#1001 / DRU-365).
 * Чистые функции от текста — без сети/git.
 *
 * confirmed  — структурированные acceptedBy + headRev (канон LINEAR_TASKS_GEAR §4)
 * narrative  — есть LGTM/«принят» без привязки к ревизии (вещдок «10 из 32»)
 * absent     — закрытие без следа приёмки («перестали делать»)
 */

const SHA_RE = /^[0-9a-f]{7,40}$/i;

/**
 * @typedef {'confirmed'|'narrative'|'absent'} AcceptanceKind
 *
 * @typedef {{
 *   kind: AcceptanceKind,
 *   acceptedBy: string|null,
 *   headRev: string|null,
 *   narrativeHint: string|null,
 * }} ClosureAcceptanceParse
 */

/**
 * Вытащить значение из markdown-таблицы `| key | value |`.
 * @param {string} md
 * @param {string} key
 * @returns {string|null}
 */
export function tableField(md, key) {
  if (typeof md !== 'string' || !md) return null;
  const re = new RegExp(
    `\\|\\s*\\*?\\*?${key}\\*?\\*?\\s*\\|\\s*([^|\\n]+?)\\s*\\|`,
    'i',
  );
  const m = md.match(re);
  if (!m) return null;
  return String(m[1])
    .replace(/`/g, '')
    .replace(/\*\*/g, '')
    .trim();
}

/**
 * @param {string} md
 * @returns {ClosureAcceptanceParse}
 */
export function parseClosureAcceptance(md) {
  if (typeof md !== 'string' || !md.trim()) {
    return { kind: 'absent', acceptedBy: null, headRev: null, narrativeHint: null };
  }
  const acceptedBy = tableField(md, 'acceptedBy');
  const headRevRaw = tableField(md, 'headRev');
  const headRev =
    headRevRaw && SHA_RE.test(headRevRaw.replace(/^origin\//, ''))
      ? headRevRaw.replace(/^origin\//, '').toLowerCase()
      : null;

  if (acceptedBy && headRev) {
    return { kind: 'confirmed', acceptedBy, headRev, narrativeHint: null };
  }

  // Нарративный след: секция LGTM / «LGTM Vesnin» / Verdict … LGTM — без headRev.
  const narrativeMatch =
    md.match(/^##\s+LGTM\b[^\n]*/im) ||
    md.match(/\bTeamlead\s*\([^)]+\):\s*LGTM\b/i) ||
    md.match(/\bLGTM\s+(Vesnin|Dynin|Ozhegov|Boyarskiy|Angelina)\b/i) ||
    md.match(/\b(Vesnin|Dynin|Ozhegov):\s*LGTM\b/i) ||
    md.match(/\bVerdict\b[^\n]*\bLGTM\b/i);

  if (narrativeMatch || (acceptedBy && !headRev)) {
    return {
      kind: 'narrative',
      acceptedBy: acceptedBy || null,
      headRev: headRev || null,
      narrativeHint: narrativeMatch ? String(narrativeMatch[0]).trim().slice(0, 120) : 'acceptedBy без headRev',
    };
  }

  return { kind: 'absent', acceptedBy: null, headRev: null, narrativeHint: null };
}

/**
 * @param {{ path: string, text: string }[]} files
 * @returns {{
 *   total: number,
 *   confirmed: number,
 *   narrative: number,
 *   absent: number,
 *   confirmedRatio: number|null,
 *   anyAcceptanceRatio: number|null,
 *   gateClaim: boolean,
 *   sampleAbsent: string[],
 *   sampleNarrative: string[],
 *   rows: { path: string, kind: AcceptanceKind, acceptedBy: string|null, headRev: string|null }[],
 * }}
 */
export function auditClosureFiles(files) {
  const list = Array.isArray(files) ? files : [];
  let confirmed = 0;
  let narrative = 0;
  let absent = 0;
  /** @type {string[]} */
  const sampleAbsent = [];
  /** @type {string[]} */
  const sampleNarrative = [];
  /** @type {{ path: string, kind: AcceptanceKind, acceptedBy: string|null, headRev: string|null }[]} */
  const rows = [];

  for (const f of list) {
    const parsed = parseClosureAcceptance(f?.text ?? '');
    rows.push({
      path: String(f?.path ?? ''),
      kind: parsed.kind,
      acceptedBy: parsed.acceptedBy,
      headRev: parsed.headRev,
    });
    if (parsed.kind === 'confirmed') confirmed += 1;
    else if (parsed.kind === 'narrative') {
      narrative += 1;
      if (sampleNarrative.length < 12 && f?.path) sampleNarrative.push(String(f.path));
    } else {
      absent += 1;
      if (sampleAbsent.length < 12 && f?.path) sampleAbsent.push(String(f.path));
    }
  }

  const total = list.length;
  const any = confirmed + narrative;
  return {
    total,
    confirmed,
    narrative,
    absent,
    confirmedRatio: total === 0 ? null : confirmed / total,
    anyAcceptanceRatio: total === 0 ? null : any / total,
    /** Зуб #1001: confirmed ≪ закрытий → «закрыто» ≠ «принято». */
    gateClaim: total > 0 && confirmed / total < 0.5,
    sampleAbsent,
    sampleNarrative,
    rows,
  };
}

/**
 * Собрать артефакт для checkAcceptance / trace-gate из парса CLOSURE.md.
 * @param {string} taskId
 * @param {ClosureAcceptanceParse} parsed
 */
export function toAcceptanceArtifact(taskId, parsed) {
  if (!parsed || parsed.kind !== 'confirmed') {
    return { taskId, acceptance: null };
  }
  return {
    taskId,
    acceptance: { acceptedBy: parsed.acceptedBy, headRev: parsed.headRev },
  };
}
