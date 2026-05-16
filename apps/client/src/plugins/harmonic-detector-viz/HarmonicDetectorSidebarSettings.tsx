import { useMembranaStore } from '@membrana/agenda';

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
  const plugin = useMembranaStore((s) =>
    s.getModule(moduleId)?.plugins.find((p) => p.id === HARMONIC_DETECTOR_VIZ_PLUGIN_ID),
  );
  const config = resolveHarmonicDetectorVizConfig(
    plugin?.config as Partial<{ confidenceThreshold: number }> | undefined,
  );
  const threshold =
    harmonicDetectorPluginState.getSnapshot().confidenceThreshold ?? config.confidenceThreshold;
  const { setConfidenceThreshold } = useHarmonicThreshold(moduleId);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-base-content/60 text-xs leading-snug">
        Порог классификатора и UI-гистерезис. Старт микрофона — в модуле или в панели плагина.
      </p>
      <label className="form-control">
        <div className="label py-0">
          <span className="label-text">Порог</span>
          <span className="label-text-alt font-mono">{Math.round(threshold * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.2}
          max={0.9}
          step={0.01}
          value={threshold}
          className="range range-xs range-warning"
          onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
