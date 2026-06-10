import { useSyncExternalStore } from 'react';

import { micBufferRecorderPluginState } from './micBufferRecorderPluginState';

export function useMicBufferRecorder(): ReturnType<
  typeof micBufferRecorderPluginState.getSnapshot
> {
  return useSyncExternalStore(
    micBufferRecorderPluginState.subscribe,
    micBufferRecorderPluginState.getSnapshot,
    micBufferRecorderPluginState.getSnapshot,
  );
}
