/**
 * case-store — ядро контейнера кейсов (#1298): парс, валидация, агрегаты, снимки.
 *
 * Кейс — зеркало прецедента (docs/precedents): там «что сломалось», тут «что сработало».
 * Подвал двух слоёв (спека капитана 26.07): опознание (id/date/home/span/actors/evidence)
 * и метки для расчёта (mechanism/repeatable/cost/proofs/firmness/links).
 *
 * Два закона данных:
 *  - метки — из ЗАКРЫТЫХ перечней (свободный текст в оценке = зверь «Проза» #1204 на
 *    уровне данных); mechanisms.json расширяется как classes.json прецедентов — ADR + слово;
 *  - у каждого обязательного поля (кроме id) есть легальное «нет»: {"none": "<причина>"} —
 *    иначе обязательный подвал сам родит заглушки (зверь «Заглушка» #1219).
 *
 * evidence[] — id из индекса вещдоков (docs/evidence/registry.jsonl); резолв делает
 * валидатор, битая ссылка — находка по имени. Детерминировано, без сети.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const META_RE = /<!--\s*case-meta\s*([\s\S]*?)-->/u;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;

export const HOMES = Object.freeze([
  'bridge', 'storm', 'morning-ritual', 'evening-ritual', 'day-sprint', 'night-sprint', 'meeting', 'session',
]);
export const REPEATABLE = Object.freeze(['repeatable', 'conditional', 'one-off-luck']);
export const COST_METRICS = Object.freeze(['passes', 'hours', 'attempts', 'runs', 'sessions']);
export const PROOF_KINDS = Object.freeze(['screenshot', 'receipt', 'pr', 'protocol', 'transcript', 'photo', 'document', 'crystal']);

const REQUIRED = ['id', 'date', 'home', 'span', 'actors', 'evidence', 'mechanism', 'repeatable', 'cost', 'proofs', 'firmness'];
const KNOWN = [...REQUIRED, 'links'];

const isNonEmptyString = (s) => typeof s === 'string' && s.trim().length > 0;

/** Легальное «нет»: {"none": "<непустая причина>"}. none без причины — НЕ легально. */
export function isLegalNo(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    && Object.keys(v).length === 1 && isNonEmptyString(v.none);
}

/** Закрытый перечень механизмов. Отсутствие/битость файла — инструментальная ошибка (throw). */
export function loadMechanismKeys(repoRoot) {
  const p = join(repoRoot, 'docs', 'cases', 'mechanisms.json');
  if (!existsSync(p)) throw new Error('docs/cases/mechanisms.json отсутствует (закрытый перечень механизмов обязателен)');
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    throw new Error('docs/cases/mechanisms.json — битый JSON');
  }
  return new Set((parsed.mechanisms ?? []).map((m) => m.key));
}

/** id вещдоков из индекса docs/evidence/registry.jsonl (append-only, строка = запись). */
export function loadEvidenceIds(repoRoot) {
  const p = join(repoRoot, 'docs', 'evidence', 'registry.jsonl');
  const ids = new Set();
  if (!existsSync(p)) return ids;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/u)) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line);
      if (isNonEmptyString(rec.id)) ids.add(rec.id);
    } catch {
      /* битая строка индекса — находка мастерской вещдоков, не кейсов */
    }
  }
  return ids;
}

function isCalendarDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** @param {string} md @returns {{meta: object|null, error: string|null}} */
export function parseCase(md) {
  const m = META_RE.exec(md);
  if (!m) return { meta: null, error: 'мета-блок <!-- case-meta … --> не найден' };
  try {
    return { meta: JSON.parse(m[1]), error: null };
  } catch {
    return { meta: null, error: 'мета-блок — битый JSON' };
  }
}

/**
 * Проверить мета кейса. Находки — по именам полей.
 * @param {object} meta
 * @param {{mechanismKeys: Set<string>, evidenceIds?: Set<string>, fileBase?: string}} ctx
 * @returns {string[]}
 */
