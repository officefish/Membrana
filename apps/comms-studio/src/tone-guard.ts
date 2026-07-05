/**
 * CC8 — tone-guard: применение канона формы к ВЫХОДУ контура на этапе рендера.
 *
 * Правила — из `docs/comms/canon/GLOSSARY.md` §3 и `docs/foundation/CLAUDE_PROJECT_SYSTEM_PROMPT.md`
 * (запрещённые слова: хайп + военная риторика; эмодзи в выходных документах — запрещены).
 * Guard детерминированный: любое совпадение → нарушение; писатель (`out-writer`) отказывает в записи.
 *
 * Инструмент рендерит канон, не отменяет его: guard не переписывает текст, а блокирует нарушающий.
 */

export type ToneCategory = 'hype' | 'military' | 'emoji';

export interface ToneViolation {
  readonly category: ToneCategory;
  readonly term: string;
  readonly line: number;
}

/** Хайповые/маркетинговые штампы (стемы, регистронезависимо). GLOSSARY §3. */
const HYPE = [
  'революционн',
  'прорывн',
  'беспрецедентн',
  'уникальн',
  'не имеет аналогов',
  'единственное решение',
  'изменит мир',
  'новая эра',
  'следующее поколение',
  'трансформир',
  'синергия',
  'экосистема',
  'парадигма',
  'дисрапт',
  'инноваци',
  'передов',
  'ai-powered',
  'искусственный интеллект',
];

/** Военная риторика. GLOSSARY §3 / system prompt. */
const MILITARY = [
  'поле боя',
  'противник',
  'вооружённые силы',
  'вооруженные силы',
  'военн',
  'удар',
  'поражение',
  'уничтожение',
];

const EMOJI_RE = /\p{Extended_Pictographic}/u;

function scanTerms(line: string, terms: readonly string[], category: ToneCategory, lineNo: number): ToneViolation[] {
  const lower = line.toLowerCase();
  const out: ToneViolation[] = [];
  for (const term of terms) {
    if (lower.includes(term)) out.push({ category, term, line: lineNo });
  }
  return out;
}

/**
 * Проверяет ВЫХОДНОЙ текст на нарушения канона формы.
 * @returns список нарушений (пусто = чисто).
 */
export function checkTone(text: string): ToneViolation[] {
  const violations: ToneViolation[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNo = i + 1;
    violations.push(...scanTerms(line, HYPE, 'hype', lineNo));
    violations.push(...scanTerms(line, MILITARY, 'military', lineNo));
    if (EMOJI_RE.test(line)) violations.push({ category: 'emoji', term: 'emoji', line: lineNo });
  }
  return violations;
}

/** Форматирует нарушения в человекочитаемый отчёт. */
export function formatToneViolations(violations: readonly ToneViolation[]): string {
  return violations.map((v) => `  [${v.category}] «${v.term}» — строка ${v.line}`).join('\n');
}
