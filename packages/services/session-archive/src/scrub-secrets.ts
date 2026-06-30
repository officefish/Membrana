import { SECRET_PATTERNS, SECRET_REDACTION_PLACEHOLDER } from '@membrana/core';
import type { Turn } from './types.js';

/**
 * Заменяет все найденные секреты в content turn'а на плейсхолдер.
 * Паттерны берутся из @membrana/core (SECRET_PATTERNS) плюс опциональные extra.
 */
export function scrubSecrets(turn: Turn, extraPatterns: readonly RegExp[] = []): Turn {
  const patterns = [...SECRET_PATTERNS, ...extraPatterns];
  let content = turn.content;
  let wasRedacted = false;

  for (const pattern of patterns) {
    // Сбрасываем lastIndex — паттерны с флагом /g сохраняют позицию между вызовами
    pattern.lastIndex = 0;
    const replaced = content.replace(pattern, SECRET_REDACTION_PLACEHOLDER);
    if (replaced !== content) {
      wasRedacted = true;
      content = replaced;
      pattern.lastIndex = 0;
    }
  }

  if (!wasRedacted) return turn;
  return { ...turn, content, wasRedacted: true };
}
