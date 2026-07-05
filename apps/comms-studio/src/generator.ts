/**
 * CC9 — детерминированный генератор первого выхода v0.1.
 *
 * Подключается к seam `generate` агента (CC8). Читает канон ЖИВЬЁМ (GLOSSARY.md) и производит
 * брифы по ключевым компонентам продукта — то, что партнёр описывает во внешних материалах.
 * Термин и определение извлекаются из таблицы GLOSSARY §1 (не хардкод); если термина в каноне
 * нет — бриф это помечает, а не выдумывает.
 *
 * Storybook в репозитории отсутствует, поэтому «сверка против Storybook/UI» из DoD адаптирована
 * к сверке против канона (GLOSSARY/FACTS_SHEET) — единственного источника истины для контура.
 * LLM-генератор может заменить этот детерминированный на том же seam.
 */
import { canonText, type CanonContext } from './canon.js';
import type { Artifact } from './agent.js';

const GLOSSARY_PATH = 'docs/comms/canon/GLOSSARY.md';

/** Ключевые компоненты продукта для первого выхода (термин = ключ поиска в GLOSSARY §1). */
export const V01_COMPONENTS: readonly { slug: string; term: string }[] = [
  { slug: 'sensornyy-uzel', term: 'сенсорный узел' },
  { slug: 'semeystvo-detektorov', term: 'семейство детекторов' },
  { slug: 'stage-gate', term: 'stage-gate' },
  { slug: 'nablyudatelnaya-sistema', term: 'наблюдательная система' },
  { slug: 'tdoa-lokalizaciya', term: 'локализация по разнице времён прихода' },
];

export interface GlossaryEntry {
  readonly say: string;
  readonly avoid: string;
  readonly meaning: string;
}

/**
 * Живой поиск термина в таблице GLOSSARY §1 (`| Говорим | НЕ говорим | Что значит |`).
 * @returns запись или null, если термин не найден в каноне.
 */
export function lookupGlossaryTerm(glossaryText: string, term: string): GlossaryEntry | null {
  // Префикс `**<term>` — термин сразу после открывающего жирного (робастно к суффиксам вида «(TDOA)»).
  const needle = `**${term}`;
  for (const line of glossaryText.split(/\r?\n/)) {
    if (!line.includes('|') || !line.includes(needle)) continue;
    const cells = line.split('|').map((c) => c.trim());
    // Строка таблицы: ['', say, avoid, meaning, ''] → нужны индексы 1..3.
    if (cells.length < 5) continue;
    return { say: cells[1]!, avoid: cells[2]!, meaning: cells[3]! };
  }
  return null;
}

function briefFor(term: string, entry: GlossaryEntry | null): string {
  if (!entry) {
    return [
      `# ${term}`,
      '',
      `> Определение отсутствует в каноне (GLOSSARY §1). Бриф не заполняется до правки канона —`,
      `> контур не выдумывает формулировку.`,
      '',
    ].join('\n');
  }
  return [
    `# ${term}`,
    '',
    entry.meaning,
    '',
    `**Терминология.** Говорим: ${entry.say}. Не говорим: ${entry.avoid}.`,
    '',
    `Источник: живое чтение \`${GLOSSARY_PATH}\`. Факты и цифры — из \`FACTS_SHEET.md\`;`,
    `неподтверждённые метрики на внешний материал не выносятся.`,
    '',
  ].join('\n');
}

/**
 * Seam-генератор: читает канон живьём и возвращает брифы v0.1 для записи в out/v0.1/.
 * Детерминирован; тон-чистота обеспечивается тем, что брифы построены из канона (уже чистого),
 * а `out-writer` дополнительно прогоняет tone-guard на записи.
 */
export function describeComponents(canon: CanonContext): Artifact[] {
  const glossary = canonText(canon, GLOSSARY_PATH) ?? '';
  const artifacts: Artifact[] = [];
  for (const { slug, term } of V01_COMPONENTS) {
    const entry = lookupGlossaryTerm(glossary, term);
    artifacts.push({ name: `v0.1/${slug}.md`, content: briefFor(term, entry) });
  }
  // Индекс выхода — оглавление для монитора партнёра.
  const index = [
    '# Выход контура — v0.1',
    '',
    'Брифы ключевых компонентов продукта, произведённые из живого канона (GLOSSARY/FACTS_SHEET).',
    'Партнёр читает их через монитор `out/**` и экспортирует в Drive для ручной доводки.',
    '',
    ...V01_COMPONENTS.map((c) => `- [${c.term}](./${c.slug}.md)`),
    '',
  ].join('\n');
  artifacts.push({ name: 'v0.1/INDEX.md', content: index });
  return artifacts;
}
