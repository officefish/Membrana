import { useMembranaStore } from '@membrana/agenda';

import { SensitivityThresholdSlider } from './components/SensitivityThresholdSlider';
import { harmonicDetectorPluginState } from './harmonicDetectorPluginState';
import { useHarmonicThreshold } from './useHarmonicThreshold';
import {
  HARMONIC_DETECTOR_VIZ_PLUGIN_ID,
  resolveHarmonicDetectorVizConfig,
} from './types';

interface Props {
  readonly moduleId: string;
}

export function HarmonicDetectorSidebarSettings({ moduleId }: Props) {
  const rawConfig = useMembranaStore((s) =>
    s.getPlugin(moduleId, HARMONIC_DETECTOR_VIZ_PLUGIN_ID)?.config,
  );
  const config = resolveHarmonicDetectorVizConfig(
    rawConfig as Partial<{ confidenceThreshold: number }> | undefined,
  );
  const threshold =
    harmonicDetectorPluginState.getSnapshot().confidenceThreshold ?? config.confidenceThreshold;
  const { setConfidenceThreshold } = useHarmonicThreshold(moduleId);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-base-content/60 text-xs leading-snug">
        Порог чувствительности классификатора и UI-гистерезис. Захват микрофона — в модуле или в
        панели плагина.
      </p>
      <SensitivityThresholdSlider
        className="max-w-full"
        value={threshold}
        onChange={setConfidenceThreshold}
      />
    </div>
  );
}
