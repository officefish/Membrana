import { computeTurnHash } from './compute-turn-hash.js';
import type { Turn } from './types.js';

/**
 * Удаляет дубликаты: если два turn'а дают одинаковый hash (role+timestamp+content),
 * сохраняется только первый встреченный.
 * Вызывать после scrubSecrets — хеш должен быть по скрубленному тексту.
 */
export function deduplicateTurns(turns: readonly Turn[]): Turn[] {
  const seen = new Set<string>();
  const result: Turn[] = [];
  for (const turn of turns) {
    const hash = computeTurnHash(turn);
    if (!seen.has(hash)) {
      seen.add(hash);
      result.push(turn);
    }
  }
  return result;
}
