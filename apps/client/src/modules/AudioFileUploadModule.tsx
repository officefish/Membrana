import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ModuleProps, useTheme } from '@membrana/agenda';
import { downsampleToPeaks } from '../utils/downsamplePeaks';
import { getCanvasThemeColors } from '@membrana/audio-data-viz';

export interface AudioFileUploadConfig {
  fftSize: 512 | 1024 | 2048 | 4096;
  waveformBins: number;
  showSpectrumWhilePlaying: boolean;
}

const ACCEPT = 'audio/*,.wav,.mp3,.ogg,.webm,.flac,.m4a,.aac';

function sizeCanvasToCss(canvas: HTMLCanvasElement, cssW: number, cssH: number) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(320, Math.floor(cssW));
  const h = Math.max(120, Math.floor(cssH));
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  return { cssW: w, cssH: h, dpr };
}

function drawWaveform(
  canvas: HTMLCanvasElement,
  peaks: Float32Array,
  colors: ReturnType<typeof getCanvasThemeColors>
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  const { cssW, cssH, dpr } = sizeCanvasToCss(canvas, rect.width, rect.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, cssW, cssH);

  const mid = cssH / 2;
  const barW = cssW / peaks.length;
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = Math.max(1, barW * 0.35);
  ctx.beginPath();
  for (let i = 0; i < peaks.length; i++) {
    const x = i * barW + barW / 2;
    const pk = peaks[i] ?? 0;
    const h = pk * (cssH * 0.45);
    ctx.moveTo(x, mid - h);
    ctx.lineTo(x, mid + h);
  }
  ctx.stroke();

  ctx.strokeStyle = colors.grid;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(cssW, mid);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.textMuted;
  ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('Огибающая файла (пики по блокам)', 12, cssH - 10);
}

