import { useSyncExternalStore } from 'react';

import {
  getMicrophoneCaptureSnapshot,
  subscribeMicrophoneCapture,
} from '../../modules/microphone/microphoneCaptureCoordinator';
import { harmonicDetectorPluginState } from './harmonicDetectorPluginState';

export function useHarmonicDetectorAnalysis() {
  const pluginSnapshot = useSyncExternalStore(
    harmonicDetectorPluginState.subscribe,
    harmonicDetectorPluginState.getSnapshot,
    harmonicDetectorPluginState.getSnapshot,
  );

  const captureSnapshot = useSyncExternalStore(
    subscribeMicrophoneCapture,
    getMicrophoneCaptureSnapshot,
    getMicrophoneCaptureSnapshot,
  );

  return {
    ...pluginSnapshot,
    captureIsLive: captureSnapshot.isLive,
    captureError: captureSnapshot.error,
  };
}
