import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ModuleProps, useMembranaStore } from '@membrana/agenda';
import { useShallow } from 'zustand/react/shallow';
import {
  acquireMicrophone,
  getAudioInputDevices,
  releaseMediaStream,
} from '@membrana/audio-engine-service';
import {
  FFT_INDICES_VIZ_PLUGIN_ID,
  FftIndicesVizPanel,
} from '../../plugins/fft-indices-viz';
import {
  SOUND_QUALITY_VIZ_PLUGIN_ID,
  SoundQualityVizPanel,
} from '../../plugins/sound-quality-viz';
import {
  FFT_THRESHOLD_TEST_PLUGIN_ID,
  FftThresholdTestPanel,
} from '../../plugins/fft-threshold-test';
import {
  HARMONIC_DETECTOR_VIZ_PLUGIN_ID,
  HarmonicDetectorVizPanel,
} from '../../plugins/harmonic-detector-viz';
import {
  MIC_STREAM_VIZ_PLUGIN_ID,
  MicStreamVizPluginPanel,
} from '../../plugins/microphone-stream-viz';
import {
  notifyMicrophoneCaptureChanged,
  registerMicrophoneCaptureOwner,
} from './microphoneCaptureCoordinator';
import { publishMicrophoneStream } from './microphoneStreamHub';

/**
 * Модуль «Микрофон» — точка входа в первичную обработку звука.
 *
 * ВАЖНО: модуль НЕ управляет AudioContext / AnalyserNode напрямую — это работа
 * `@membrana/audio-engine-service`. Здесь только:
 *  1. Получение списка устройств через engine (`getAudioInputDevices`).
 *  2. Захват MediaStream через engine (`acquireMicrophone`).
 *  3. Освобождение MediaStream через engine (`releaseMediaStream`).
 *  4. Публикация полученного MediaStream в hub для плагинов.
 *
 * Плагины подписываются на hub и при необходимости поднимают свой `LiveSampler`
 * на этом stream (см. `useMicStreamAnalysis`).
 */

export interface MicrophoneConfig {
  /** Пустая строка — устройство по умолчанию браузера */
  selectedDeviceId: string;
}

