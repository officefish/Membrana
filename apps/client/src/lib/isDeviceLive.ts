import type { NodeConnectionMode } from '@/lib/nodeConnectionMode';
import type { NodeRealtimeClientState } from '@/lib/nodeRealtimeClient';

/** Подсказка для disabled-кнопки «Пуск» при офлайн-устройстве (DBR6). */
export const DEVICE_OFFLINE_RUN_HINT = 'нет связи с устройством';

/**
 * Критерий «связь жива» для gating Пуска на полевом клиенте (DBR6).
 * Автономный режим — локальный запуск всегда доступен; paired — WS presence online.
 */
export function isDeviceLive(
  deviceId: string | null | undefined,
  mode: NodeConnectionMode | null,
  wsState: NodeRealtimeClientState,
): boolean {
  if (mode === 'autonomous') {
    return true;
  }
  if (mode !== 'paired') {
    return false;
  }
  if (deviceId === null || deviceId === undefined || deviceId.length === 0) {
    return false;
  }
  return wsState === 'connected';
}
