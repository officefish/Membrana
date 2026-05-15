import React, { useEffect, useMemo } from 'react';
import { useMembranaStore } from '@membrana/agenda';

import { fftIndicesVizPluginState } from './fftIndicesVizPluginState';
import { FftIndicesCanvas } from './components/FftIndicesCanvas';
import { FluxHistoryCanvas } from './components/FluxHistoryCanvas';
import { ParamLegendRow } from './components/ParamLegendRow';
import { useFftIndicesViz } from './useFftIndicesViz';
import {
  FFT_INDICES_VIZ_PLUGIN_ID,
  defaultFftIndicesVizConfig,
  resolveFftIndicesVizConfig,
} from './types';

export interface FftIndicesVizPanelProps {
  readonly moduleId: string;
}

export const FftIndicesVizPanel: React.FC<FftIndicesVizPanelProps> = ({
  moduleId,
}) => {
  const snapshot = useFftIndicesViz();
  const rawConfig = useMembranaStore((s) =>
    s.getPlugin(moduleId, FFT_INDICES_VIZ_PLUGIN_ID)?.config,
  );
  const config = useMemo(
    () => resolveFftIndicesVizConfig(rawConfig ?? defaultFftIndicesVizConfig),
    [rawConfig],
  );

  useEffect(() => {
    fftIndicesVizPluginState.syncConfig(config);
  }, [config]);

  const streamStatus = snapshot.streamActive
    ? 'Анализ потока'
    : 'Ожидание микрофона';

  const drawValues = useMemo(
    () => ({
      centroidNorm: snapshot.centroidNorm,
      fluxNorm: snapshot.fluxNorm,
      rmsNorm: snapshot.rmsNorm,
    }),
    [snapshot.centroidNorm, snapshot.fluxNorm, snapshot.rmsNorm],
  );

  return (
    <div className="rounded-box border border-primary/30 bg-base-200/30 p-4 space-y-4 w-full min-w-0">
      <div>
        <h3 className="text-sm font-semibold text-base-content">FFT-индексы</h3>
        <p className="text-xs text-base-content/60 mt-0.5">
          Живая активность центроида, потока и громкости (шкала подстраивается под
          поток). Режим и сглаживание — во вкладке «Плагины» слева.
        </p>
      </div>

      <p className="text-xs text-base-content/70" aria-live="polite">
        {streamStatus}
      </p>

      {!snapshot.streamActive && (
        <p className="text-xs text-center text-base-content/50 py-2">
          Запустите поток микрофона для live-данных.
        </p>
      )}

      {snapshot.streamActive && (
        <div className="space-y-4 w-full min-w-0">
          <FftIndicesCanvas mode={config.vizMode} values={drawValues} />

          <div className="space-y-3 w-full min-w-0">
            <ParamLegendRow
              kind="centroid"
              label="Спектральный центроид"
              activity={snapshot.centroidNorm}
              showDroneZone={config.showDroneZone}
            />
            <ParamLegendRow
              kind="flux"
              label="Спектральный поток"
              activity={snapshot.fluxNorm}
              showDroneZone={config.showDroneZone}
            />
            <ParamLegendRow
              kind="rms"
              label="Громкость"
              activity={snapshot.rmsNorm}
              showDroneZone={config.showDroneZone}
            />
          </div>

          <div className="w-full min-w-0">
            <p className="text-xs text-base-content/60 mb-1">История потока</p>
            <FluxHistoryCanvas
              history={snapshot.fluxHistory}
              showDroneZone={config.showDroneZone}
            />
          </div>
        </div>
      )}
    </div>
  );
};
