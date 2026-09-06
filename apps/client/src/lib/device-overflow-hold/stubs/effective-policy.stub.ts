/**
 * СТАБ читателя эффективной политики блока B (`overflow-policy`, #2308) — умирает на интеграции.
 *
 * Прибор узнаёт политику от сервера (M1); каким полем и по какому каналу — решает B. До
 * интеграции блок C читает политику отсюда: умолчание и любая дыра — `stop`. Плагинное поле
 * `bufferPolicy` (зеркало B) носитель удержания НЕ читает — это не источник.
 */
import type { OverflowHoldPolicy } from '../types';

let effectivePolicyStub: OverflowHoldPolicy = 'stop';

export function getEffectiveOverflowPolicyStub(): OverflowHoldPolicy {
  return effectivePolicyStub;
}

/** Тесты: подменить эффективную политику; порча (`auto-cleanup`, мусор) → `stop`. */
export function setEffectiveOverflowPolicyStubForTests(value: unknown): void {
  effectivePolicyStub = value === 'smart_cleanup' ? 'smart_cleanup' : 'stop';
}
