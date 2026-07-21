/**
 * vocabulary-check — словарь категорий процедурного слоя: проверка и генерация.
 *
 * Канон: вердикты `m2-vocabulary-r2` (структура словаря, check по маркерам) и
 * `m2a-rod` (леммы родов, checkGenus) заседания procedural-layer. Источник —
 * `docs/procedures/vocabulary.json` (единственный машиночитаемый); VOCABULARY.md —
 * генерируемая проекция, руками не правится.
 *
 * Все функции чистые и детерминированные: без сети, часов и случайности.
 */

/** Маркер категории в тексте слоя: @cat:имя (имя — kebab/кириллица без пробелов). */
const CAT_MARKER_RE = /@cat:([\p{L}0-9-]+)/gu;

/** Маркер операции над категорией: @op:effect:@cat:имя (effect над категорией). */
const OP_MARKER_RE = /@op:([a-z]+):@cat:([\p{L}0-9-]+)/gu;

/**
 * Дефекты схемы источника словаря. Пустой список — источник годен.
 * @param {unknown} v распарсенный vocabulary.json
 * @returns {string[]}
 */
export function vocabularySchemaProblems(v) {
  const problems = [];
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return ['источник — не объект'];
  if (!v.genera || typeof v.genera !== 'object') problems.push('нет genera');
  if (!Array.isArray(v.categories)) return [...problems, 'categories — не массив'];
  const fields = ['name', 'definition', 'genus', 'marker', 'membership'];
  v.categories.forEach((c, i) => {
    for (const f of fields) {
      if (typeof c?.[f] !== 'string' || c[f].trim() === '') problems.push(`статья №${i + 1}: поле ${f} пусто`);
    }
    if (c?.genus && v.genera && !v.genera[c.genus]) problems.push(`статья «${c?.name}»: род «${c.genus}» не объявлен в genera`);
    if (c?.marker && c?.name && c.marker !== `@cat:${c.name}`) problems.push(`статья «${c.name}»: маркер «${c.marker}» ≠ @cat:имя`);
  });
  return problems;
}

/**
 * check() — инвариант замка словаря: каждый использованный маркер объявлен.
 * usedTerms = явные маркеры @cat:, не греп по прозе (вердикт M2).
 *
 * @param {string} layerText текст слоя (README/канон процедуры)
 * @param {{categories: {name: string}[]}} vocabulary источник словаря
 * @returns {{violations: {term: string, location: string, reason: string}[]}}
 *   «0 нарушений» выражается ЯВНЫМ пустым списком (анти-Молчун).
 */
export function check(layerText, vocabulary) {
  const declared = new Set((vocabulary?.categories ?? []).map((c) => c.name));
  const violations = [];
  const lines = String(layerText ?? '').split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const m of line.matchAll(CAT_MARKER_RE)) {
      const term = m[1];
      if (!declared.has(term)) {
        violations.push({ term, location: `строка ${idx + 1}`, reason: 'маркер @cat: без статьи в словаре' });
      }
    }
  });
  return { violations };
}

/**
 * checkGenus() — обращение процедуры с категорией против её рода (вердикт M2A):
 * effect маркера @op: обязан входить в allowed(род категории).
 *
 * Честный хвост аудитора: немаркированные мутации ориентиров машинно не ловятся —
 * отчёт несёт слой `auditorTail` с текстом ограничения, отдельным от violations.
 *
 * @param {string} layerText
 * @param {{genera: Record<string,{allowed: string[]}>, categories: {name: string, genus: string}[]}} vocabulary
 * @returns {{valid: {term: string, effect: string}[],
 *   violations: {term: string, location: string, reason: string}[],
 *   auditorTail: string}}
 */
export function checkGenus(layerText, vocabulary) {
  const byName = new Map((vocabulary?.categories ?? []).map((c) => [c.name, c]));
  const valid = [];
  const violations = [];
  const lines = String(layerText ?? '').split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const m of line.matchAll(OP_MARKER_RE)) {
      const [, effect, term] = m;
      const cat = byName.get(term);
      if (!cat) {
        violations.push({ term, location: `строка ${idx + 1}`, reason: `@op:${effect} над необъявленной категорией` });
        continue;
      }
      const allowed = vocabulary?.genera?.[cat.genus]?.allowed ?? [];
      if (allowed.includes(effect)) valid.push({ term, effect });
      else {
        violations.push({
          term,
          location: `строка ${idx + 1}`,
          reason: `effect «${effect}» запрещён роду «${cat.genus}» (allowed: ${allowed.join(', ')})`,
        });
      }
    }
  });
  return {
    valid,
    violations,
    auditorTail:
      'немаркированные мутации ориентиров (без @op:) машинно не ловятся — смотрит аудитор (вердикт M2A)',
  };
}

/**
 * Генерация VOCABULARY.md из источника (проекция; руками не правится).
 * @param {{genera: Record<string,{lemma: string, allowed: string[]}>, categories: object[], extension?: string}} v
 * @returns {string}
 */
export function renderVocabularyMd(v) {
  const out = [
    '<!-- generated: yarn vocabulary:generate из docs/procedures/vocabulary.json — руками не править -->',
    '',
    '# VOCABULARY — словарь категорий процедурного слоя',
    '',
    `> ${v.extension ?? ''}`,
    '',
    '## Роды (леммы, вердикт m2a-rod)',
    '',
    '| Род | Лемма | Allowed |',
    '|-----|-------|---------|',
  ];
  for (const [name, g] of Object.entries(v.genera ?? {})) {
    out.push(`| ${name} | ${g.lemma} | \`${(g.allowed ?? []).join('`, `')}\` |`);
  }
  out.push('', '## Категории ядра (вердикт m2-vocabulary-r2)', '',
    '| Имя | Определение | Род | Маркер | Принадлежность |',
    '|-----|-------------|-----|--------|----------------|');
  for (const c of v.categories ?? []) {
    out.push(`| ${c.name} | ${c.definition} | ${c.genus} | \`${c.marker}\` | ${c.membership} |`);
  }
  out.push('');
  return out.join('\n');
}
