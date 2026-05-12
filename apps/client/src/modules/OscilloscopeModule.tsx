import React, { useEffect, useRef, useState } from 'react';
import { ModuleProps, useModulePlugins } from '@membrana/agenda';
import { getCanvasThemeColors } from '../utils/themeCanvasColors';

export interface OscilloscopeConfig {
  timeScale: number;
  amplitudeScale: number;
  showGrid: boolean;
  triggerMode: 'auto' | 'normal' | 'single';
  colorScheme: 'classic' | 'neon' | 'monochrome';
}

export const OscilloscopeModule: React.FC<ModuleProps<OscilloscopeConfig>> = ({
  module,
  onUpdateConfig,
}) => {
  const config = module.config as OscilloscopeConfig;
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const { plugins, activeIds, toggle: togglePlugin } = useModulePlugins(module.id);

  const initAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(2048, 1, 1);

      source.connect(processor);
      processor.connect(context.destination);

      sourceRef.current = source;
      setAudioContext(context);

      let samples: number[] = [];
      let lastTriggerTime = 0;

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        samples = [...samples, ...Array.from(inputData)];

        const maxSamples = Math.floor(1024 / config.timeScale);
        if (samples.length > maxSamples) {
          samples = samples.slice(-maxSamples);
        }

        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const colors = getCanvasThemeColors();
          const rect = canvas.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
          const width = Math.max(320, Math.floor(rect.width));
          const height = Math.max(180, Math.floor(rect.height));
          canvas.width = Math.floor(width * dpr);
          canvas.height = Math.floor(height * dpr);
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          const centerY = height / 2;

          ctx.fillStyle = config.colorScheme === 'monochrome' ? colors.bg : colors.bg;
          ctx.fillRect(0, 0, width, height);

          if (config.showGrid) {
            ctx.strokeStyle = colors.grid;
            ctx.globalAlpha = 0.2;
            ctx.lineWidth = 0.5;

            for (let i = -3; i <= 3; i++) {
              const y = centerY + (i * height) / 8;
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(width, y);
              ctx.stroke();
            }

            for (let i = 0; i <= 8; i++) {
              const x = (i / 8) * width;
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, height);
              ctx.stroke();
            }

            ctx.globalAlpha = 0.45;
            ctx.strokeStyle = colors.grid;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            ctx.lineTo(width, centerY);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }

          const step = width / samples.length;

          let lineColor: string;
          switch (config.colorScheme) {
            case 'neon':
              lineColor = colors.success;
              break;
            case 'monochrome':
              lineColor = colors.text;
              break;
            default:
              lineColor = colors.accent;
          }

          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 2;
          ctx.beginPath();

          let triggerIndex = -1;
          if (config.triggerMode === 'auto' || config.triggerMode === 'normal') {
            for (let i = 1; i < samples.length; i++) {
              const currentTime = Date.now();
              const s0 = samples[i] ?? 0;
              const s1 = samples[i - 1] ?? 0;
              if (
                s0 > 0.1 &&
                s1 <= 0.1 &&
                (currentTime - lastTriggerTime > 200 || config.triggerMode === 'normal')
              ) {
                triggerIndex = i;
                lastTriggerTime = currentTime;
                setIsTriggered(true);
                break;
              }
            }
          }

          const startIndex = triggerIndex !== -1 ? triggerIndex : 0;
          let x = 0;
          for (let i = startIndex; i < samples.length; i++) {
            const sample = samples[i] ?? 0;
            const y = centerY - sample * (height / 2) * config.amplitudeScale;
            const currentX = x * step * config.timeScale;

            if (i === startIndex) {
              ctx.moveTo(currentX, y);
            } else {
              ctx.lineTo(currentX, y);
            }
            x++;

            if (currentX > width) break;
          }

          ctx.stroke();

          if (isTriggered && config.triggerMode !== 'auto') {
            ctx.fillStyle = colors.danger;
            ctx.fillRect(10, 10, 8, 8);
            ctx.fillStyle = colors.text;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText('TRIGGERED', 25, 18);
          }

          const rms = Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / Math.max(samples.length, 1));
          ctx.fillStyle = colors.textMuted;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(`RMS: ${(rms * 100).toFixed(1)}%`, 10, height - 10);
        }
      };

      await context.resume();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Доступ к микрофону не получен');
    }
  };

  const stopAudio = () => {
    if (audioContext) {
      void audioContext.close();
      setAudioContext(null);
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setIsRecording(false);
    setIsTriggered(false);
  };

  useEffect(() => {
    return () => stopAudio();
  }, []);

  const handleConfigUpdate = (updates: Partial<OscilloscopeConfig>) => {
    onUpdateConfig(updates);
  };

  return (
    <div className="card bg-base-100 border border-base-200 shadow-sm rounded-box p-4 md:p-6 gap-4">
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
          <label className="label" htmlFor={`${module.id}-time`}>
            <span className="label-text tabular-nums">Time Scale: {config.timeScale.toFixed(2)}</span>
          </label>
          <input
            id={`${module.id}-time`}
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={config.timeScale}
            onChange={(e) => handleConfigUpdate({ timeScale: parseFloat(e.target.value) })}
            className="range range-primary range-sm"
          />
        </div>

        <div className="form-control">
          <label className="label" htmlFor={`${module.id}-amp`}>
            <span className="label-text tabular-nums">Amplitude: {config.amplitudeScale.toFixed(2)}</span>
          </label>
          <input
            id={`${module.id}-amp`}
            type="range"
            min="0.5"
            max="2"
            step="0.05"
            value={config.amplitudeScale}
            onChange={(e) => handleConfigUpdate({ amplitudeScale: parseFloat(e.target.value) })}
            className="range range-primary range-sm"
          />
        </div>

        <div className="form-control">
          <label className="label" htmlFor={`${module.id}-trig`}>
            <span className="label-text">Trigger Mode</span>
          </label>
          <select
            id={`${module.id}-trig`}
            value={config.triggerMode}
            onChange={(e) => handleConfigUpdate({ triggerMode: e.target.value as OscilloscopeConfig['triggerMode'] })}
            className="select select-bordered select-sm w-full"
          >
            <option value="auto">Auto</option>
            <option value="normal">Normal</option>
            <option value="single">Single</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label" htmlFor={`${module.id}-scheme`}>
            <span className="label-text">Color Scheme</span>
          </label>
          <select
            id={`${module.id}-scheme`}
            value={config.colorScheme}
            onChange={(e) => handleConfigUpdate({ colorScheme: e.target.value as OscilloscopeConfig['colorScheme'] })}
            className="select select-bordered select-sm w-full"
          >
            <option value="classic">Classic (accent)</option>
            <option value="neon">Neon (success)</option>
            <option value="monochrome">Monochrome</option>
          </select>
        </div>

        <div className="form-control sm:col-span-2">
          <label className="label cursor-pointer justify-start gap-3 py-1">
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              checked={config.showGrid}
              onChange={(e) => handleConfigUpdate({ showGrid: e.target.checked })}
            />
            <span className="label-text">Показывать сетку</span>
          </label>
        </div>
      </div>

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
          Частота: {audioContext?.sampleRate} Hz · {isTriggered ? 'Triggered' : 'Waiting'}
        </p>
      )}
    </div>
  );
};
