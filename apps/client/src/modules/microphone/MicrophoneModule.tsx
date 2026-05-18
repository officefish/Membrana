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
import { MicrophoneCapturePanel } from './components/MicrophoneCapturePanel';

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

  useEffect(() => {
    return () => {
      releaseMediaStream(streamRef.current);
      streamRef.current = null;
      publishMicrophoneStream(module.id, null);
    };
  }, [module.id]);

  const isLive = stream !== null;
  const permissionDenied = error !== null && error.includes('запрещён');
  const trackLabel =
    isLive && stream ? stream.getAudioTracks()[0]?.label ?? null : null;

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
        <MicrophoneCapturePanel
          deviceSelectId={`${module.id}-mic-device`}
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          loadingDevices={loadingDevices}
          isLive={isLive}
          error={error}
          trackLabel={trackLabel}
          permissionDenied={permissionDenied}
          onSelectDevice={onDeviceSelect}
          onToggleStream={() => {
            if (isLive) stopStream();
            else void startStream();
          }}
          onRefreshDevices={() => void refreshDevices()}
        />

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
