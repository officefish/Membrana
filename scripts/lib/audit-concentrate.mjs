/**
 * audit-concentrate — ядро сверки источников правды (спринт `audit-concentrate-v1`, #1238).
 *
 * Аудит дня — не сумма отчётов по источникам, а результат их СОПОСТАВЛЕНИЯ (слово владельца
 * 26.07). Концентрат = то, что осталось после сверки: подтверждённое сворачивается в строку,
 * интересны «заявлено без подтверждения» и «противоречия».
 *
 * Три категории и их смысл:
 *   confirmed  — о субъекте говорят ≥2 НЕЗАВИСИМЫХ источника, и говорят одно;
 *   unbacked   — сказано одним источником, второго свидетельства нет (класс зверя «Проза»);
 *   conflict   — источники говорят разное (высший приоритет разбора).
 *
 * Независимость объявляется явно: производный снимок не свидетельствует о своём источнике
 * (реестр и его проекция — один голос, а не два). Иначе счётчик подтверждений врёт.
 *
 * Ядро ЧИСТОЕ: ни fs, ни сети, ни `Date` внутри. День аудита и факты подаёт вызывающий —
 * поэтому отчёт воспроизводим: одинаковые снимки дают одинаковый вывод.
 */

/** @typedef {{subject: string, claim: string, source: string, date?: string|null, evidence?: string}} Fact */

/** Категории вывода; порядок = порядок разделов отчёта. */
export const VERDICTS = Object.freeze(['conflict', 'unbacked', 'confirmed']);

/**
 * Группы взаимозависимых источников: внутри группы голос ОДИН, сколько бы участников
 * ни говорило. Производные снимки объявлены здесь, а не выводятся эвристикой.
 */
export const DEPENDENCY_GROUPS = Object.freeze([
  ['tasks-registry', 'tasks-readme'],
  ['precedents', 'precedents-snapshot'],
  ['insights', 'insights-registry'],
]);

/**
 * Ключ независимости источника: имя группы, если источник в неё входит, иначе он сам.
 * @param {string} source
 * @returns {string}
 */
export function independenceKey(source) {
  for (const group of DEPENDENCY_GROUPS) {
    if (group.includes(source)) return `group:${group[0]}`;
  }
  return `src:${source}`;
}

/**
 * Нормализация факта: обязательны субъект, утверждение и источник. Пустое утверждение —
 * не факт (иначе в сверку попадут заглушки, зверь #1219).
 * @param {Partial<Fact>} raw
 * @returns {{ok: true, fact: Fact} | {ok: false, problem: string}}
 */
export function normalizeFact(raw) {
  const subject = typeof raw?.subject === 'string' ? raw.subject.trim() : '';
  const claim = typeof raw?.claim === 'string' ? raw.claim.trim() : '';
  const source = typeof raw?.source === 'string' ? raw.source.trim() : '';
  if (!subject) return { ok: false, problem: 'факт без субъекта' };
  if (!claim) return { ok: false, problem: `${subject}: пустое утверждение — не факт` };
  if (!source) return { ok: false, problem: `${subject}: факт без источника` };
  return {
    ok: true,
    fact: {
      subject,
      claim,
      source,
      date: typeof raw.date === 'string' && raw.date ? raw.date : null,
      evidence: typeof raw.evidence === 'string' ? raw.evidence : '',
    },
  };
}

/**
 * Сопоставление фактов по субъекту → вердикт на каждый субъект.
 *
 * @param {Partial<Fact>[]} rawFacts
 * @returns {{
 *   subjects: Array<{subject: string, verdict: 'conflict'|'unbacked'|'confirmed', claims: Array<{claim: string, sources: string[], evidence: string[]}>, voices: number}>,
 *   problems: string[]
 * }}
 */
