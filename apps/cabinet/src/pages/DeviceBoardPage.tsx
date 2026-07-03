import { useEffect, useMemo, useState } from 'react';
import {
  DeviceBoardModeProvider,
  DeviceBoardShell,
} from '@membrana/device-board';

import { fetchMediaSession, type MediaSessionDevice } from '@/api/sampleLibrary';
import { fetchMembraneMe } from '@/api/membrane';
import type { DeviceCaptureMode } from '@/api/deviceCapture';
import { createCabinetDeviceBoardPersistAdapter } from '@/lib/cabinetDeviceScenario';
import { useCabinetNodeRuntime } from '@/lib/useCabinetNodeRuntime';

interface DeviceBoardPageProps {
  onBack: () => void;
}

/**
 * Кабинетский device-board в тарифе v2 (CT7, канон v2.0 §1):
 * просмотр сценария + явный захват и пуск/стоп из самого борда.
 * // Tariff v3: редактирование с сервера (edit lease).
 */
export function DeviceBoardPage({ onBack }: DeviceBoardPageProps) {
  const [devices, setDevices] = useState<MediaSessionDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [membraneId, setMembraneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<DeviceCaptureMode>('soft');
  const [captureBusy, setCaptureBusy] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const runtime = useCabinetNodeRuntime(membraneId);
  const deviceLive = runtime.isDeviceLive(deviceId);

  const capture = deviceId !== null ? runtime.captures[deviceId] : undefined;
  const isCaptured = capture !== undefined;
  const isRunning = (deviceId !== null && runtime.states[deviceId]?.isRunning) ?? false;

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

  const handleDeviceChange = (nextDeviceId: string) => {
    setDeviceId(nextDeviceId);
    setCaptureError(null);
    const next = devices.find((device) => device.deviceId === nextDeviceId);
    setNodeId(next?.nodeId ?? null);
  };

  const handleCapture = async () => {
    if (nodeId === null) return;
    setCaptureBusy(true);
    setCaptureError(null);
    try {
      await runtime.captureDevice(nodeId, captureMode);
    } catch (e) {
      setCaptureError(e instanceof Error ? e.message : 'Не удалось захватить устройство');
    } finally {
      setCaptureBusy(false);
    }
  };

  const handleRelease = async () => {
    if (nodeId === null) return;
    setCaptureBusy(true);
    setCaptureError(null);
    try {
      await runtime.releaseDevice(nodeId);
    } catch (e) {
      setCaptureError(e instanceof Error ? e.message : 'Не удалось отпустить устройство');
    } finally {
      setCaptureBusy(false);
    }
  };

  const persistAdapter = useMemo(
    () => (deviceId !== null ? createCabinetDeviceBoardPersistAdapter(deviceId) : undefined),
    [deviceId],
  );

  // CT7: без fake edit lease — состояние захвата v2 даёт бейджи и read-only.
  const cabinetServerFirstState = useMemo(
    () =>
      deviceId !== null
        ? {
            deviceId,
            editLease: null,
            captureState: null,
            capture: capture
              ? {
                  mode: capture.mode,
                  sessionId: capture.sessionId,
                  expiresAt: capture.expiresAt,
                }
              : null,
          }
        : null,
    [capture, deviceId],
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
      <div className="absolute left-4 top-4 z-[60] flex flex-wrap items-center gap-2 rounded-lg border border-base-300 bg-base-100/95 px-3 py-2 shadow">
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
        {/* CT3/CT7 (канон §1): захват и пуск/стоп доступны и из самого борда. */}
        {!isCaptured ? (
          <>
            <button
              type="button"
              className="btn btn-xs btn-primary"
              disabled={!deviceLive || captureBusy || nodeId === null}
              title={!deviceLive ? 'Устройство offline' : undefined}
              onClick={() => void handleCapture()}
            >
              Захватить
            </button>
            <select
              className="select select-bordered select-xs"
              value={captureMode}
              onChange={(event) => setCaptureMode(event.target.value as DeviceCaptureMode)}
              aria-label="Режим захвата устройства"
            >
              <option value="soft">мягкий</option>
              <option value="hard">жёсткий</option>
            </select>
          </>
        ) : (
          <>
            {!isRunning ? (
              <button
                type="button"
                className="btn btn-xs btn-primary"
                disabled={!deviceLive}
                title="Запустить сохранённый сценарий устройства"
                onClick={() => runtime.run(deviceId)}
              >
                Пуск
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-xs btn-error"
                title="Остановить с плавным затуханием (200 мс)"
                onClick={() => runtime.stop(deviceId)}
              >
                Стоп
              </button>
            )}
            <button
              type="button"
              className="btn btn-xs btn-outline"
              disabled={captureBusy}
              title="Отпустить управление; играющий сценарий продолжит играть"
              onClick={() => void handleRelease()}
            >
              Отпустить
            </button>
          </>
        )}
        {captureError ? <span className="text-xs text-error">{captureError}</span> : null}
      </div>
      <DeviceBoardModeProvider
        initialSession={{ kind: 'cabinet-view', title: 'Просмотр из кабинета (тариф v2)' }}
      >
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
