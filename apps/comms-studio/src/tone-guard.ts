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

/**
 * Военная риторика. GLOSSARY §3 / system prompt. «удар» намеренно исключён как самый
 * ложно-срабатывающий стем (ударение/удары дождя) — CC8-review P2; военный удар покрыт
 * «поражение»/«уничтожение»/«военн».
 */
const MILITARY = [
  'поле боя',
  'противник',
  'вооружённые силы',
  'вооруженные силы',
  'военн',
  'поражение',
  'уничтожение',
];

const EMOJI_RE = /\p{Extended_Pictographic}/u;

/** Экранирует спецсимволы regex в терме. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Строит regex со ЛЕВОЙ границей слова (не матчит середину слова, напр. «псевдоинноваци»),
 * стем открыт справа (суффиксы намеренно ловятся: «инноваци» → «инновация/инновационный»).
 */
function boundaryRe(term: string): RegExp {
  return new RegExp('(?<![\\p{L}\\p{N}])' + escapeRe(term), 'iu');
}

const HYPE_RE = HYPE.map((t) => ({ term: t, re: boundaryRe(t) }));
const MILITARY_RE = MILITARY.map((t) => ({ term: t, re: boundaryRe(t) }));

function scanTerms(
  line: string,
  terms: readonly { term: string; re: RegExp }[],
  category: ToneCategory,
  lineNo: number,
): ToneViolation[] {
  const out: ToneViolation[] = [];
  for (const { term, re } of terms) {
    if (re.test(line)) out.push({ category, term, line: lineNo });
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
    violations.push(...scanTerms(line, HYPE_RE, 'hype', lineNo));
    violations.push(...scanTerms(line, MILITARY_RE, 'military', lineNo));
    if (EMOJI_RE.test(line)) violations.push({ category: 'emoji', term: 'emoji', line: lineNo });
  }
  return violations;
}

/** Форматирует нарушения в человекочитаемый отчёт. */
export function formatToneViolations(violations: readonly ToneViolation[]): string {
  return violations.map((v) => `  [${v.category}] «${v.term}» — строка ${v.line}`).join('\n');
}
