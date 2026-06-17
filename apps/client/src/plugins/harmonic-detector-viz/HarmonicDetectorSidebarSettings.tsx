import { useMembranaStore } from '@membrana/agenda';

import { AnalysisSourceSelect } from '../../lib/audioAnalysis/AnalysisSourceSelect';
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
  const updatePluginConfig = useMembranaStore((s) => s.updatePluginConfig);
  const config = resolveHarmonicDetectorVizConfig(rawConfig);
  const threshold =
    harmonicDetectorPluginState.getSnapshot().confidenceThreshold ?? config.confidenceThreshold;
  const { setConfidenceThreshold } = useHarmonicThreshold(moduleId);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-base-content/60 text-xs leading-snug">
        Порог чувствительности классификатора и UI-гистерезис. Источник — микрофон или сэмпл из
        библиотеки.
      </p>
      <AnalysisSourceSelect
        value={config.analysisSource}
        onChange={(analysisSource) =>
          updatePluginConfig(moduleId, HARMONIC_DETECTOR_VIZ_PLUGIN_ID, { analysisSource })
        }
      />
      <SensitivityThresholdSlider
        className="max-w-full"
        value={threshold}
        onChange={setConfidenceThreshold}
      />
    </div>
  );
}