export const MicrophoneModule: React.FC<ModuleProps<MicrophoneConfig>> = ({
  module,
  onUpdateConfig,
}) => {
  const config = module.config as MicrophoneConfig;
  const selectedDeviceId = config.selectedDeviceId ?? '';

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const errorRef = useRef<string | null>(null);
  const isLiveRef = useRef(false);

  const activeIds = useMembranaStore(
    useShallow((state) => state.getModule(module.id)?.activePlugins ?? []),
  );

  const refreshDevices = useCallback(async () => {
    try {
      setLoadingDevices(true);
      const inputs = await getAudioInputDevices();
      setDevices(inputs);
      setError(null);
    } catch (e) {
      console.error(e);
      setError('Не удалось получить список устройств.');
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
    const md = navigator.mediaDevices;
    md.addEventListener('devicechange', refreshDevices);
    return () => md.removeEventListener('devicechange', refreshDevices);
  }, [refreshDevices]);

  const stopStream = useCallback(() => {
    releaseMediaStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
    publishMicrophoneStream(module.id, null);
    isLiveRef.current = false;
    notifyMicrophoneCaptureChanged();
  }, [module.id]);

  const startStream = useCallback(
    async (deviceIdOverride?: string) => {
      setError(null);
      const id = deviceIdOverride !== undefined ? deviceIdOverride : selectedDeviceId;
      try {
        const audio: MediaTrackConstraints | true = id
          ? { deviceId: { exact: id } }
          : true;
        const s = await acquireMicrophone(audio);
        // Останавливаем предыдущий поток ПОСЛЕ успешного получения нового.
        releaseMediaStream(streamRef.current);
        streamRef.current = s;
        setStream(s);
        publishMicrophoneStream(module.id, s);
        isLiveRef.current = true;
        notifyMicrophoneCaptureChanged();
        void refreshDevices();
      } catch (e) {
        console.error(e);
        setError(
          e instanceof DOMException && e.name === 'NotAllowedError'
            ? 'Доступ к микрофону запрещён. Разрешите запись в настройках браузера.'
            : 'Не удалось запустить поток с выбранного устройства.',
        );
      }
    },
    [module.id, selectedDeviceId, refreshDevices],
  );

  // Cleanup при размонтировании модуля.
  useEffect(() => {
    return () => {
      releaseMediaStream(streamRef.current);
      streamRef.current = null;
      publishMicrophoneStream(module.id, null);
    };
  }, [module.id]);

  const isLive = stream !== null;

  useEffect(() => {
    errorRef.current = error;
    isLiveRef.current = isLive;
    notifyMicrophoneCaptureChanged();
  }, [error, isLive]);

  useEffect(() => {
    return registerMicrophoneCaptureOwner({
      start: () => startStream(),
      stop: stopStream,
      getSnapshot: () => ({
        isLive: isLiveRef.current,
        error: errorRef.current,
      }),
    });
  }, [startStream, stopStream]);

  const onDeviceSelect = (deviceId: string): void => {
    onUpdateConfig({ selectedDeviceId: deviceId });
    if (isLive) {
      void startStream(deviceId);
    }
  };

  return (
    <div className="card bg-base-100 border border-base-200 shadow-sm rounded-box w-full">
      <div className="card-body p-4 md:p-6 gap-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="badge badge-outline text-base-content/80 tabular-nums">
            {isLive ? 'Поток активен' : 'Поток остановлен'}
          </div>
        </div>

        {error && (
          <div className="alert alert-error text-sm" role="alert">
            <span>{error}</span>
          </div>
        )}

        <div className="form-control w-full">
          <label className="label" htmlFor={`${module.id}-mic-device`}>
            <span className="label-text">Источник звука</span>
          </label>
          <select
            id={`${module.id}-mic-device`}
            className="select select-bordered select-sm w-full"
            disabled={loadingDevices || (!loadingDevices && devices.length === 0)}
            value={selectedDeviceId}
            onChange={(e) => onDeviceSelect(e.target.value)}
          >
            {loadingDevices && <option value="">Загрузка…</option>}
            {!loadingDevices && (
              <option value="">По умолчанию (система)</option>
            )}
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Микрофон ${d.deviceId.slice(0, 8)}…`}
              </option>
            ))}
          </select>
          <label className="label">
            <span className="label-text-alt text-base-content/50">
              После первого запуска браузер обычно показывает имена устройств.
            </span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn min-h-10 ${isLive ? 'btn-error' : 'btn-primary'}`}
            disabled={loadingDevices}
            onClick={() => {
              if (isLive) stopStream();
              else void startStream();
            }}
          >
            {isLive ? 'Остановить поток' : 'Запустить поток'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-outline min-h-10"
            onClick={() => void refreshDevices()}
          >
            Обновить список устройств
          </button>
        </div>

        {isLive && stream && (
          <p className="text-sm text-base-content/60 tabular-nums">
            Активных дорожек: {stream.getAudioTracks().length}
            {stream.getAudioTracks()[0]?.label && ` · ${stream.getAudioTracks()[0]!.label}`}
          </p>
        )}

        <div className="rounded-box border border-base-300 bg-base-200/40 p-3 text-xs text-base-content/70">
          <p className="font-medium text-base-content/80 mb-1">Плагины</p>
          <p>
            Поток публикуется через{' '}
            <code className="text-primary">publishMicrophoneStream</code> /{' '}
            <code className="text-primary">subscribeMicrophoneStream</code> в{' '}
            <code className="text-xs">microphoneStreamHub.ts</code>. Получение
            устройств и MediaStream идёт через{' '}
            <code className="text-xs">@membrana/audio-engine-service</code>,
            модуль не управляет Web Audio напрямую.
          </p>
        </div>

        {activeIds.includes(MIC_STREAM_VIZ_PLUGIN_ID) && (
          <MicStreamVizPluginPanel moduleId={module.id} />
        )}

        {activeIds.includes(FFT_THRESHOLD_TEST_PLUGIN_ID) && (
          <FftThresholdTestPanel moduleId={module.id} />
        )}

        {activeIds.includes(FFT_INDICES_VIZ_PLUGIN_ID) && (
          <FftIndicesVizPanel moduleId={module.id} />
        )}

        {activeIds.includes(SOUND_QUALITY_VIZ_PLUGIN_ID) && (
          <SoundQualityVizPanel moduleId={module.id} />
        )}

        {activeIds.includes(HARMONIC_DETECTOR_VIZ_PLUGIN_ID) && (
          <HarmonicDetectorVizPanel moduleId={module.id} />
        )}
      </div>
    </div>
  );
};
