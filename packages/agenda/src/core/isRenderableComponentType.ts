import type { JSXElementConstructor } from 'react';

/**
 * Узлы React: функция (FC), class, а также lazy / forwardRef / memo —
 * это объект с полем $$typeof, не `function`.
 */
export function isRenderableComponentType(
  c: unknown,
): c is JSXElementConstructor<unknown> {
  if (c == null) return false;
  if (typeof c === 'function') return true;
  return typeof c === 'object' && '$$typeof' in (c as object);
}
