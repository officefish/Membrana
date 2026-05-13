import React, { useCallback, useMemo } from 'react';
import { useMembranaStore } from '@membrana/agenda';
import {
  MIC_STREAM_VIZ_PLUGIN_ID,
  resolveMicStreamVizConfig,
  type MicStreamVizPluginConfig,
} from './types';

type WidgetKey = keyof MicStreamVizPluginConfig;

const WIDGETS: { key: WidgetKey; label: string }[] = [
  { key: 'showVolume', label: 'Индикатор громкости' },
  { key: 'showQuality', label: 'Качество / SNR' },
  { key: 'showWaveform', label: 'Осциллограмма' },
  { key: 'showSpectrum', label: 'Спектр (полосы)' },
  { key: 'showFftBars', label: 'FFT столбики' },
  { key: 'showSpectrumLine', label: 'Спектр (кривая)' },
];

export interface StreamVizPluginWidgetRadiosProps {
  moduleId: string;
}

export const StreamVizPluginWidgetRadios: React.FC<StreamVizPluginWidgetRadiosProps> = ({
  moduleId,
}) => {
  const rawConfig = useMembranaStore((s) => s.getPlugin(moduleId, MIC_STREAM_VIZ_PLUGIN_ID)?.config);
  const pluginConfig = useMemo(() => resolveMicStreamVizConfig(rawConfig), [rawConfig]);
  const updatePluginConfig = useMembranaStore((s) => s.updatePluginConfig);

  const setWidget = useCallback(
    (key: WidgetKey, value: boolean) => {
      updatePluginConfig<MicStreamVizPluginConfig>(moduleId, MIC_STREAM_VIZ_PLUGIN_ID, {
        [key]: value,
      });
    },
    [moduleId, updatePluginConfig],
  );

  return (
    <div className="space-y-1.5 pt-1">
      <p className="text-[10px] font-medium text-base-content/60 uppercase tracking-wide m-0">Виджеты</p>
      <ul className="m-0 list-none space-y-1 p-0">
        {WIDGETS.map((w) => {
          const on = pluginConfig[w.key];
          return (
            <li key={w.key} className="m-0">
              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-base-300 bg-base-100 px-2 py-1.5 hover:bg-base-200/50">
                <span className="min-w-0 flex-1 text-[11px] font-medium leading-snug text-base-content">
                  {w.label}
                </span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm shrink-0"
                  checked={on}
                  onChange={(e) => setWidget(w.key, e.target.checked)}
                  aria-label={on ? `Выключить «${w.label}»` : `Включить «${w.label}»`}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
