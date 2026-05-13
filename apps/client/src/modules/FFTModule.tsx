import React, { useEffect, useRef, useState } from 'react';
import { ModuleProps, useModulePlugins } from '@membrana/agenda';
import { getCanvasThemeColors } from '../utils/themeCanvasColors';

export interface FFTConfig {
  fftSize: number;
  smoothingTimeConstant: number;
  minDecibels: number;
  maxDecibels: number;
}

export const FFTModule: React.FC<ModuleProps<FFTConfig>> = ({
  module,
  onUpdateConfig,
}) => {
  const config = module.config as FFTConfig;
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const animationRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { plugins, activeIds, toggle: togglePlugin } = useModulePlugins(module.id);

  const initAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyserNode = context.createAnalyser();

      analyserNode.fftSize = config.fftSize as 512 | 1024 | 2048 | 4096;
      analyserNode.smoothingTimeConstant = config.smoothingTimeConstant;
      analyserNode.minDecibels = config.minDecibels;
      analyserNode.maxDecibels = config.maxDecibels;

      source.connect(analyserNode);

      setAudioContext(context);
      setAnalyser(analyserNode);

      await context.resume();
      setIsRecording(true);
      startVisualization(analyserNode);
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Доступ к микрофону не получен');
    }
  };

  const startVisualization = (analyserNode: AnalyserNode) => {
    const draw = () => {
      if (!analyserNode || !canvasRef.current) return;

      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      analyserNode.getByteFrequencyData(dataArray);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const colors = getCanvasThemeColors();
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cssW = Math.max(320, Math.floor(rect.width));
      const cssH = Math.max(180, Math.floor(rect.height));
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const width = cssW;
      const height = cssH;
      const barWidth = width / dataArray.length;

      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i] ?? 0;
        const barHeight = (value / 255) * height;
        const x = i * barWidth;
        const y = height - barHeight;
        ctx.fillStyle = colors.accent;
        ctx.globalAlpha = 0.35 + (value / 255) * 0.65;
        ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
      }
      ctx.globalAlpha = 1;

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const stopAudio = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioContext) {
      void audioContext.close();
      setAudioContext(null);
    }
    setAnalyser(null);
    setIsRecording(false);
  };

  useEffect(() => {
    return () => stopAudio();
  }, []);

  useEffect(() => {
    if (analyser) {
      analyser.fftSize = config.fftSize as 512 | 1024 | 2048 | 4096;
      analyser.smoothingTimeConstant = config.smoothingTimeConstant;
      analyser.minDecibels = config.minDecibels;
      analyser.maxDecibels = config.maxDecibels;
    }
  }, [config, analyser]);

  const handleConfigUpdate = (updates: Partial<FFTConfig>) => {
    onUpdateConfig(updates);
  };

  return (
    <div className="card bg-base-100 border border-base-200 shadow-sm rounded-box w-full">
      <div className="card-body p-4 md:p-6 gap-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="card-title text-lg text-base-content">{module.name}</h2>
          <p className="text-sm text-base-content/60">{module.description}</p>
        </div>
        <button
          type="button"
          onClick={isRecording ? stopAudio : initAudio}
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
            onChange={(e) => handleConfigUpdate({ fftSize: Number(e.target.value) })}
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
            onChange={(e) => handleConfigUpdate({ smoothingTimeConstant: parseFloat(e.target.value) })}
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
            onChange={(e) => handleConfigUpdate({ minDecibels: parseFloat(e.target.value) })}
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
            onChange={(e) => handleConfigUpdate({ maxDecibels: parseFloat(e.target.value) })}
            className="range range-primary range-sm w-full"
          />
        </div>
      </div>

      {plugins.length > 0 && (
        <div className="divider my-2" />
      )}
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
                  activeIds.includes(plugin.id) ? 'btn-primary' : 'btn-ghost border border-base-300'
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
