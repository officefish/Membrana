import React, { useCallback, useId, useMemo } from 'react';
import { useMembranaStore } from '@membrana/agenda';
import {
  QualityWidget,
  SpectrumWidget,
  VolumeWidget,
  WaveformWidget,
  WidgetControls,
  type WidgetToggleKey,
} from './widgets';
import { useMicStreamAnalysis } from './useMicStreamAnalysis';
import {
  MIC_STREAM_VIZ_PLUGIN_ID,
  defaultMicStreamVizConfig,
  type MicStreamVizPluginConfig,
} from './types';

export interface MicStreamVizPluginPanelProps {
  moduleId: string;
}

function resolveConfig(raw: unknown): MicStreamVizPluginConfig {
  if (!raw || typeof raw !== 'object') return { ...defaultMicStreamVizConfig };
  const o = raw as Record<string, unknown>;
  return {
    showVolume:
      typeof o.showVolume === 'boolean' ? o.showVolume : defaultMicStreamVizConfig.showVolume,
    showQuality:
      typeof o.showQuality === 'boolean' ? o.showQuality : defaultMicStreamVizConfig.showQuality,
    showWaveform:
      typeof o.showWaveform === 'boolean'
        ? o.showWaveform
        : defaultMicStreamVizConfig.showWaveform,
    showSpectrum:
      typeof o.showSpectrum === 'boolean'
        ? o.showSpectrum
        : defaultMicStreamVizConfig.showSpectrum,
  };
}

export const MicStreamVizPluginPanel: React.FC<MicStreamVizPluginPanelProps> = ({ moduleId }) => {
  const uid = useId().replace(/:/g, '');
  const gradientId = `mic-wf-grad-${uid}`;
  const filterId = `mic-wf-glow-${uid}`;

  const rawConfig = useMembranaStore((s) => s.getPlugin(moduleId, MIC_STREAM_VIZ_PLUGIN_ID)?.config);
  const pluginConfig = useMemo(() => resolveConfig(rawConfig), [rawConfig]);

  const updatePluginConfig = useMembranaStore((s) => s.updatePluginConfig);

  const onToggleWidget = useCallback(
    (key: WidgetToggleKey) => {
      updatePluginConfig<MicStreamVizPluginConfig>(moduleId, MIC_STREAM_VIZ_PLUGIN_ID, {
        [key]: !pluginConfig[key],
      });
    },
    [moduleId, pluginConfig, updatePluginConfig],
  );

  const { live, metrics } = useMicStreamAnalysis(moduleId);

  const widgetStates = useMemo(
    () => ({
      showVolume: pluginConfig.showVolume,
      showQuality: pluginConfig.showQuality,
      showWaveform: pluginConfig.showWaveform,
      showSpectrum: pluginConfig.showSpectrum,
    }),
    [pluginConfig],
  );

  return (
    <div className="rounded-box border border-primary/30 bg-base-200/30 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-base-content">Визуализация потока</h3>
        <p className="text-xs text-base-content/60 mt-0.5">
          Плагин «Поток микрофона»: виджеты и их видимость хранятся в конфигурации плагина.
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-base-content/70 mb-2">Виджеты</p>
        <WidgetControls widgetStates={widgetStates} onToggle={onToggleWidget} />
      </div>

      {!live && (
        <p className="text-xs text-center text-base-content/50 py-2">
          Запустите поток микрофона, чтобы увидеть данные.
        </p>
      )}

      {live && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pluginConfig.showVolume && <VolumeWidget volume={metrics.volume} />}
            {pluginConfig.showQuality && (
              <QualityWidget
                qualityScore={metrics.qualityScore}
                snr={metrics.snr}
                noise={metrics.noise}
              />
            )}
          </div>
          {pluginConfig.showWaveform && (
            <WaveformWidget
              waveformData={metrics.waveformData}
              gradientId={gradientId}
              filterId={filterId}
            />
          )}
          {pluginConfig.showSpectrum && <SpectrumWidget spectrumData={metrics.spectrumData} />}
        </div>
      )}
    </div>
  );
};
