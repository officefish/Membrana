/**
 * Мост привязки → владелец эпизода удержания (#2463).
 *
 * Носитель удержания живёт дольше любой привязки: он синглтон уровня приложения и читает
 * эпизод из хранилища синхронно, ещё до того как известно, к какой мембране прибор привязан.
 * Мост — единственное место, откуда носитель узнаёт владельца: он читает ту же стору связи,
 * что и библиотека, журнал и канал узла (`NodeConnectionShell` → `reconfigure*`), и сообщает
 * владельца при каждом изменении привязки.
 *
 * Своей памяти о привязке у моста нет и решения он не принимает: судит `hold.reconcileOwner`.
 */
import { useNodeConnectionStore } from '@/stores/nodeConnectionStore';
import type { NodeConnectionMode, PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import type { DeviceOverflowHold, OverflowHoldOwner } from './types';

/**
 * Привязка → владелец. `null` (не судить) возвращается ровно тогда, когда владелец ЕЩЁ
 * неизвестен: стора не поднята (в Студии привязка лежит в шифртексте, ADR-0028 Р4), режим
 * не выбран, либо в кредах нет мембраны/прибора — подписывать таким нечем. Неизвестность
 * никогда не снимает удержание, поэтому «не знаю» обязано быть отличимо от «автономный».
 */
export function resolveOverflowHoldOwner(
  hydrated: boolean,
  mode: NodeConnectionMode | null,
  pairing: PairedNodeCredentials | null,
): OverflowHoldOwner | null {
  if (!hydrated) return null;
  if (mode === 'autonomous') return { kind: 'autonomous' };
  if (mode !== 'paired' || pairing === null) return null;
  const { membraneId, deviceId } = pairing;
  if (typeof membraneId !== 'string' || membraneId.length === 0) return null;
  if (typeof deviceId !== 'string' || deviceId.length === 0) return null;
  return { kind: 'membrane', membraneId, deviceId };
}

function reconcileFromStore(hold: DeviceOverflowHold): void {
  const { hydrated, mode, pairing } = useNodeConnectionStore.getState();
  hold.reconcileOwner(resolveOverflowHoldOwner(hydrated, mode, pairing));
}

/** Одна подписка на носитель: мост зовут и синглтон, и проводка — второй не плодит третью. */
const bridged = new WeakMap<DeviceOverflowHold, () => void>();

/**
 * Поставить мост: сверить владельца сейчас же (эпизод мог быть поднят из хранилища до
 * подъёма привязки) и дальше — на каждое изменение связи. Возвращает снятие подписки.
 */
export function startOverflowHoldOwnerBridge(hold: DeviceOverflowHold): () => void {
  if (bridged.has(hold)) {
    // Повторный вызов — не вторая подписка, но сверку прогнать надо: привязка могла измениться.
    reconcileFromStore(hold);
    // Снять ЧУЖУЮ подписку второй вызывающий права не имеет: иначе dispose плагина микрофона
    // оставил бы синглтон приложения без сверки владельца до конца жизни процесса.
    return () => {};
  }
  reconcileFromStore(hold);
  const unsubscribe = useNodeConnectionStore.subscribe(() => {
    reconcileFromStore(hold);
  });
  const off = (): void => {
    bridged.delete(hold);
    unsubscribe();
  };
  bridged.set(hold, off);
  return off;
}
