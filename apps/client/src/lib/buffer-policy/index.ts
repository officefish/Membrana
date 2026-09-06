/**
 * Публичная поверхность читателя политики переполнения (#2308, блок B). Подключение к живому
 * `getQuota()` и к плагину записи — адаптер интеграции (B↔C), здесь его нет намеренно.
 */
export { createBufferPolicyReader } from './bufferPolicyReader';
export type { BufferPolicyReader, BufferPolicySourceFn } from './bufferPolicyReader';
export { effectiveBufferPolicy, parseBufferPolicy } from './effectiveBufferPolicy';
export {
  BUFFER_POLICY_MODES,
  SMART_CLEANUP_SELECTIONS,
  STOP_POLICY,
  type BufferPolicy,
  type BufferPolicyMode,
  type BufferPolicySource,
  type EffectiveBufferPolicy,
  type SmartCleanupParams,
  type SmartCleanupSelection,
} from './types';