export function reconcile(rawFacts) {
  const problems = [];
  /** @type {Map<string, Fact[]>} */
  const bySubject = new Map();

  for (const raw of rawFacts ?? []) {
    const n = normalizeFact(raw);
    if (!n.ok) {
      problems.push(n.problem);
      continue;
    }
    const list = bySubject.get(n.fact.subject) ?? [];
    list.push(n.fact);
    bySubject.set(n.fact.subject, list);
  }

  const subjects = [];
  for (const subject of [...bySubject.keys()].sort()) {
    const facts = bySubject.get(subject);

    /** @type {Map<string, {claim: string, sources: Set<string>, evidence: string[]}>} */
    const byClaim = new Map();
    for (const f of facts) {
      const entry = byClaim.get(f.claim) ?? { claim: f.claim, sources: new Set(), evidence: [] };
      entry.sources.add(f.source);
      if (f.evidence) entry.evidence.push(f.evidence);
      byClaim.set(f.claim, entry);
    }

    const claims = [...byClaim.values()]
      .map((c) => ({ claim: c.claim, sources: [...c.sources].sort(), evidence: c.evidence }))
      .sort((a, b) => a.claim.localeCompare(b.claim));

    // Голоса считаются по НЕЗАВИСИМЫМ источникам: производный снимок не удваивает свой источник.
    const voices = new Set(facts.map((f) => independenceKey(f.source))).size;

    let verdict;
    if (claims.length > 1) verdict = 'conflict';
    else if (voices >= 2) verdict = 'confirmed';
    else verdict = 'unbacked';

    subjects.push({ subject, verdict, claims, voices });
  }

  return { subjects, problems };
}

/**
 * Раскладка по разделам отчёта — в каноническом порядке (конфликты первыми).
 * @param {ReturnType<typeof reconcile>['subjects']} subjects
 * @returns {{conflict: object[], unbacked: object[], confirmed: object[]}}
 */
export function byVerdict(subjects) {
  const out = { conflict: [], unbacked: [], confirmed: [] };
  for (const s of subjects ?? []) out[s.verdict]?.push(s);
  return out;
}

/**
 * Отчёт-концентрат. Подтверждённое сворачивается в строку — интересны два других раздела.
 * Недоступные источники называются вслух: молчаливо сокращённая выдача запрещена (зверь B6).
 *
 * @param {{
 *   day: string,
 *   subjects: ReturnType<typeof reconcile>['subjects'],
 *   problems?: string[],
 *   unavailable?: Array<{source: string, why: string}>,
 * }} input
 * @returns {string}
 */
export function renderConcentrate({ day, subjects, problems = [], unavailable = [] }) {
  const groups = byVerdict(subjects ?? []);
  const lines = [`# Концентрат дня ${day}`, ''];

  if (unavailable.length > 0) {
    lines.push('> ⚠ **Сверка неполна** — источники недоступны:');
    for (const u of unavailable) lines.push(`> · ${u.source} — ${u.why}`);
    lines.push('');
  }

  lines.push('## Противоречия');
  lines.push('');
  if (groups.conflict.length === 0) {
    lines.push('_Противоречий не найдено._');
  } else {
    for (const s of groups.conflict) {
      lines.push(`### ${s.subject}`);
      for (const c of s.claims) {
        lines.push(`- **${c.claim}** — ${c.sources.join(', ')}${c.evidence.length ? ` (${c.evidence.join('; ')})` : ''}`);
      }
      lines.push('');
    }
  }
  lines.push('');

  lines.push('## Заявлено без подтверждения');
  lines.push('');
  if (groups.unbacked.length === 0) {
    lines.push('_Неподтверждённых утверждений нет._');
  } else {
    for (const s of groups.unbacked) {
      const c = s.claims[0];
      lines.push(`- **${s.subject}** — ${c.claim} (единственный голос: ${c.sources.join(', ')}${c.evidence.length ? `; ${c.evidence.join('; ')}` : ''})`);
    }
  }
  lines.push('');

  lines.push('## Подтверждённое');
  lines.push('');
  lines.push(
    groups.confirmed.length === 0
      ? '_Подтверждённых фактов нет — это само по себе находка._'
      : `${groups.confirmed.length} факт(ов) подтверждены двумя и более независимыми источниками.`,
  );

  if (problems.length > 0) {
    lines.push('', '## Брак входа', '');
    for (const p of problems) lines.push(`- ${p}`);
  }

  return lines.join('\n');
}