export function validateCaseMeta(meta, ctx = {}) {
  const problems = [];
  if (meta === null || typeof meta !== 'object' || Array.isArray(meta)) return ['мета — не объект'];
  const { mechanismKeys = new Set(), evidenceIds = null, fileBase } = ctx;
  const keys = Object.keys(meta);
  for (const k of REQUIRED) if (!keys.includes(k)) problems.push(`нет поля ${k} (обязательное; легальное «нет» — {"none": "причина"})`);
  for (const k of keys) if (!KNOWN.includes(k)) problems.push(`лишнее поле ${k}`);

  // Кривое «нет» ловится по имени: none-объект с пустой причиной или лишними ключами.
  const brokenNo = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && 'none' in v && !isLegalNo(v);
  const check = (k, fn, expects) => {
    if (!keys.includes(k)) return;
    const v = meta[k];
    if (isLegalNo(v)) return;
    if (brokenNo(v)) problems.push(`${k} — «нет» без причины (none обязан нести непустую причину)`);
    else if (!fn(v)) problems.push(`${k} — ${expects}`);
  };

  if (keys.includes('id')) {
    if (!isNonEmptyString(meta.id)) problems.push('id — не непустая строка');
    else if (fileBase && meta.id !== fileBase) problems.push(`id «${meta.id}» ≠ имени файла «${fileBase}»`);
    if (isLegalNo(meta.id)) problems.push('id — легальное «нет» не предусмотрено (кейс без id не адресуем)');
  }
  check('date', isCalendarDate, 'не календарная YYYY-MM-DD');
  check('home', (v) => HOMES.includes(v), `вне перечня HOMES (${HOMES.join('|')})`);
  check('span', (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
    && isNonEmptyString(v.session) && isNonEmptyString(v.reply) && isNonEmptyString(v.time),
  'не указатель {session, reply, time} с непустыми полями');
  check('actors', (v) => Array.isArray(v) && v.length > 0 && v.every(isNonEmptyString), 'не непустой массив непустых строк');
  check('evidence', (v) => Array.isArray(v) && v.length > 0 && v.every(isNonEmptyString), 'не непустой массив id вещдоков');
  if (keys.includes('evidence') && Array.isArray(meta.evidence) && evidenceIds) {
    for (const id of meta.evidence) {
      if (isNonEmptyString(id) && !evidenceIds.has(id)) {
        problems.push(`evidence «${id}» не найден в индексе вещдоков (docs/evidence/registry.jsonl) — битая ссылка`);
      }
    }
  }
  check('mechanism', (v) => isNonEmptyString(v) && mechanismKeys.has(v), 'вне закрытого перечня mechanisms.json (зверь «Проза» на уровне данных)');
  check('repeatable', (v) => REPEATABLE.includes(v), `вне перечня (${REPEATABLE.join('|')})`);
  check('cost', (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
    && COST_METRICS.includes(v.metric) && Number.isFinite(v.value) && v.value >= 0,
  `не {metric: ${COST_METRICS.join('|')}, value: число ≥ 0}`);
  check('proofs', (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
    && Number.isInteger(v.count) && v.count >= 0 && Array.isArray(v.kinds)
    && v.kinds.every((k) => PROOF_KINDS.includes(k)) && v.kinds.length > 0 === v.count > 0,
  `не {count: целое ≥ 0, kinds: из ${PROOF_KINDS.join('|')}} (kinds пуст ⇔ count 0)`);
  check('firmness', (v) => Number.isInteger(v) && v >= 1 && v <= 5, 'не целое 1–5');
  if (keys.includes('links')) {
    if (!Array.isArray(meta.links) || meta.links.some((l) => !isNonEmptyString(l))) {
      problems.push('links — не массив непустых строк');
    }
  }
  return problems;
}

/**
 * Собрать все кейсы дома.
 * @param {string} repoRoot
 * @returns {{file: string, id: string, meta: object|null, problems: string[]}[]}
 */
export function listCases(repoRoot) {
  const dir = join(repoRoot, 'docs', 'cases');
  const mechanismKeys = loadMechanismKeys(repoRoot);
  const evidenceIds = loadEvidenceIds(repoRoot);
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.md') || name === 'README.md') continue;
    const file = join(dir, name);
    const fileBase = name.slice(0, -3);
    const { meta, error } = parseCase(readFileSync(file, 'utf8'));
    const problems = error ? [error] : validateCaseMeta(meta, { mechanismKeys, evidenceIds, fileBase });
    out.push({ file, id: meta?.id ?? fileBase, meta, problems });
  }
  return out;
}

/** Значение метки для группировки: ключ, «нет: …» для legal-no, «дефект» для прочего. */
function labelOf(v) {
  if (typeof v === 'string' || Number.isInteger(v)) return String(v);
  if (isLegalNo(v)) return 'нет (легальное)';
  return 'дефект';
}

/** @param {'mechanism'|'repeatable'|'home'} by */
export function decomposeBy(cases, by) {
  const groups = new Map();
  for (const c of cases) {
    const key = labelOf(c.meta?.[by]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c.id);
  }
  return groups;
}

/**
 * Портфолио: какие механизмы чаще дают ценность · что повторяемо · что везение ·
 * где не хватает доказательств. Считает только по меткам — потому они и закрытые.
 */
export function portfolio(cases) {
  const byMechanism = new Map();
  const luck = [];
  const proofGaps = [];
  for (const c of cases) {
    const m = labelOf(c.meta?.mechanism);
    if (!byMechanism.has(m)) byMechanism.set(m, { total: 0, repeatable: 0, conditional: 0, luck: 0 });
    const row = byMechanism.get(m);
    row.total += 1;
    const r = c.meta?.repeatable;
    if (r === 'repeatable') row.repeatable += 1;
    else if (r === 'conditional') row.conditional += 1;
    else if (r === 'one-off-luck') {
      row.luck += 1;
      luck.push(c.id);
    }
    const p = c.meta?.proofs;
    if (isLegalNo(p) || (p && p.count === 0)) proofGaps.push(c.id);
    else if (isLegalNo(c.meta?.evidence)) proofGaps.push(`${c.id} (доказательства есть, вещдоков в индексе нет)`);
  }
  return { byMechanism, luck, proofGaps };
}

/**
 * generalize: номинация в кандидат-гранулы. ТОЛЬКО номинация — в канон ничего не пишется.
 * Готов: repeatable ∧ evidence — живой список id. Без вещдоков — честное «не готов».
 */
export function nominations(cases) {
  const ready = [];
  const waiting = [];
  for (const c of cases) {
    if (c.meta?.repeatable !== 'repeatable') continue;
    if (Array.isArray(c.meta.evidence) && c.meta.evidence.length > 0 && c.problems.length === 0) {
      ready.push({ id: c.id, mechanism: c.meta.mechanism, evidence: c.meta.evidence });
    } else {
      const why = isLegalNo(c.meta?.evidence) ? c.meta.evidence.none : c.problems[0] ?? 'вещдоки не разрешаются';
      waiting.push({ id: c.id, mechanism: labelOf(c.meta?.mechanism), why });
    }
  }
  return { ready, waiting };
}

/** Производный снимок реестра (registry/CASES.md). Руками не править. */
export function renderSnapshot(cases, { date } = {}) {
  const lines = [
    '# Реестр кейсов — производный снимок',
    '',
    `Пересобран: ${date ?? 'н/д'} · источник истины — файлы \`docs/cases/*.md\` (append-only).`,
    'Руками не править: `yarn case:register --rebuild`.',
    '',
    '| id | date | home | mechanism | repeatable | подвал |',
    '|----|------|------|-----------|------------|--------|',
  ];
  for (const c of cases) {
    const m = c.meta ?? {};
    lines.push(
      `| ${c.id} | ${labelOf(m.date)} | ${labelOf(m.home)} | ${labelOf(m.mechanism)} | ${labelOf(m.repeatable)} | ${c.problems.length === 0 ? 'полон' : `находок: ${c.problems.length}`} |`,
    );
  }
  return `${lines.join('\n')}\n`;
}

/** Производный снимок номинаций (registry/NOMINATIONS.md). Только номинация, не канон. */
export function renderNominations({ ready, waiting }, { date } = {}) {
  const lines = [
    '# Номинации в кандидат-гранулы — производный снимок',
    '',
    `Пересобран: ${date ?? 'н/д'} · \`yarn case:generalize\`. **Только номинация** —`,
    'в канон/каркасы промптов запись делает человек по слову владельца.',
    '',
    '## Готовы (repeatable ∧ вещдоки живы)',
    '',
  ];
  if (ready.length === 0) lines.push('_пусто_');
  for (const n of ready) lines.push(`- **${n.id}** · механизм \`${n.mechanism}\` · вещдоки: ${n.evidence.join(', ')}`);
  lines.push('', '## Не готовы (повторяемы, но без вещдоков)', '');
  if (waiting.length === 0) lines.push('_пусто_');
  for (const n of waiting) lines.push(`- ${n.id} · \`${n.mechanism}\` — ${n.why}`);
  return `${lines.join('\n')}\n`;
}
