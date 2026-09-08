import { useCallback, useSyncExternalStore } from 'react';

import { getDeviceOverflowHold, type DeviceOverflowHold, type OverflowHoldEpisode } from '@/lib/device-overflow-hold';

/** Эпизод удержания как внешний стор React — плашка, бейдж и хост читают один носитель. */
export function useOverflowHoldEpisode(hold: DeviceOverflowHold = getDeviceOverflowHold()): OverflowHoldEpisode | null {
  const subscribe = useCallback((onChange: () => void) => hold.subscribe(() => onChange()), [hold]);
  const getSnapshot = useCallback(() => hold.getEpisode(), [hold]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
