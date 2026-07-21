/**
 * Статусная механика скиллов (вердикт заседания angelina-hostess M1-C, 21.07).
 *
 * Каждый скилл несёт фронт-маттер `status: live | deprecated | superseded`; при
 * `superseded` обязателен `supersededBy: <path>` на существующий live-скилл. Цепочка
 * supersededBy — DAG с live-терминалом (цикл запрещён). Холодная сессия при superseded
 * обязана перейти по ссылке — тело не читается.
 *
 * Чистое ядро: функции от текста/структур, без fs (io — у вызывающего/гейта).
 */

export const SKILL_STATUSES = Object.freeze(['live', 'deprecated', 'superseded']);

/**
 * Разбор фронт-маттера скилла: status + supersededBy (+ name). Без YAML-парсера —
 * дисциплинированный построчный разбор верхнего блока `--- ... ---`.
 * @param {string} md
 * @returns {{name: string|null, status: string|null, supersededBy: string|null}}
 */
export function parseSkillFrontMatter(md) {
  const m = String(md ?? '').match(/^---\r?\n([\s\S]*?)\r?\n---/u);
  const out = { name: null, status: null, supersededBy: null };
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(name|status|supersededBy):\s*(.+?)\s*$/u);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}

/**
 * Свежесть скилла (M1): читать тело можно только у live без supersededBy.
 * @param {{status?: string|null, supersededBy?: string|null}} fm
 * @returns {boolean}
 */
export function freshSkill(fm) {
  return fm?.status === 'live' && !fm?.supersededBy;
}

/**
 * Проблемы графа статусов по множеству скиллов.
 *  - статус отсутствует/неизвестен;
 *  - superseded без supersededBy;
 *  - supersededBy указывает на несуществующий скилл;
 *  - цепочка supersededBy не заканчивается live-терминалом;
 *  - цикл в цепочке.
 * @param {Record<string, {status?: string|null, supersededBy?: string|null}>} skills имя → фронт-маттер
 * @returns {string[]} пусто = граф здоров
 */
export function skillGraphProblems(skills) {
  const problems = [];
  for (const [name, fm] of Object.entries(skills ?? {})) {
    if (!fm.status || !SKILL_STATUSES.includes(fm.status)) {
      problems.push(`${name}: статус отсутствует или неизвестен («${fm.status ?? '—'}»)`);
      continue;
    }
    if (fm.status === 'superseded' && !fm.supersededBy) {
      problems.push(`${name}: superseded без supersededBy`);
    }
  }
  // Цепочки: существование цели, live-терминал, ацикличность.
  for (const [name, fm] of Object.entries(skills ?? {})) {
    if (!fm.supersededBy) continue;
    const seen = new Set([name]);
    let cur = fm.supersededBy;
    while (cur) {
      if (!(cur in skills)) {
        problems.push(`${name}: supersededBy ведёт на несуществующий «${cur}»`);
        break;
      }
      if (seen.has(cur)) {
        problems.push(`${name}: цикл в цепочке supersededBy через «${cur}»`);
        break;
      }
      seen.add(cur);
      const next = skills[cur];
      if (!next.supersededBy) {
        if (next.status !== 'live') {
          problems.push(`${name}: цепочка supersededBy заканчивается не-live терминалом «${cur}» (${next.status})`);
        }
        break;
      }
      cur = next.supersededBy;
    }
  }
  return problems;
}

/**
 * Три предиката разбиения (Дынин, M1): при выделении утра из общего скилла
 * ни один шаг не потерян, нет двойного источника, нет сирот.
 * @param {Iterable<string>} allSteps исходное множество шагов S
 * @param {Iterable<string>} morningSteps S_morning
 * @param {Iterable<string>} daySteps S_day
 * @returns {{covered: boolean, disjoint: boolean, noOrphans: boolean, problems: string[]}}
 */
export function partitionPredicates(allSteps, morningSteps, daySteps) {
  const S = new Set(allSteps);
  const M = new Set(morningSteps);
  const D = new Set(daySteps);
  const problems = [];

  const union = new Set([...M, ...D]);
  const covered = [...S].every((s) => union.has(s));
  if (!covered) problems.push(`потеряны шаги: ${[...S].filter((s) => !union.has(s)).join(', ')}`);

  const overlap = [...M].filter((s) => D.has(s));
  const disjoint = overlap.length === 0;
  if (!disjoint) problems.push(`двойной источник истины: ${overlap.join(', ')}`);

  const orphans = [...union].filter((s) => !S.has(s));
  const noOrphans = orphans.length === 0;
  if (!noOrphans) problems.push(`сироты (нет в исходном S): ${orphans.join(', ')}`);

  return { covered, disjoint, noOrphans, problems };
}

/** Утренние маркеры, запрещённые в live-скиллах кроме morning-ritual (M1, гейт). */
export const MORNING_MARKERS = Object.freeze([
  'yarn ritual:day',
  'yarn plan:day',
  'yarn standup',
  'yarn main-day-issue',
  'yarn telegram:digest:day',
]);

/**
 * Нарушения запрета утренних шагов: live-скилл (кроме morning-ritual) несёт утренний
 * маркер как ИНСТРУКЦИЮ. Ссылка-указатель («утро → morning-ritual») нарушением не
 * является — ловим только командные маркеры.
 * @param {Record<string, {fm: {status?: string|null}, body: string}>} skills имя → {fm, body}
 * @returns {string[]}
 */
export function morningLeakProblems(skills) {
  const problems = [];
  for (const [name, { fm, body }] of Object.entries(skills ?? {})) {
    if (name === 'membrana-morning-ritual') continue;
    if (fm?.status !== 'live') continue;
    for (const marker of MORNING_MARKERS) {
      if (String(body ?? '').includes(marker)) {
        problems.push(`${name}: live-скилл несёт утренний маркер «${marker}» — утро живёт только в morning-ritual`);
      }
    }
  }
  return problems;
}
