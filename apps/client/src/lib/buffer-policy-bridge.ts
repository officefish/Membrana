/**
 * МОСТ B↔C: эффективная политика переполнения прибора под именами, которых ждал носитель
 * удержания (адаптер BC-1 контракта интеграции `cowork-buffer-full-stop`, #2308/#2309).
 *
 * Слева — читатель блока B (`lib/buffer-policy`): чистый разбор ответа `/quota`, `stop` до
 * первого чтения и на любой дыре, подписка по факту смены. Справа — то, что спрашивают плагин
 * микрофона и локальный страж C: `getEffectiveOverflowPolicy()` синхронно и
 * `subscribeEffectiveOverflowPolicy(listener)`.
 *
 * Источник — сырой `GET /quota` серверного бэкенда (`ServerStorageBackend.getQuotaRaw()`):
 * `getQuota()` поле политики отбрасывает. Читатель в сеть сам не ходит — частоту задают
 * штатное чтение квоты и vitals C (≥ 1/мин при удержании): `mediaLibraryHubBridge` зовёт
 * `refreshEffectiveOverflowPolicy()` перед каждой публикацией квоты, так что страж судит по
 * политике, прочитанной в том же цикле. Без серверного бэкенда (автономный / Electron /
 * browser-fallback) источника нет → `sync_failed` → `stop`: у прибора без сервера политики нет.
 */
import { ServerStorageBackend, type IStorageBackend } from '@membrana/media-library-service';
import type { OverflowPolicy } from '@membrana/plugin-contracts';

import {
  createBufferPolicyReader,
  type BufferPolicyReader,
  type BufferPolicySourceFn,
  type EffectiveBufferPolicy,
} from '@/lib/buffer-policy';

const NO_SOURCE: BufferPolicySourceFn = () =>
  Promise.reject(new Error('buffer-policy: источник /quota не привязан — серверного бэкенда нет'));

let source: BufferPolicySourceFn = NO_SOURCE;
let reader: BufferPolicyReader = createBufferPolicyReader(() => source());

/** Привязать читателя к бэкенду библиотеки; не-серверный бэкенд = источника нет (→ `stop`). */
export function bindBufferPolicySourceToBackend(backend: IStorageBackend): void {
  source = backend instanceof ServerStorageBackend ? () => backend.getQuotaRaw() : NO_SOURCE;
}

/** Одно чтение источника. Никогда не бросает: дыра синка — это `stop`, не исключение. */
export function refreshEffectiveOverflowPolicy(): Promise<EffectiveBufferPolicy> {
  return reader.refresh();
}

/** Что прибор обязан исполнять сейчас — синхронно, из кеша читателя (вход C). */
export function getEffectiveOverflowPolicy(): OverflowPolicy {
  return reader.current().policy.mode;
}

/** Полная форма (режим + параметры + причина значения) — для панели и окна оператора. */
export function getEffectiveBufferPolicy(): EffectiveBufferPolicy {
  return reader.current();
}

/** Подписка на смену режима (вход C): зовётся по факту смены значения читателя. */
export function subscribeEffectiveOverflowPolicy(listener: (policy: OverflowPolicy) => void): () => void {
  return reader.subscribe((next) => listener(next.policy.mode));
}

/** Тесты: подставить источник и сразу прочитать его. Порча источника → `stop`. */
export function setBufferPolicySourceForTests(next: BufferPolicySourceFn): Promise<EffectiveBufferPolicy> {
  source = next;
  return reader.refresh();
}

/** Тесты: сбросить читателя в состояние «ни одного чтения» и отвязать источник. */
export function resetBufferPolicyBridgeForTests(): void {
  source = NO_SOURCE;
  reader = createBufferPolicyReader(() => source());
}
