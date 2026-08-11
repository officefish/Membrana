/**
 * workflow-examples — валидатор и coverage примеров раздела Workflow
 * (карточка workflow-examples-marathon, стадия 1: машинный baseline).
 *
 * Дом записей: docs/workflows/examples.jsonl. Контракт записи — из промпта
 * марафона: objectType/objectId/evidenceKind/source/measuredAt/input/expected/
 * observed/verification. `fixture` показывает форму, но lived-run coverage
 * НЕ закрывает; дубликаты одного следа coverage не раздувают; отсутствующий
 * пример — видимое требование (0/N печатается, не исчезает).
 *
 * Чистые функции: baseline и записи приходят параметрами, ФС не трогается.
 */

export const EXAMPLES_REL = 'docs/workflows/examples.jsonl';
export const OBJECT_TYPES = Object.freeze(['workshop', 'procedure']);
export const EVIDENCE_KINDS = Object.freeze(['run', 'boundary', 'failure', 'fixture']);
export const REQUIRED_FIELDS = Object.freeze([
  'objectType',
  'objectId',
  'evidenceKind',
  'source',
  'measuredAt',
  'input',
  'expected',
  'observed',
  'verification',
]);

/**
 * @typedef {object} ExampleRecord
 * @property {'workshop'|'procedure'} objectType
 * @property {string} objectId
 * @property {'run'|'boundary'|'failure'|'fixture'} evidenceKind
 * @property {string} source repo-relative путь к первичному следу
 * @property {string} measuredAt YYYY-MM-DD
 * @property {string} input
 * @property {string} expected
 * @property {string} observed
 * @property {string} verification
 */

/**
 * Валидация одной записи против контракта и живого baseline.
 *
 * @param {unknown} rec
 * @param {{ workshops: Set<string>, procedures: Set<string>, sourceExists?: (rel: string) => boolean }} ctx
 * @param {string} label
 * @returns {string[]} проблемы (пусто = валидна)
 */
export function exampleProblems(rec, ctx, label = 'запись') {
  const problems = [];
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
    return [`${label}: не объект`];
  }
  const r = /** @type {Record<string, unknown>} */ (rec);
  for (const field of REQUIRED_FIELDS) {
    if (typeof r[field] !== 'string' || !String(r[field]).trim()) {
      problems.push(`${label}: поле «${field}» — не непустая строка`);
    }
  }
  if (problems.length > 0) return problems;
  if (!OBJECT_TYPES.includes(/** @type {string} */ (r.objectType))) {
    problems.push(`${label}: objectType ∉ {${OBJECT_TYPES.join(', ')}}`);
  }
  if (!EVIDENCE_KINDS.includes(/** @type {string} */ (r.evidenceKind))) {
    problems.push(`${label}: evidenceKind ∉ {${EVIDENCE_KINDS.join(', ')}}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(String(r.measuredAt))) {
    problems.push(`${label}: measuredAt — не YYYY-MM-DD (дата фактического наблюдения)`);
  }
  const pool = r.objectType === 'workshop' ? ctx.workshops : ctx.procedures;
  if (pool && !pool.has(String(r.objectId))) {
    problems.push(
      `${label}: objectId «${r.objectId}» не найден в живом источнике (${r.objectType})`,
    );
  }
  if (ctx.sourceExists && !ctx.sourceExists(String(r.source))) {
    problems.push(`${label}: source «${r.source}» не существует — текст без следа evidence не является`);
  }
  return problems;
}

/**
 * @param {string} text JSONL
 * @returns {{ records: ExampleRecord[], problems: string[] }}
 */
export function parseExamplesText(text) {
  /** @type {ExampleRecord[]} */
  const records = [];
  /** @type {string[]} */
  const problems = [];
  String(text ?? '')
    .split(/\r?\n/u)
    .forEach((line, i) => {
      const s = line.trim();
      if (!s || s.startsWith('#')) return;
      try {
        records.push(JSON.parse(s));
      } catch {
        problems.push(`строка ${i + 1}: не JSON`);
      }
    });
  return { records, problems };
}

/** Ключ дедупликации: один след не раздувает coverage. */
export function exampleDedupeKey(rec) {
  return `${rec.objectType}|${rec.objectId}|${rec.evidenceKind}|${rec.source}`;
}

/**
 * Coverage по DoD марафона: каждому объекту нужен ≥1 lived `run` И ≥1
 * `boundary|failure`. Fixture не двигает ни один счётчик lived.
 *
 * @param {{ workshops: string[], procedures: string[] }} baseline живые ID
 * @param {ExampleRecord[]} records уже валидированные записи
 * @returns {{
 *   baseline: { workshops: number, procedures: number },
 *   duplicates: string[],
 *   rows: { objectType: string, objectId: string, run: number, boundaryOrFailure: number, fixture: number, covered: boolean }[],
 *   covered: { workshops: number, procedures: number },
 * }}
 */
export function buildExamplesCoverage(baseline, records) {
  /** @type {Map<string, ExampleRecord>} */
  const unique = new Map();
  /** @type {string[]} */
  const duplicates = [];
  for (const rec of records) {
    const key = exampleDedupeKey(rec);
    if (unique.has(key)) duplicates.push(key);
    else unique.set(key, rec);
  }
  const rows = [];
  const covered = { workshops: 0, procedures: 0 };
  for (const [objectType, ids] of [
    ['workshop', baseline.workshops],
    ['procedure', baseline.procedures],
  ]) {
    for (const objectId of ids) {
      const own = [...unique.values()].filter(
        (r) => r.objectType === objectType && r.objectId === objectId,
      );
      const run = own.filter((r) => r.evidenceKind === 'run').length;
      const boundaryOrFailure = own.filter(
        (r) => r.evidenceKind === 'boundary' || r.evidenceKind === 'failure',
      ).length;
      const fixture = own.filter((r) => r.evidenceKind === 'fixture').length;
      const isCovered = run >= 1 && boundaryOrFailure >= 1;
      if (isCovered) covered[objectType === 'workshop' ? 'workshops' : 'procedures'] += 1;
      rows.push({ objectType, objectId, run, boundaryOrFailure, fixture, covered: isCovered });
    }
  }
  return {
    baseline: { workshops: baseline.workshops.length, procedures: baseline.procedures.length },
    duplicates,
    rows,
    covered,
  };
}

/**
 * Отчёт словом: заголовок coverage + все непокрытые ПО ИМЕНИ (0/N видимы).
 * @param {ReturnType<typeof buildExamplesCoverage>} cov
 * @returns {string[]}
 */
export function renderExamplesCoverage(cov) {
  const lines = [];
  lines.push(
    `coverage: workshops ${cov.covered.workshops}/${cov.baseline.workshops} · procedures ${cov.covered.procedures}/${cov.baseline.procedures} (covered = ≥1 run И ≥1 boundary|failure; fixture не считается)`,
  );
  lines.push('');
  lines.push('| Объект | run | boundary/failure | fixture | покрыт |');
  lines.push('|---|---|---|---|---|');
  for (const r of cov.rows) {
    lines.push(
      `| ${r.objectType}:${r.objectId} | ${r.run} | ${r.boundaryOrFailure} | ${r.fixture} | ${r.covered ? '✓' : '—'} |`,
    );
  }
  if (cov.duplicates.length > 0) {
    lines.push('');
    lines.push(`дубликаты следа (в coverage не считаются): ${cov.duplicates.join(' · ')}`);
  }
  return lines;
}
