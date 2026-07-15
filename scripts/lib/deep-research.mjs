/**
 * deep-research — каскад Perplexity по ЛЮБОМУ источнику с секцией
 * «Вопросы для research», не только по инсайту (#514).
 *
 * Переиспользует машинерию инсайт-ритуала целиком: парсер вопросов (#402),
 * гард от оборванных запросов, вызов Perplexity через прокси, каскад
 * API → MCP → руками. Второй реализации нет намеренно: у инсайтов она уже
 * отлажена, а копия разъехалась бы (как разъехались бы `pr:land` и `pr:ship`).
 *
 * Схема Landscape / Fit / Risk оставлена от инсайтов: она себя оправдала —
 * «что известно снаружи / как ложится на наш канон / чем аукнется».
 *
 * ВАЖНО: используется `parseResearchQuestions` (только ЯВНЫЕ вопросы), а не
 * `buildResearchQueries` с фолбэком по заголовку. Фолбэк осмыслен у инсайтов, но для
 * спринта он молча превратил бы отсутствие секции в три рана на «расскажи про X
 * вообще» — то есть ровно в шум, против которого этот флаг и опт-ин.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { findTruncatedQueries, parseResearchQuestions, perplexityAsk } from './insight-ritual.mjs';

export const RESEARCH_DIR = 'docs/tasks/research';

/** Путь выжимки по id задачи. */
export function researchPath(repoRoot, taskId) {
  return join(resolve(repoRoot), RESEARCH_DIR, `${taskId}.md`);
}

/**
 * Секция вопросов для промпта задачи (`task:register --research`).
 *
 * Заготовка, а не готовые вопросы: формулирует агент из контекста спринта — только
 * он знает, что здесь неизвестно. Пустая заготовка честнее выдуманных вопросов:
 * три сожжённых рана на «расскажи про X вообще» — это не ресёрч.
 */
export function researchSectionStub(task) {
  return [
    '',
    '## Вопросы для research (Q1–Q3)',
    '',
    `> Заполнить ДО \`yarn research ${task.id}\`. Вопрос — конкретный и самодостаточный:`,
    '> Perplexity ответит на что угодно, включая обрывок (инцидент 2026-07-12, #402).',
    '',
    '1. **Landscape:** <что уже известно снаружи по теме — подходы, инструменты, 2025–2026>',
    '2. **Fit (Membrana):** <как это ложится на наш канон и ограничения — конкретно, а не «подходит ли»>',
    '3. **Risk:** <чем аукнется: латентность, приватность, лицензии, поддержка, скорость команды>',
    '',
  ].join('\n');
}

/** Есть ли в тексте заполненная секция вопросов (а не плейсхолдеры заготовки). */
export function hasFilledResearchQuestions(md) {
  const queries = parseResearchQuestions(md);
  if (queries.length === 0) return false;
  // Плейсхолдеры вида «<что уже известно…>» — не вопрос.
  return !queries.some((q) => /<[^>]{10,}>/u.test(q.query));
}

/**
 * Прогнать ресёрч по markdown-источнику.
 *
 * @param {{ sourceMd: string, apiKey?: string, dryRun?: boolean, title?: string }} input
 * @returns {Promise<{ mode: string, queries: object[], markdown?: string }>}
 */
export async function runDeepResearch(input) {
  const queries = parseResearchQuestions(input.sourceMd);
  if (queries.length === 0) {
    throw new Error('Секция «Вопросы для research» не найдена или пуста.');
  }
  if (!hasFilledResearchQuestions(input.sourceMd)) {
    throw new Error('Вопросы не заполнены — в них остались плейсхолдеры <…>. Ран не тратим.');
  }
  // Гард #402: оборванный запрос неотличим от нормального — падаем ДО траты рана.
  const truncated = findTruncatedQueries(queries);
  if (truncated.length > 0) {
    throw new Error(
      'Вопросы выглядят оборванными — ран не тратим (#402):\n' +
        truncated.map((t) => `  ${t.key}: ${t.reason}`).join('\n'),
    );
  }

  if (input.dryRun) return { mode: 'dry-run', queries };

  if (!input.apiKey) {
    return { mode: 'manual', queries };
  }

  const sections = [];
  for (const item of queries) {
    const answer = await perplexityAsk(input.apiKey, item.query);
    sections.push(`## ${item.key} — ${item.label}\n\n**Запрос:** ${item.query}\n\n**Выжимка:**\n\n${answer}\n`);
  }
  const header = [
    `# RESEARCH: ${input.title ?? 'задача'}`,
    '',
    `> Сгенерировано \`yarn research\` (Perplexity API), ${new Date().toISOString().slice(0, 10)}.`,
    '> Выжимка — вход для решения, а не решение: проверяй утверждения по нашему коду.',
    '',
  ].join('\n');
  return { mode: 'perplexity-api', queries, markdown: `${header}${sections.join('\n')}` };
}

/** Записать выжимку, создав каталог. */
export function writeResearch(repoRoot, taskId, markdown) {
  const path = researchPath(repoRoot, taskId);
  if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, markdown, 'utf8');
  return path;
}

/** Прочитать промпт задачи по карточке реестра. */
export function readTaskPrompt(repoRoot, task) {
  const path = resolve(repoRoot, task.promptPath);
  if (!existsSync(path)) throw new Error(`Промпт задачи не найден: ${task.promptPath}`);
  return readFileSync(path, 'utf8');
}
