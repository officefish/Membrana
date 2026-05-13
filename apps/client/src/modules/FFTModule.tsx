import React, { useEffect, useRef } from 'react';
import { ModuleProps, useModulePlugins } from '@membrana/agenda';
import {
  useMicrophone,
  type AudioSampleFrame,
} from '@membrana/audio-engine-service';
import { renderFftBarsCanvas } from '@membrana/audio-data-viz';

/**
 * FFTModule — демонстрационный модуль для FFT-визуализации входящего звука.
 *
 * Web Audio (AudioContext, AnalyserNode, getUserMedia) НЕ управляется здесь
 * напрямую — это работа `@membrana/audio-engine-service`. Модуль:
 *  1. Поднимает sampler через `useMicrophone(...)` с нужными fftSize/smoothing.
 *  2. На каждом кадре читает spectrum из `analyserNode` engine'а и рисует.
 *  3. Доп. настройки AnalyserNode (`minDecibels`/`maxDecibels`) — допустимая
 *     прямая до-конфигурация engine'ового узла, потому что engine не
 *     решает за модуль, какой диапазон громкости его интересует.
 */

export interface FFTConfig {
  fftSize: 512 | 1024 | 2048 | 4096;
  smoothingTimeConstant: number;
  minDecibels: number;
  maxDecibels: number;
}

export const FFTModule: React.FC<ModuleProps<FFTConfig>> = ({
  module,
  onUpdateConfig,
}) => {
  const config = module.config as FFTConfig;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { plugins, activeIds, toggle: togglePlugin } = useModulePlugins(module.id);

  const handleFrame = useRef((_: AudioSampleFrame) => {
    /* реальный обработчик ставится ниже через ref */
  });

  // На каждый кадр engine'а — читаем магнитуды из его AnalyserNode и рисуем.
  // analyserNode берётся реактивно из useMicrophone, без своего AudioContext.
  const { state, analyserNode, audioContext, start, stop } = useMicrophone({
    config: {
      bufferSize: config.fftSize,
      smoothingTimeConstant: config.smoothingTimeConstant,
    },
    onFrame: (frame) => handleFrame.current(frame),
  });

  const isRecording = state === 'running';

  // Применяем decibel-настройки на engine'овый AnalyserNode.
  useEffect(() => {
    if (!analyserNode) return;
    analyserNode.minDecibels = config.minDecibels;
    analyserNode.maxDecibels = config.maxDecibels;
  }, [analyserNode, config.minDecibels, config.maxDecibels]);

  // Обработчик кадра: читаем частотные данные у engine'ового AnalyserNode и рисуем.
  useEffect(() => {
    handleFrame.current = () => {
      if (!analyserNode || !canvasRef.current) return;
      const data = new Uint8Array(analyserNode.frequencyBinCount);
      analyserNode.getByteFrequencyData(data);
      renderFftBarsCanvas(canvasRef.current, data, {
        minCssWidth: 320,
        minCssHeight: 180,
      });
    };
  }, [analyserNode]);

  const handleConfigUpdate = (updates: Partial<FFTConfig>): void => {
    onUpdateConfig(updates);
  };

  return (
    <div className="card bg-base-100 border border-base-200 shadow-sm rounded-box w-full">
      <div className="card-body p-4 md:p-6 gap-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              if (isRecording) void stop();
              else void start();
            }}
            className={`btn min-h-10 ${isRecording ? 'btn-error' : 'btn-primary'}`}
          >
            {isRecording ? 'Остановить' : 'Запустить'}
          </button>
        </div>

        <div className="rounded-box border border-base-300 overflow-hidden bg-base-300/30 min-h-[240px]">
          <canvas ref={canvasRef} className="w-full h-[240px] block" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label" htmlFor={`${module.id}-fft-size`}>
              <span className="label-text">FFT Size</span>
            </label>
            <select
              id={`${module.id}-fft-size`}
              value={config.fftSize}
              onChange={(e) =>
                handleConfigUpdate({ fftSize: Number(e.target.value) as FFTConfig['fftSize'] })
              }
              className="select select-bordered select-sm w-full"
            >
              <option value={512}>512</option>
              <option value={1024}>1024</option>
              <option value={2048}>2048</option>
              <option value={4096}>4096</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label" htmlFor={`${module.id}-smooth`}>
              <span className="label-text">Smoothing</span>
            </label>
            <input
              id={`${module.id}-smooth`}
              type="range"
              min="0"
              max="0.95"
              step="0.05"
              value={config.smoothingTimeConstant}
              onChange={(e) =>
                handleConfigUpdate({ smoothingTimeConstant: parseFloat(e.target.value) })
              }
              className="range range-primary range-sm w-full"
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor={`${module.id}-min-db`}>
              <span className="label-text">Min Decibels</span>
            </label>
            <input
              id={`${module.id}-min-db`}
              type="range"
              min="-120"
              max="-20"
              step="5"
              value={config.minDecibels}
              onChange={(e) =>
                handleConfigUpdate({ minDecibels: parseFloat(e.target.value) })
              }
              className="range range-primary range-sm w-full"
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor={`${module.id}-max-db`}>
              <span className="label-text">Max Decibels</span>
            </label>
            <input
              id={`${module.id}-max-db`}
              type="range"
              min="-80"
              max="0"
              step="5"
              value={config.maxDecibels}
              onChange={(e) =>
                handleConfigUpdate({ maxDecibels: parseFloat(e.target.value) })
              }
              className="range range-primary range-sm w-full"
            />
          </div>
        </div>

        {plugins.length > 0 && <div className="divider my-2" />}
        {plugins.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-base-content mb-2">Плагины</h3>
            <div className="flex flex-wrap gap-2">
              {plugins.map((plugin) => (
                <button
                  key={plugin.id}
                  type="button"
                  onClick={() => togglePlugin(plugin.id)}
                  className={`btn btn-sm min-h-9 ${
                    activeIds.includes(plugin.id)
                      ? 'btn-primary'
                      : 'btn-ghost border border-base-300'
                  }`}
                >
                  {plugin.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {isRecording && (
          <p className="text-sm text-base-content/60 tabular-nums">
            Частота дискретизации: {audioContext?.sampleRate} Hz · FFT: {config.fftSize}
          </p>
        )}
      </div>
    </div>
  );
};
