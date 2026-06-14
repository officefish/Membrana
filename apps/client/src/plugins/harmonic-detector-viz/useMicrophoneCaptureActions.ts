import { useCallback } from 'react';

import {
  requestMicrophoneStart,
  requestMicrophoneStop,
} from '../../modules/microphone/microphoneCaptureCoordinator';

export function useMicrophoneCaptureActions() {
  const start = useCallback(async () => {
    await requestMicrophoneStart();
  }, []);

  const stop = useCallback(() => {
    requestMicrophoneStop();
  }, []);

  return { start, stop };
}
