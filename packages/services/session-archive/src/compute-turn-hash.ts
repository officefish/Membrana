import { createHash } from 'node:crypto';
import type { Turn } from './types.js';

/**
 * Детерминированный хеш turn'а (sha256).
 * Вычисляется по role + timestamp + content — после скруба.
 * Не зависит от uuid или sessionId (они могут меняться при реимпорте).
 */
export function computeTurnHash(turn: Turn): string {
  return createHash('sha256')
    .update(`${turn.role}:${turn.timestamp}:${turn.content}`)
    .digest('hex');
}
