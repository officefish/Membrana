import { useMemo } from 'react';

import { createClientDeviceBoardPersistAdapter } from './deviceScenarioPersistence';

/** Адаптер sync сценария для DeviceBoardShell (paired → media-server). */
export function useDeviceBoardPersistAdapter() {
  return useMemo(() => createClientDeviceBoardPersistAdapter(), []);
}
