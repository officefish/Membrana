import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ModuleProps, useTheme } from '@membrana/agenda';
import {
  useAudioFile,
  useBufferPlayer,
} from '@membrana/audio-engine-service';
import { downsampleToPeaks } from '../utils/downsamplePeaks';
import { getCanvasThemeColors } from '@membrana/audio-data-viz';

/**
 * AudioFileUploadModule — загрузка аудиофайла и его воспроизведение.
 *
 * Web Audio (AudioContext, decodeAudioData, BufferSourceNode, AnalyserNode)
 * НЕ управляется здесь напрямую. Engine отвечает за всё:
 *   - useAudioFile()        — декодирование File/Blob → AudioBuffer.
 *   - useBufferPlayer()     — воспроизведение AudioBuffer + поток frames + AnalyserNode.
 *
 * Этот модуль остаётся «чисто пользовательским»: волна (превью), спектр
 * во время воспроизведения, кнопки «Слушать» / «Стоп».
 */

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
  colors: ReturnType<typeof getCanvasThemeColors>,
): void {
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
  colors: ReturnType<typeof getCanvasThemeColors>,
): void {
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
  const [status, setStatus] = useState<string>('Файл не выбран');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveWrapRef = useRef<HTMLDivElement>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const specCanvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef<Float32Array | null>(null);

  // Декодирование через engine — никаких new AudioContext().
  const fileLoader = useAudioFile();

  // Воспроизведение и анализ через engine. На каждом кадре читаем
  // частотные данные из engine'ового AnalyserNode и рисуем спектр.
  const player = useBufferPlayer({
    config: { bufferSize: config.fftSize, smoothingTimeConstant: 0.65 },
    onFrame: () => {
      const an = player.analyserNode;
      const specCanvas = specCanvasRef.current;
      if (!an || !specCanvas) return;
      const freq = new Uint8Array(an.frequencyBinCount);
      an.getByteFrequencyData(freq);
      drawSpectrum(specCanvas, freq, getCanvasThemeColors());
    },
    onEnded: () => setStatus('Воспроизведение завершено'),
  });

  const decodeFile = useCallback(
    async (file: File) => {
      setError(null);
      setStatus('Декодирование…');
      void player.stop();
      peaksRef.current = null;
      try {
        await fileLoader.load(file);
        setFileName(file.name);
        setStatus('Готово к воспроизведению');
      } catch (e) {
        console.error(e);
        setError('Не удалось прочитать или декодировать файл.');
        setStatus('Ошибка');
        setFileName(null);
      }
    },
    [fileLoader, player],
  );

  // Обновляем огибающую при появлении/смене буфера или изменении waveformBins.
  useEffect(() => {
    if (!fileLoader.buffer) {
      peaksRef.current = null;
      return;
    }
    const ch0 = fileLoader.buffer.getChannelData(0);
    peaksRef.current = downsampleToPeaks(ch0, config.waveformBins);
  }, [fileLoader.buffer, config.waveformBins]);

  const redrawWaveform = useCallback(() => {
    const canvas = waveCanvasRef.current;
    const peaks = peaksRef.current;
    if (!canvas || !peaks?.length) return;
    drawWaveform(canvas, peaks, getCanvasThemeColors());
  }, []);

  useEffect(() => {
    redrawWaveform();
  }, [fileLoader.buffer, theme, config.waveformBins, redrawWaveform]);

  useEffect(() => {
    const el = waveWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => redrawWaveform());
    ro.observe(el);
    return () => ro.disconnect();
  }, [redrawWaveform, fileLoader.buffer]);

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
    const buf = fileLoader.buffer;
    if (!buf) return;
    try {
      await player.play(buf);
      setStatus('Воспроизведение…');
    } catch (e) {
      console.error(e);
      setError('Не удалось запустить воспроизведение.');
    }
  }, [fileLoader.buffer, player]);

  const stopPlayback = useCallback(() => {
    void player.stop();
  }, [player]);

  const handleConfig = (updates: Partial<AudioFileUploadConfig>): void => {
    onUpdateConfig(updates);
  };

  const isPlaying = player.isPlaying;
  const hasBuffer = fileLoader.buffer !== null;

  return (
    <div className="card bg-base-100 border border-base-200 shadow-sm rounded-box w-full">
      <div className="card-body p-4 md:p-6 gap-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
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
            disabled={!hasBuffer || isPlaying}
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
          <p className="text-base-content font-medium">
            Перетащите аудио сюда или нажмите для выбора
          </p>
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
              <span className="label-text text-base-content/80 mb-2">
                Спектр при воспроизведении
              </span>
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
                handleConfig({
                  fftSize: Number(e.target.value) as AudioFileUploadConfig['fftSize'],
                })
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
                onChange={(e) =>
                  handleConfig({ showSpectrumWhilePlaying: e.target.checked })
                }
              />
              <span className="label-text">Показывать спектр во время воспроизведения</span>
            </label>
          </div>
        </div>

        <p className="text-sm text-base-content/60 tabular-nums">
          {fileLoader.isLoading ? 'Декодирование…' : status}
        </p>
      </div>
    </div>
  );
};
