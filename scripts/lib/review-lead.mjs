/**
 * Ведущий код-ревью (день-спринт code-review-lead-refactor; тезисы T3/T4 шторма
 * branch-taxonomy 21.07): ревью ведёт ОДИН из пяти, назначенный главным. Он
 * проверяет дифф на антипаттерны (бестиарий, T5) и выносит пропуск/блок; на
 * ревью работает его персональная память (T4).
 *
 * Каскад назначения — зеркало K2 таксономии (явное слово → карточка → скоуп →
 * Teamlead), с той разницей, что здесь ревью, а не ветка: явное слово владельца >
 * leadPersona активной карточки, чей id виден в ветке/диффе > маппинг
 * скоуп→персона по путям диффа > Teamlead + громкая пометка «вне конвенции».
 *
 * ГРАНИЦА: грамматику имён веток (resolveHolder, Р4 #785) этот модуль НЕ парсит —
 * это соседний спринт; здесь только подстрочное совпадение id карточки.
 *
 * Чистые функции без fs/сети/git — все снимки передаёт вызывающий.
 */

/** Пять персон команды. Ведущим может быть только один из них. */
export const PERSONAS = Object.freeze(['vesnin', 'ozhegov', 'dynin', 'kuryokhin', 'rodchenko']);

/**
 * Маппинг скоупа (префикс/маркер пути) → персона. Порядок важен: первый матч
 * побеждает; сила — из таблицы ролей VIRTUAL_TEAM_PROMPT.
 */
export const SCOPE_TO_PERSONA = Object.freeze([
  { re: /packages\/services\/detectors\/|fft|\/math\//u, persona: 'dynin' },
  { re: /audio|webaudio|recorder|effects/iu, persona: 'kuryokhin' },
  { re: /\.tsx$|apps\/client\/src\/(components|plugins)\//u, persona: 'rodchenko' },
  { re: /packages\/services\/|packages\/libs\/|\/hooks\//u, persona: 'ozhegov' },
  { re: /scripts\/|docs\/|\.github\/|package\.json$/u, persona: 'vesnin' },
]);

/**
 * Назначение ведущего ревью. Возвращает и ОСНОВАНИЕ — назначение без названного
 * основания это ровно «молчаливый роутинг», против которого T2/K2.
 *
 * @param {{
 *   explicit?: string|null,
 *   branch?: string|null,
 *   diffPaths?: string[],
 *   activeTasks?: Array<{id: string, leadPersona?: string|null}>,
 * }} input
 * @returns {{persona: string, basis: string, outOfConvention: boolean}}
 */
export function resolveReviewLead({ explicit = null, branch = null, diffPaths = [], activeTasks = [] } = {}) {
  if (explicit && PERSONAS.includes(explicit)) {
    return { persona: explicit, basis: 'явное слово владельца', outOfConvention: false };
  }

  // Карточка, чей id виден в имени ветки или путях диффа, отдаёт своего ведущего.
  const haystack = [branch ?? '', ...diffPaths].join('\n');
  for (const t of activeTasks) {
    if (t?.id && t.leadPersona && PERSONAS.includes(t.leadPersona) && haystack.includes(t.id)) {
      return { persona: t.leadPersona, basis: `leadPersona карточки «${t.id}»`, outOfConvention: false };
    }
  }

  // Скоуп-маппинг: голосуют пути диффа, побеждает большинство (при равенстве —
  // порядок SCOPE_TO_PERSONA как приоритет силы).
  const votes = new Map();
  for (const p of diffPaths) {
    const hit = SCOPE_TO_PERSONA.find((s) => s.re.test(p));
    if (hit) votes.set(hit.persona, (votes.get(hit.persona) ?? 0) + 1);
  }
  if (votes.size > 0) {
    const ranked = [...votes.entries()].sort(
      (a, b) => b[1] - a[1]
        || SCOPE_TO_PERSONA.findIndex((s) => s.persona === a[0]) - SCOPE_TO_PERSONA.findIndex((s) => s.persona === b[0]),
    );
    const [persona, n] = ranked[0];
    return { persona, basis: `скоуп диффа (${n} из ${diffPaths.length} путей)`, outOfConvention: false };
  }

  return { persona: 'vesnin', basis: 'вне конвенции — ни карточки, ни скоупа; Teamlead по умолчанию', outOfConvention: true };
}

/**
 * Блок ведущего для промпта ревью: кто ведёт, на каком основании, его память и
 * бестиарий. Обязанность ведущего (T3) названа явно: пропуск или блок.
 * @param {{persona: string, basis: string, memoryExcerpt?: string, bestiary?: string}} p
 * @returns {string}
 */
export function formatLeadBlock({ persona, basis, memoryExcerpt = '', bestiary = '' }) {
  const parts = [
    '## Ведущий ревью (T3 — назначенный главный)',
    '',
    `Это ревью ведёт **${persona}** (основание: ${basis}).`,
    'Ведущий проверяет дифф на антипаттерны бестиария и выносит вердикт',
    '**пропуск или блок** — его строка в ответе обязательна и идёт первой.',
  ];
  if (memoryExcerpt.trim()) {
    parts.push('', '### Память ведущего (T4 — работает на ревью)', '', memoryExcerpt.trim());
  }
  if (bestiary.trim()) {
    parts.push('', '### Бестиарий антипаттернов (T5 — чек-лист ведущего)', '', bestiary.trim());
  }
  return parts.join('\n');
}
