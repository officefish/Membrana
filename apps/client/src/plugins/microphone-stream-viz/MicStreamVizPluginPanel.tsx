import React, { useMemo } from 'react';
import { useMembranaStore } from '@membrana/agenda';
import {
  LiveFftBarsCanvas,
  LiveSpectrumLineCanvas,
  QualityMeter,
  SpectrumBars,
  VolumeMeter,
  Waveform,
} from '@membrana/audio-data-viz';
import { useMicStreamAnalysis } from './useMicStreamAnalysis';
import { MIC_STREAM_VIZ_PLUGIN_ID, resolveMicStreamVizConfig } from './types';

export interface MicStreamVizPluginPanelProps {
  moduleId: string;
}

export const MicStreamVizPluginPanel: React.FC<MicStreamVizPluginPanelProps> = ({ moduleId }) => {
  const rawConfig = useMembranaStore((s) => s.getPlugin(moduleId, MIC_STREAM_VIZ_PLUGIN_ID)?.config);
  const pluginConfig = useMemo(() => resolveMicStreamVizConfig(rawConfig), [rawConfig]);

  const { live, metrics, analyserRef } = useMicStreamAnalysis(moduleId);

  return (
    <div className="rounded-box border border-primary/30 bg-base-200/30 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-base-content">Визуализация потока</h3>
        <p className="text-xs text-base-content/60 mt-0.5">
          Видимость виджетов настраивается во вкладке «Плагины» слева (блок «Настройки» у этого плагина).
        </p>
      </div>

      {!live && (
        <p className="text-xs text-center text-base-content/50 py-2">
          Запустите поток микрофона, чтобы увидеть данные.
        </p>
      )}

      {live && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pluginConfig.showVolume && <VolumeMeter volume={metrics.volume} />}
            {pluginConfig.showQuality && (
              <QualityMeter
                qualityScore={metrics.qualityScore}
                snr={metrics.snr}
                noise={metrics.noise}
              />
            )}
          </div>
          {pluginConfig.showWaveform && <Waveform waveformData={metrics.waveformData} />}
          {pluginConfig.showSpectrum && <SpectrumBars spectrumData={metrics.spectrumData} />}

          {(pluginConfig.showFftBars || pluginConfig.showSpectrumLine) && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {pluginConfig.showFftBars && (
                <LiveFftBarsCanvas analyserRef={analyserRef} live={live} title="FFT (столбики)" />
              )}
              {pluginConfig.showSpectrumLine && (
                <LiveSpectrumLineCanvas analyserRef={analyserRef} live={live} title="Спектр (кривая)" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
