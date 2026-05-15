import React, { useCallback, useEffect, useMemo } from 'react';
import { useMembranaStore } from '@membrana/agenda';

import { soundQualityVizPluginState } from './soundQualityVizPluginState';
import {
  SOUND_QUALITY_VIZ_PLUGIN_ID,
  defaultSoundQualityVizConfig,
  resolveSoundQualityVizConfig,
  type SoundQualityVizPluginConfig,
} from './types';

export interface SoundQualityVizSidebarSettingsProps {
  readonly moduleId: string;
}

export const SoundQualityVizSidebarSettings: React.FC<
  SoundQualityVizSidebarSettingsProps
> = ({ moduleId }) => {
  const rawConfig = useMembranaStore((s) =>
    s.getPlugin(moduleId, SOUND_QUALITY_VIZ_PLUGIN_ID)?.config,
  );
  const updatePluginConfig = useMembranaStore((s) => s.updatePluginConfig);
  const config = useMemo(
    () => resolveSoundQualityVizConfig(rawConfig ?? defaultSoundQualityVizConfig),
    [rawConfig],
  );

  useEffect(() => {
    soundQualityVizPluginState.syncConfig(config);
  }, [config]);

  const patchConfig = useCallback(
    (updates: Partial<SoundQualityVizPluginConfig>) => {
      updatePluginConfig<SoundQualityVizPluginConfig>(
        moduleId,
        SOUND_QUALITY_VIZ_PLUGIN_ID,
        updates,
      );
    },
    [moduleId, updatePluginConfig],
  );

  return (
    <div className="space-y-3 pt-1">
      <p className="text-[10px] font-medium text-base-content/60 uppercase tracking-wide m-0">
        Качество звука
      </p>

      <label className="form-control w-full gap-1">
        <span className="text-[11px] font-medium text-base-content">
          История RMS ({config.rmsHistorySize} кадров)
        </span>
        <input
          type="range"
          min={50}
          max={200}
          step={10}
          className="range range-primary range-xs w-full"
          value={config.rmsHistorySize}
          onChange={(e) =>
            patchConfig({ rmsHistorySize: Number(e.target.value) })
          }
          aria-label="Размер кольцевого буфера RMS"
        />
      </label>

      <label className="form-control w-full gap-1">
        <span className="text-[11px] font-medium text-base-content">
          Порог громкости ({config.loudnessRefMax.toFixed(2)})
        </span>
        <input
          type="range"
          min={0.15}
          max={0.6}
          step={0.05}
          className="range range-primary range-xs w-full"
          value={config.loudnessRefMax}
          onChange={(e) =>
            patchConfig({ loudnessRefMax: Number(e.target.value) })
          }
          aria-label="Опорный уровень громкости для клипа и peak dB"
        />
      </label>
    </div>
  );
};
