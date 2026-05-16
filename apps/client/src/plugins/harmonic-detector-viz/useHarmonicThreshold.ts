import { useMembranaStore } from '@membrana/agenda';
import { useCallback } from 'react';

import { harmonicDetectorPluginState } from './harmonicDetectorPluginState';
import { HARMONIC_DETECTOR_VIZ_PLUGIN_ID } from './types';

export function useHarmonicThreshold(moduleId: string) {
  const updatePluginConfig = useMembranaStore((s) => s.updatePluginConfig);

  const setConfidenceThreshold = useCallback(
    (value: number) => {
      const threshold = Math.min(0.95, Math.max(0.2, value));
      harmonicDetectorPluginState.setConfidenceThreshold(threshold);
      updatePluginConfig(moduleId, HARMONIC_DETECTOR_VIZ_PLUGIN_ID, {
        confidenceThreshold: threshold,
      });
    },
    [moduleId, updatePluginConfig],
  );

  return { setConfidenceThreshold };
}
