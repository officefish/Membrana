import React from 'react';
import type { MicStreamVizPluginConfig } from './types';

export type StreamVizToggleKey = keyof MicStreamVizPluginConfig;

export interface StreamVizPluginControlsProps {
  pluginConfig: MicStreamVizPluginConfig;
  onToggle: (key: StreamVizToggleKey) => void;
}

export const StreamVizPluginControls: React.FC<StreamVizPluginControlsProps> = React.memo(
  ({ pluginConfig, onToggle }) => {
    const widgets: { id: StreamVizToggleKey; label: string }[] = [
      { id: 'showVolume', label: 'Индикатор громкости' },
      { id: 'showQuality', label: 'Качество / SNR' },
      { id: 'showWaveform', label: 'Осциллограмма' },
      { id: 'showSpectrum', label: 'Спектр (полосы)' },
      { id: 'showFftBars', label: 'FFT столбики (как в модуле FFT)' },
      { id: 'showSpectrumLine', label: 'Спектр (кривая EQ)' },
    ];

    return (
      <div>
        <p className="text-xs font-medium text-base-content/70 mb-2">Виджеты</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
          {widgets.map((widget) => (
            <label
              key={widget.id}
              className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-base-300/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={pluginConfig[widget.id]}
                onChange={() => onToggle(widget.id)}
                className="checkbox checkbox-xs checkbox-primary"
              />
              <span className="text-base-content/80">{widget.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  },
);
