import { useMembranaStore } from '@membrana/agenda';
import { useCallback } from 'react';

import { harmonicDetectorPluginState } from './harmonicDetectorPluginState';
import { HARMONIC_DETECTOR_VIZ_PLUGIN_ID, resolveHarmonicDetectorVizConfig } from './types';

export function useHarmonicThreshold(moduleId: string) {
  const updatePluginConfig = useMembranaStore((s) => s.updatePluginConfig);

  const setConfidenceThreshold = useCallback(
    (value: number) => {
      const threshold = Math.min(0.95, Math.max(0.2, value));
      harmonicDetectorPluginState.setConfidenceThreshold(threshold);
      const mod = useMembranaStore.getState().getModule(moduleId);
      const plugin = mod?.plugins.find((p) => p.id === HARMONIC_DETECTOR_VIZ_PLUGIN_ID);
      const prev = resolveHarmonicDetectorVizConfig(
        plugin?.config as Partial<{ confidenceThreshold: number }> | undefined,
      );
      updatePluginConfig(moduleId, HARMONIC_DETECTOR_VIZ_PLUGIN_ID, {
        ...prev,
        confidenceThreshold: threshold,
      });
    },
    [moduleId, updatePluginConfig],
  );

  return { setConfidenceThreshold };
}
