import { useEffect, useMemo, useState } from 'react';
import {
  DeviceBoardModeProvider,
  DeviceBoardShell,
} from '@membrana/device-board';

import { fetchMediaSession, type MediaSessionDevice } from '@/api/sampleLibrary';
import { createCabinetDeviceBoardPersistAdapter } from '@/lib/cabinetDeviceScenario';

interface DeviceBoardPageProps {
  onBack: () => void;
}

export function DeviceBoardPage({ onBack }: DeviceBoardPageProps) {
  const [devices, setDevices] = useState<MediaSessionDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchMediaSession()
      .then((session) => {
        if (cancelled) return;
        setDevices(session.devices);
        const first = session.devices[0]?.deviceId ?? null;
        setDeviceId(first);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Не удалось загрузить устройства');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistAdapter = useMemo(
    () => (deviceId !== null ? createCabinetDeviceBoardPersistAdapter(deviceId) : undefined),
    [deviceId],
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" aria-label="Загрузка" />
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  if (deviceId === null || devices.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Device board</h1>
        <p className="text-sm text-base-content/70">
          Нет paired-устройств. Создайте ключ доступа и подключите полевой клиент.
        </p>
        <button type="button" className="btn btn-outline" onClick={onBack}>
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-base-100">
      <div className="absolute left-4 top-4 z-[60] flex items-center gap-2 rounded-lg border border-base-300 bg-base-100/95 px-3 py-2 shadow">
        <label className="text-xs text-base-content/60" htmlFor="cabinet-device-select">
          Устройство
        </label>
        <select
          id="cabinet-device-select"
          className="select select-bordered select-xs"
          value={deviceId}
          onChange={(event) => setDeviceId(event.target.value)}
        >
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.nodeLabel} ({device.deviceId.slice(0, 8)}…)
            </option>
          ))}
        </select>
      </div>
      <DeviceBoardModeProvider>
        <DeviceBoardShell
          key={deviceId}
          persistAdapter={persistAdapter}
          onRequestExit={onBack}
          exitLabel="Назад в кабинет"
          showRunControls={false}
        />
      </DeviceBoardModeProvider>
    </div>
  );
}
