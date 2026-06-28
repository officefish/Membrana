import { useEffect, useMemo, useState } from 'react';
import {
  DeviceBoardModeProvider,
  DeviceBoardShell,
} from '@membrana/device-board';

import { fetchMediaSession, type MediaSessionDevice } from '@/api/sampleLibrary';
import { fetchMembraneMe } from '@/api/membrane';
import { createCabinetDeviceBoardPersistAdapter, fetchDeviceScenarioRecord } from '@/lib/cabinetDeviceScenario';
import { useCabinetEditLease } from '@/lib/useCabinetEditLease';
import { useCabinetNodeRuntime } from '@/lib/useCabinetNodeRuntime';

interface DeviceBoardPageProps {
  onBack: () => void;
}

export function DeviceBoardPage({ onBack }: DeviceBoardPageProps) {
  const [devices, setDevices] = useState<MediaSessionDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [scenarioRevision, setScenarioRevision] = useState(0);
  const [membraneId, setMembraneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const runtime = useCabinetNodeRuntime(membraneId);
  const deviceLive = runtime.isDeviceLive(deviceId);

  useCabinetEditLease(nodeId, scenarioRevision);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([fetchMediaSession(), fetchMembraneMe()])
      .then(([session, me]) => {
        if (cancelled) return;
        setDevices(session.devices);
        setMembraneId(me.membrane.id);
        const first = session.devices[0] ?? null;
        setDeviceId(first?.deviceId ?? null);
        setNodeId(first?.nodeId ?? null);
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

  useEffect(() => {
    if (deviceId === null) {
      setScenarioRevision(0);
      return undefined;
    }
    let cancelled = false;
    void fetchDeviceScenarioRecord(deviceId)
      .then((record) => {
        if (cancelled) return;
        setScenarioRevision(record?.document.version ?? 0);
      })
      .catch(() => {
        if (!cancelled) setScenarioRevision(0);
      });
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  const handleDeviceChange = (nextDeviceId: string) => {
    setDeviceId(nextDeviceId);
    const next = devices.find((device) => device.deviceId === nextDeviceId);
    setNodeId(next?.nodeId ?? null);
  };

  const persistAdapter = useMemo(
    () => (deviceId !== null ? createCabinetDeviceBoardPersistAdapter(deviceId) : undefined),
    [deviceId],
  );

  const cabinetServerFirstState = useMemo(
    () =>
      deviceId !== null
        ? {
            deviceId,
            editLease: {
              deviceId,
              holder: 'cabinet' as const,
              sessionId: 'cabinet-editor',
              revision: scenarioRevision,
              expiresAt: null,
            },
            captureState: null,
          }
        : null,
    [deviceId, scenarioRevision],
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
    <div className="fixed inset-0 z-50 flex flex-col bg-base-100">
      <div className="absolute left-4 top-4 z-[60] flex items-center gap-2 rounded-lg border border-base-300 bg-base-100/95 px-3 py-2 shadow">
        <label className="text-xs text-base-content/60" htmlFor="cabinet-device-select">
          Устройство
        </label>
        <select
          id="cabinet-device-select"
          className="select select-bordered select-xs"
          value={deviceId}
          onChange={(event) => handleDeviceChange(event.target.value)}
        >
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.nodeLabel} ({device.deviceId.slice(0, 8)}…)
            </option>
          ))}
        </select>
      </div>
      <DeviceBoardModeProvider>
        <div className="min-h-0 flex-1">
          <DeviceBoardShell
            key={deviceId}
            persistAdapter={persistAdapter}
            onRequestExit={onBack}
            exitLabel="Назад в кабинет"
            showRunControls={false}
            deviceLive={deviceLive}
            serverFirstState={cabinetServerFirstState}
            serverFirstPerspective="cabinet"
          />
        </div>
      </DeviceBoardModeProvider>
    </div>
  );
}
