import React, { useCallback, useEffect, useMemo } from 'react';
import { useMembranaStore } from '@membrana/agenda';

import { fftIndicesVizPluginState } from './fftIndicesVizPluginState';
import {
  FFT_INDICES_VIZ_PLUGIN_ID,
  defaultFftIndicesVizConfig,
  resolveFftIndicesVizConfig,
  type FftIndicesVizMode,
  type FftIndicesVizPluginConfig,
} from './types';

const VIZ_MODES: { id: FftIndicesVizMode; label: string }[] = [
  { id: 'radar', label: 'Радар' },
  { id: 'bars', label: 'Полосы' },
  { id: 'triangle', label: 'Треугольник' },
];

export interface FftIndicesVizSidebarSettingsProps {
  readonly moduleId: string;
}

export const FftIndicesVizSidebarSettings: React.FC<FftIndicesVizSidebarSettingsProps> = ({
  moduleId,
}) => {
  const rawConfig = useMembranaStore((s) =>
    s.getPlugin(moduleId, FFT_INDICES_VIZ_PLUGIN_ID)?.config,
  );
  const updatePluginConfig = useMembranaStore((s) => s.updatePluginConfig);
  const config = useMemo(
    () => resolveFftIndicesVizConfig(rawConfig ?? defaultFftIndicesVizConfig),
    [rawConfig],
  );

  useEffect(() => {
    fftIndicesVizPluginState.syncConfig(config);
  }, [config]);

  const patchConfig = useCallback(
    (updates: Partial<FftIndicesVizPluginConfig>) => {
      updatePluginConfig<FftIndicesVizPluginConfig>(
        moduleId,
        FFT_INDICES_VIZ_PLUGIN_ID,
        updates,
      );
    },
    [moduleId, updatePluginConfig],
  );

  return (
    <div className="space-y-3 pt-1">
      <p className="text-[10px] font-medium text-base-content/60 uppercase tracking-wide m-0">
        Визуализация
      </p>

      <div className="flex flex-col gap-1" role="group" aria-label="Режим визуализации">
        {VIZ_MODES.map(({ id, label }) => (
          <label
            key={id}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-base-300 bg-base-100 px-2 py-1.5 hover:bg-base-200/50"
          >
            <span className="text-[11px] font-medium text-base-content">{label}</span>
            <input
              type="radio"
              name={`${moduleId}-fft-indices-viz-mode`}
              className="radio radio-primary radio-xs"
              checked={config.vizMode === id}
              onChange={() => patchConfig({ vizMode: id })}
              aria-label={label}
            />
          </label>
        ))}
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-base-300 bg-base-100 px-2 py-1.5 hover:bg-base-200/50">
        <span className="text-[11px] font-medium text-base-content">Зона дрона</span>
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm shrink-0"
          checked={config.showDroneZone}
          onChange={(e) => patchConfig({ showDroneZone: e.target.checked })}
          aria-label="Показать зону дрона"
        />
      </label>

      <label className="form-control w-full gap-1">
        <span className="text-[11px] font-medium text-base-content">
          Сглаживание ({config.displaySmoothing.toFixed(2)})
        </span>
        <input
          type="range"
          min={0}
          max={0.95}
          step={0.05}
          className="range range-primary range-xs w-full"
          value={config.displaySmoothing}
          onChange={(e) =>
            patchConfig({ displaySmoothing: Number(e.target.value) })
          }
          aria-label="Сглаживание отображения"
        />
      </label>
    </div>
  );
};
