import { isPlainObject, type ShapeViolation } from './shape-violation.js';

/**
 * Обёртка списка наружу — ровно четыре поля (вердикт M2).
 *
 * `totalPages` внутреннего `PaginatedSamples` наружу НЕ едет: производное число, посчитанное
 * дверью, способно разойтись с `total` ровно так же, как флаг.
 */
export const PAGE_ENVELOPE_FIELDS = ['items', 'total', 'page', 'limit'] as const;

export type PageEnvelopeField = (typeof PAGE_ENVELOPE_FIELDS)[number];

/**
 * Имена, которыми обычно называют флаг полноты. Флага в контракте НЕТ намеренно: он второе
 * высказывание о том же факте и способен солгать. Список нужен, чтобы валидатор назвал
 * нарушение своим именем.
 */
export const COMPLETENESS_FLAG_FIELDS = [
  'hasMore',
  'hasNext',
  'hasNextPage',
  'more',
  'nextPage',
  'isLast',
  'isLastPage',
] as const;

export type CompletenessFlagField = (typeof COMPLETENESS_FLAG_FIELDS)[number];

export interface PageEnvelope<T> {
  readonly items: readonly T[];
  readonly total: number;
  /** 1-based. */
  readonly page: number;
  readonly limit: number;
}

/** Числа страницы, приходящие от выемки (соседний блок M4). */
export interface PageNumbers {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

const ALLOWED: ReadonlySet<string> = new Set<string>(PAGE_ENVELOPE_FIELDS);
const FLAGS: ReadonlySet<string> = new Set<string>(COMPLETENESS_FLAG_FIELDS);

/** Сборка обёртки — тоже allow-list: посторонним полям взяться неоткуда. */
export function toPageEnvelope<T>(items: readonly T[], numbers: PageNumbers): PageEnvelope<T> {
  return { items, total: numbers.total, page: numbers.page, limit: numbers.limit };
}

/**
 * Валидатор обёртки. Пустой массив — форма верна.
 *
 * Отдельно называет `completeness-flag`: отсутствие `hasMore` — проверяемое свойство, а не
 * описанное.
 */
export function validatePageEnvelopeShape(value: unknown): ShapeViolation[] {
  if (!isPlainObject(value)) {
    return [{ kind: 'not-an-object', field: '$', detail: 'обёртка списка должна быть объектом' }];
  }

  const violations: ShapeViolation[] = [];

  for (const key of Object.keys(value)) {
    if (FLAGS.has(key)) {
      violations.push({
        kind: 'completeness-flag',
        field: key,
        detail: 'флага полноты в контракте нет: читатель вычисляет её сам по items/total/page/limit',
      });
      continue;
    }
    if (!ALLOWED.has(key)) {
      violations.push({ kind: 'unknown-field', field: key });
    }
  }

  for (const field of PAGE_ENVELOPE_FIELDS) {
    if (!(field in value)) {
      violations.push({ kind: 'missing-field', field });
      continue;
    }
    const actual = value[field];
    if (field === 'items') {
      if (!Array.isArray(actual)) {
        violations.push({ kind: 'invalid-value', field, detail: 'items — массив' });
      }
      continue;
    }
    if (typeof actual !== 'number' || !Number.isFinite(actual)) {
      violations.push({ kind: 'invalid-value', field, detail: 'число' });
    }
  }

  return violations;
}

/**
 * Форма обёртки, достаточная для вычисления полноты. Специально структурная: читатель
 * снаружи считает по разобранному JSON, не имея наших типов.
 */
export interface CompletenessInput {
  readonly items: { readonly length: number };
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

/**
 * Вердикт M2, дословно: `items.length === limit && page * limit < total` → есть следующая.
 */
export function hasNextPage(envelope: CompletenessInput): boolean {
  return envelope.items.length === envelope.limit && envelope.page * envelope.limit < envelope.total;
}

/**
 * Вердикт M2, дословно: `items.length < limit` → страница последняя.
 *
 * Это ДОСТАТОЧНОЕ основание, но не единственное: ровно полная последняя страница
 * (`items.length === limit && page * limit === total`) короткой не является. Полное решение —
 * {@link isLastPage}.
 */
export function isShortPage(envelope: CompletenessInput): boolean {
  return envelope.items.length < envelope.limit;
}

/**
 * Полное решение читателя: страница последняя ровно тогда, когда следующей нет.
 *
 * Держит импликацию `isShortPage → isLastPage` и закрывает случай ровно полной последней
 * страницы, о котором пара правил вердикта молчит.
 */
export function isLastPage(envelope: CompletenessInput): boolean {
  return !hasNextPage(envelope);
}