function drawSpectrum(
  canvas: HTMLCanvasElement,
  data: Uint8Array,
  colors: ReturnType<typeof getCanvasThemeColors>
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  const { cssW, cssH, dpr } = sizeCanvasToCss(canvas, rect.width, rect.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = colors.surface;
  ctx.fillRect(0, 0, cssW, cssH);
  const barCount = data.length;
  const barWidth = cssW / barCount;
  for (let i = 0; i < barCount; i++) {
    const raw = data[i] ?? 0;
    const v = raw / 255;
    const barHeight = v * cssH;
    const x = i * barWidth;
    const y = cssH - barHeight;
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = 0.35 + v * 0.65;
    ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = colors.textMuted;
  ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('Спектр воспроизведения', 12, cssH - 10);
}

export const AudioFileUploadModule: React.FC<ModuleProps<AudioFileUploadConfig>> = ({
  module,
  onUpdateConfig,
}) => {
  const config = module.config as AudioFileUploadConfig;
  const { theme } = useTheme();

  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<string>('Файл не выбран');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveWrapRef = useRef<HTMLDivElement>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const specCanvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef<Float32Array | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>();

  const stopPlayback = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = undefined;
    try {
      sourceRef.current?.stop();
    } catch {
      /* already stopped */
    }
    sourceRef.current = null;
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const decodeFile = useCallback(async (file: File) => {
    setError(null);
    setStatus('Декодирование…');
    stopPlayback();
    setBuffer(null);
    peaksRef.current = null;
    try {
      const ctx = new AudioContext();
      const ab = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(ab.slice(0));
      await ctx.close();
      setBuffer(audioBuffer);
      setFileName(file.name);
      setStatus('Готово к воспроизведению');
    } catch (e) {
      console.error(e);
      setError('Не удалось прочитать или декодировать файл.');
      setStatus('Ошибка');
      setFileName(null);
    }
  }, [stopPlayback]);

  useEffect(() => {
    if (!buffer) {
      peaksRef.current = null;
      return;
    }
    const ch0 = buffer.getChannelData(0);
    peaksRef.current = downsampleToPeaks(ch0, config.waveformBins);
  }, [buffer, config.waveformBins]);

  const redrawWaveform = useCallback(() => {
    const canvas = waveCanvasRef.current;
    const peaks = peaksRef.current;
    if (!canvas || !peaks?.length) return;
    drawWaveform(canvas, peaks, getCanvasThemeColors());
  }, []);

  useEffect(() => {
    redrawWaveform();
  }, [buffer, theme, config.waveformBins, redrawWaveform]);

  useEffect(() => {
    const el = waveWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => redrawWaveform());
    ro.observe(el);
    return () => ro.disconnect();
  }, [redrawWaveform, buffer]);

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (f) void decodeFile(f);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('audio/')) void decodeFile(f);
  };

  const startPlayback = useCallback(async () => {
    if (!buffer) return;
    stopPlayback();
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = config.fftSize;
    analyser.smoothingTimeConstant = 0.65;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    sourceRef.current = source;
    analyserRef.current = analyser;
    source.onended = () => {
      stopPlayback();
    };
    await ctx.resume();
    source.start(0);
    setIsPlaying(true);
    setStatus('Воспроизведение…');

    if (!config.showSpectrumWhilePlaying) return;

    const freq = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      const a = analyserRef.current;
      const specCanvas = specCanvasRef.current;
      if (!a || !specCanvas) return;
      a.getByteFrequencyData(freq);
      drawSpectrum(specCanvas, freq, getCanvasThemeColors());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [buffer, config.fftSize, config.showSpectrumWhilePlaying, stopPlayback]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const handleConfig = (updates: Partial<AudioFileUploadConfig>) => {
    onUpdateConfig(updates);
  };

  return (
    <div className="card bg-base-100 border border-base-200 shadow-sm rounded-box w-full">
      <div className="card-body p-4 md:p-6 gap-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="card-title text-lg text-base-content">{module.name}</h2>
          <p className="text-sm text-base-content/60 max-w-prose">{module.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary min-h-10"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Выбрать аудиофайл"
          >
            Выбрать файл
          </button>
          <button
            type="button"
            className="btn btn-outline btn-primary min-h-10"
            disabled={!buffer || isPlaying}
            onClick={() => void startPlayback()}
          >
            Слушать
          </button>
          <button
            type="button"
            className="btn btn-error min-h-10"
            disabled={!isPlaying}
            onClick={stopPlayback}
          >
            Стоп
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onFileChange}
        aria-hidden
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-base-300 rounded-box bg-base-200/50 hover:bg-base-200 transition-colors duration-200 p-6 text-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
        aria-label="Перетащите аудиофайл сюда или нажмите, чтобы выбрать"
      >
        <p className="text-base-content font-medium">Перетащите аудио сюда или нажмите для выбора</p>
        <p className="text-sm text-base-content/60 mt-2 tabular-nums">
          {fileName ? `Загружено: ${fileName}` : 'Поддерживаются распространённые форматы (WAV, MP3, OGG…).'}
        </p>
      </div>

      {error && (
        <div className="alert alert-error text-sm" role="alert">
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-1">
        <div className="form-control">
          <span className="label-text text-base-content/80 mb-2">Превью волны</span>
          <div
            ref={waveWrapRef}
            className="w-full rounded-box border border-base-300 overflow-hidden bg-base-300/30 min-h-[200px]"
          >
            <canvas ref={waveCanvasRef} className="w-full h-[200px] block" />
          </div>
        </div>

        {config.showSpectrumWhilePlaying && (
          <div className="form-control">
            <span className="label-text text-base-content/80 mb-2">Спектр при воспроизведении</span>
            <div className="w-full rounded-box border border-base-300 overflow-hidden bg-base-300/30 min-h-[160px]">
              <canvas ref={specCanvasRef} className="w-full h-[160px] block" />
            </div>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label" htmlFor={`${module.id}-fft`}>
            <span className="label-text">Размер FFT</span>
          </label>
          <select
            id={`${module.id}-fft`}
            className="select select-bordered select-sm w-full"
            value={config.fftSize}
            onChange={(e) =>
              handleConfig({ fftSize: Number(e.target.value) as AudioFileUploadConfig['fftSize'] })
            }
          >
            <option value={512}>512</option>
            <option value={1024}>1024</option>
            <option value={2048}>2048</option>
            <option value={4096}>4096</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label" htmlFor={`${module.id}-bins`}>
            <span className="label-text">Точек превью: {config.waveformBins}</span>
          </label>
          <input
            id={`${module.id}-bins`}
            type="range"
            min={128}
            max={2048}
            step={64}
            className="range range-primary range-sm w-full"
            value={config.waveformBins}
            onChange={(e) => handleConfig({ waveformBins: Number(e.target.value) })}
          />
        </div>
        <div className="form-control sm:col-span-2">
          <label className="label cursor-pointer justify-start gap-3 py-1">
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              checked={config.showSpectrumWhilePlaying}
              onChange={(e) => handleConfig({ showSpectrumWhilePlaying: e.target.checked })}
            />
            <span className="label-text">Показывать спектр во время воспроизведения</span>
          </label>
        </div>
      </div>

      <p className="text-sm text-base-content/60 tabular-nums">{status}</p>
      </div>
    </div>
  );
};
