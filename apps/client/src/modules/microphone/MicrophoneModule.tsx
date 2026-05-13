import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ModuleProps, useMembranaStore } from '@membrana/agenda';
import { useShallow } from 'zustand/react/shallow';
import {
  MIC_STREAM_VIZ_PLUGIN_ID,
  MicStreamVizPluginPanel,
} from '../../plugins/microphone-stream-viz';
import { publishMicrophoneStream } from './microphoneStreamHub';

export interface MicrophoneConfig {
  /** Пустая строка — устройство по умолчанию браузера */
  selectedDeviceId: string;
}

function listAudioInputs(): Promise<MediaDeviceInfo[]> {
  return navigator.mediaDevices
    .enumerateDevices()
    .then((list) => list.filter((d) => d.kind === 'audioinput'));
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

  const activeIds = useMembranaStore(
    useShallow((state) => state.getModule(module.id)?.activePlugins ?? []),
  );

  const refreshDevices = useCallback(async () => {
    try {
      setLoadingDevices(true);
      const inputs = await listAudioInputs();
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
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
    setStream(null);
    publishMicrophoneStream(module.id, null);
  }, [module.id]);

  const startStream = useCallback(
    async (deviceIdOverride?: string) => {
      setError(null);
      const id = deviceIdOverride !== undefined ? deviceIdOverride : selectedDeviceId;
      try {
        const audio: MediaTrackConstraints | boolean = id ? { deviceId: { exact: id } } : true;
        const s = await navigator.mediaDevices.getUserMedia({ audio });
        stopStream();
        streamRef.current = s;
        setStream(s);
        publishMicrophoneStream(module.id, s);
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
    [module.id, selectedDeviceId, stopStream, refreshDevices],
  );

  useEffect(() => {
    return () => {
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach((t) => t.stop());
      }
      streamRef.current = null;
      publishMicrophoneStream(module.id, null);
    };
  }, [module.id]);

  const isLive = stream !== null;

  const onDeviceSelect = (deviceId: string) => {
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
          <button type="button" className="btn btn-ghost btn-outline min-h-10" onClick={() => void refreshDevices()}>
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
            <code className="text-xs">microphoneStreamHub.ts</code>. В{' '}
            <code className="text-xs">install()</code> плагина вызовите{' '}
            <code className="text-xs">subscribeMicrophoneStream(context.moduleId, …)</code> и сохраните функцию
            отписки. Включение плагинов и их настройки — во вкладке «Плагины» в боковой панели.
          </p>
        </div>

        {activeIds.includes(MIC_STREAM_VIZ_PLUGIN_ID) && (
          <MicStreamVizPluginPanel moduleId={module.id} />
        )}
      </div>
    </div>
  );
};
