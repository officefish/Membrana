import { useCallback, useEffect, useMemo } from 'react';
import { useMembranaStore } from '@membrana/agenda';
import type { MediaLibraryCaptureFormat, MediaLibraryRecordingMode, MediaLibraryStorageMode } from '@membrana/media-library-service';

import { requestClearMediaLibraryBuffer } from '../../lib/mediaLibraryHubBridge';

import { RecordingProgress } from './components/RecordingProgress';
import {
  micBufferRecorderPluginState,
  requestSetMicBufferMode,
  requestStartManualRecording,
  requestStopManualRecording,
} from './micBufferRecorderPluginState';
import {
  AUTO_SEGMENT_PRESETS_SEC,
  MANUAL_DURATION_PRESETS_SEC,
  MAX_AUTO_PAUSE_SEC,
  MIC_BUFFER_RECORDER_PLUGIN_ID,
  MIN_AUTO_PAUSE_SEC,
  defaultMicBufferRecorderConfig,
  resolveMicBufferRecorderConfig,
  type MicBufferRecorderPluginConfig,
} from './types';
import { formatCaptureLabel, isCaptureFormatSupported, pickFallbackCaptureFormat } from './recordingUtils';
import { useMicBufferRecorder } from './useMicBufferRecorder';

interface Props {
  readonly moduleId: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const BUFFER_STORAGE_HINT: Record<MediaLibraryStorageMode, string> = {
  'remote-server': 'Буфер на media-server — записи сохраняются между сессиями.',
  'electron-fs': 'Буфер на диске (настольное приложение).',
  'browser-limited-fallback':
    'Локальный буфер сессии — данные пропадут при перезагрузке. Подключите сервер или используйте desktop.',
};

export function MicBufferRecorderPanel({ moduleId }: Props) {
  const snapshot = useMicBufferRecorder();
  const rawConfig = useMembranaStore((s) =>
    s.getPlugin(moduleId, MIC_BUFFER_RECORDER_PLUGIN_ID)?.config,
  );
  const updatePluginConfig = useMembranaStore((s) => s.updatePluginConfig);
  const config = useMemo(
    () => resolveMicBufferRecorderConfig(rawConfig ?? defaultMicBufferRecorderConfig),
    [rawConfig],
  );

  useEffect(() => {
    micBufferRecorderPluginState.syncConfig({
      mode: snapshot.mode,
      format: config.defaultFormat,
      manualPresetSec: config.manualPresetSec,
      autoSegmentSec: config.autoSegmentSec,
      pauseSec: config.pauseSec,
      effectiveFormat: pickFallbackCaptureFormat(config.defaultFormat),
    });
  }, [config, snapshot.mode]);

  const patchConfig = useCallback(
    (updates: Partial<MicBufferRecorderPluginConfig>) => {
      updatePluginConfig<MicBufferRecorderPluginConfig>(
        moduleId,
        MIC_BUFFER_RECORDER_PLUGIN_ID,
        updates,
      );
    },
    [moduleId, updatePluginConfig],
  );

  const quotaPercent =
    snapshot.limitBytes > 0
      ? Math.min(100, Math.round((snapshot.usedBytes / snapshot.limitBytes) * 100))
      : 0;

  const setMode = (mode: MediaLibraryRecordingMode): void => {
    patchConfig({ defaultMode: mode });
    requestSetMicBufferMode(mode);
  };

  const onClearBuffer = (): void => {
    if (!window.confirm('Очистить буфер __buffer__? Сэмплы будут удалены без восстановления.')) {
      return;
    }
    void requestClearMediaLibraryBuffer().catch((err: unknown) => {
      micBufferRecorderPluginState.setError(
        err instanceof Error ? err.message : 'Не удалось очистить буфер',
      );
    });
  };

  const recordingDisabled =
    !snapshot.streamLive || snapshot.recordingBlocked || snapshot.isRecording;

  const autoActive = snapshot.mode === 'auto' && snapshot.streamLive && !snapshot.recordingBlocked;

  return (
    <div className="rounded-box border border-base-300 bg-base-200/30 p-4 flex flex-col gap-4">
      <p className="text-xs uppercase tracking-wide text-base-content/50">
        Запись в буфер
      </p>

      {snapshot.error ? (
        <div className="alert alert-error text-sm py-2" role="alert">
          {snapshot.error}
        </div>
      ) : null}

      {!snapshot.streamLive ? (
        <p className="text-sm text-base-content/60">
          Запустите поток микрофона выше, чтобы записывать клипы.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-xs text-base-content/60">Режим</span>
        <div className="join">
          <button
            type="button"
            className={`btn btn-sm join-item ${snapshot.mode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('manual')}
          >
            Ручной
          </button>
          <button
            type="button"
            className={`btn btn-sm join-item ${snapshot.mode === 'auto' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('auto')}
          >
            Авто
          </button>
        </div>
      </div>

      {snapshot.mode === 'manual' ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm min-h-9"
              disabled={recordingDisabled}
              onClick={() => requestStartManualRecording()}
            >
              Старт
            </button>
            <button
              type="button"
              className="btn btn-error btn-sm min-h-9"
              disabled={!snapshot.isRecording}
              onClick={() => requestStopManualRecording()}
            >
              Стоп
            </button>
          </div>
          {snapshot.isRecording ? (
            <RecordingProgress
              elapsedSec={snapshot.elapsedSec}
              targetDurationSec={snapshot.targetDurationSec}
            />
          ) : null}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-base-content/60">Длительность (макс. 30 с)</span>
            <div className="flex flex-wrap gap-1">
              {MANUAL_DURATION_PRESETS_SEC.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  className={`btn btn-xs ${config.manualPresetSec === sec ? 'btn-primary' : 'btn-ghost'}`}
                  disabled={snapshot.isRecording}
                  onClick={() => patchConfig({ manualPresetSec: sec })}
                >
                  {sec} с
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {autoActive ? (
            <span className="badge badge-success badge-outline gap-1.5 w-fit">
              <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse" aria-hidden />
              Автозапись активна
            </span>
          ) : null}

          {snapshot.isRecording ? (
            <RecordingProgress
              elapsedSec={snapshot.elapsedSec}
              targetDurationSec={snapshot.targetDurationSec}
              label="Автозапись отрезка"
            />
          ) : autoActive ? (
            <p className="text-xs text-base-content/60">
              Пауза {config.pauseSec.toFixed(1)} с до следующего отрезка ({config.autoSegmentSec} с)
            </p>
          ) : null}

          <div className="flex flex-col gap-1">
            <span className="text-xs text-base-content/60">Длина отрезка</span>
            <div className="flex flex-wrap gap-1">
              {AUTO_SEGMENT_PRESETS_SEC.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  className={`btn btn-xs ${config.autoSegmentSec === sec ? 'btn-primary' : 'btn-ghost'}`}
                  disabled={snapshot.isRecording}
                  onClick={() => patchConfig({ autoSegmentSec: sec })}
                >
                  {sec} с
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-base-content/60" htmlFor={`pause-${moduleId}`}>
              Пауза между отрезками: {config.pauseSec.toFixed(1)} с
            </label>
            <input
              id={`pause-${moduleId}`}
              type="range"
              min={MIN_AUTO_PAUSE_SEC}
              max={MAX_AUTO_PAUSE_SEC}
              step={0.5}
              className="range range-primary range-xs"
              value={config.pauseSec}
              disabled={snapshot.isRecording}
              onChange={(e) => patchConfig({ pauseSec: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-xs text-base-content/60">Формат</span>
        <select
          className="select select-bordered select-sm w-full max-w-xs"
          value={config.defaultFormat}
          disabled={snapshot.isRecording}
          onChange={(e) =>
            patchConfig({ defaultFormat: e.target.value as MediaLibraryCaptureFormat })
          }
        >
          {(['wav', 'webm', 'mp4'] as const).map((format) => (
            <option key={format} value={format} disabled={!isCaptureFormatSupported(format)}>
              {formatCaptureLabel(format)}
              {!isCaptureFormatSupported(format) ? ' (недоступен)' : ''}
            </option>
          ))}
        </select>
        {config.defaultFormat !== snapshot.effectiveFormat ? (
          <p className="text-xs text-warning">
            Используется {formatCaptureLabel(snapshot.effectiveFormat)} — выбранный формат недоступен.
          </p>
        ) : null}
      </div>

      <div className="rounded-box border border-base-300 bg-base-100/40 p-3 flex flex-col gap-2">
        <p
          className={`text-xs ${
            snapshot.storageMode === 'browser-limited-fallback'
              ? 'text-warning'
              : 'text-base-content/70'
          }`}
        >
          {BUFFER_STORAGE_HINT[snapshot.storageMode]}
        </p>
        <div className="flex justify-between text-xs text-base-content/70">
          <span>Память буфера</span>
          <span className="tabular-nums">
            {formatBytes(snapshot.usedBytes)} / {formatBytes(snapshot.limitBytes)}
          </span>
        </div>
        <progress
          className="progress progress-primary w-full"
          value={quotaPercent}
          max={100}
          aria-label="Заполнение квоты буфера"
        />
        <p className="text-xs text-base-content/60">
          {snapshot.storageMode === 'browser-limited-fallback'
            ? `${snapshot.sampleCount} / ${snapshot.maxBufferSamples} сэмплов в __buffer__`
            : `${snapshot.sampleCount} сэмплов в __buffer__`}
        </p>
        {snapshot.recordingBlocked ? (
          <p className="text-xs text-error">
            {snapshot.storageMode === 'browser-limited-fallback'
              ? 'Запись заблокирована — квота или лимит сэмплов.'
              : 'Запись заблокирована — квота буфера исчерпана.'}
          </p>
        ) : null}
        <button
          type="button"
          className="btn btn-outline btn-error btn-sm"
          disabled={snapshot.sampleCount === 0}
          onClick={onClearBuffer}
        >
          Очистить буфер
        </button>
      </div>
    </div>
  );
}
