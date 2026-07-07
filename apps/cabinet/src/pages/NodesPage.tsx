import { useCallback, useEffect, useMemo, useState } from 'react';
import { createNode, deleteNode, fetchMembraneMe, type MembraneView, type NodeView } from '@/api/membrane';
import type { DeviceCaptureMode } from '@/api/deviceCapture';
import { isNodeLimitReachedView } from '@/lib/nodeListView';
import { DEVICE_OFFLINE_RUN_HINT } from '@/lib/isDeviceLive';
import { useCabinetNodeRuntime } from '@/lib/useCabinetNodeRuntime';
import { useCabinetNodesJournalPreview, type NodeJournalPreviewState } from '@/lib/useCabinetNodesJournalPreview';
import { NodeLastTrackPreview } from '@/components/nodes/NodeLastTrackPreview';

interface NodesPageProps {
  onOpenJournal: () => void;
  onOpenDeviceBoard: () => void;
  onOpenKeys?: (nodeId: string) => void;
}

export function NodesPage({ onOpenJournal, onOpenDeviceBoard, onOpenKeys }: NodesPageProps) {
  const [data, setData] = useState<MembraneView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const membraneId = data?.membrane.id ?? null;
  const runtime = useCabinetNodeRuntime(membraneId);
  const deviceIds = useMemo(
    () =>
      (data?.nodes ?? [])
        .map((node) => node.device?.mediaDeviceId ?? null)
        .filter((id): id is string => id != null),
    [data?.nodes],
  );
  const journalPreview = useCabinetNodesJournalPreview(membraneId, deviceIds);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchMembraneMe());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreateNode = async () => {
    setBusy(true);
    setError(null);
    try {
      await createNode();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать узел');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteNode = async (node: NodeView) => {
    const activeKeys = node.accessKeys.filter((key) => key.active).length;
    const message =
      activeKeys > 0
        ? `Удалить узел «${node.label}»? Будет отозвано активных ключей: ${activeKeys}. Сопряжение с устройством разорвётся.`
        : `Удалить узел «${node.label}»? Сопряжение и ключи узла будут удалены.`;
    if (!window.confirm(message)) return;

    setBusy(true);
    setError(null);
    try {
      await deleteNode(node.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить узел');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <span className="loading loading-spinner loading-md" aria-label="Загрузка" />;
  }

  const nodes = data?.nodes ?? [];
  const limitReached = data ? isNodeLimitReachedView(nodes.length, data.membrane.tariff.maxNodesPerMembrane) : true;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Узлы</h1>
        <p className="mt-2 text-base-content/70">
          Узел связывает мембрану с полевым клиентом. Запускайте мониторинг и переключайте режим
          тревоги по сети. Ключи доступа — в разделе «Ключи».
        </p>
        <p className="mt-1 text-xs text-base-content/50">
          Связь с узлами: {runtimeConnectionLabel(runtime.connection)}
        </p>
      </div>

      {error ? (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      ) : null}

      {nodes.length === 0 ? (
        <div className="card bg-base-200">
          <div className="card-body">
            <p>Пока нет узлов.</p>
            <button
              type="button"
              className="btn btn-primary w-fit"
              disabled={busy}
              onClick={() => void handleCreateNode()}
            >
              Создать узел
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              runtime={runtime}
              journalPreview={journalPreview.getPreview(node.device?.mediaDeviceId ?? '')}
              busy={busy}
              onOpenJournal={onOpenJournal}
              onOpenDeviceBoard={onOpenDeviceBoard}
              onOpenKeys={onOpenKeys}
              onDelete={() => void handleDeleteNode(node)}
            />
          ))}

          <button
            type="button"
            className="btn btn-outline w-fit"
            disabled={busy || limitReached}
            title={limitReached ? `Достигнут лимит тарифа (${data?.membrane.tariff.maxNodesPerMembrane})` : undefined}
            onClick={() => void handleCreateNode()}
          >
            Добавить узел
          </button>
        </div>
      )}
    </div>
  );
}

function runtimeConnectionLabel(state: ReturnType<typeof useCabinetNodeRuntime>['connection']): string {
  switch (state) {
    case 'connected':
      return 'установлена';
    case 'connecting':
      return 'подключение…';
    case 'reconnecting':
      return 'переподключение…';
    default:
      return 'нет';
  }
}

function NodeCard({
  node,
  runtime,
  journalPreview,
  busy,
  onOpenJournal,
  onOpenDeviceBoard,
  onOpenKeys,
  onDelete,
}: {
  node: NodeView;
  runtime: ReturnType<typeof useCabinetNodeRuntime>;
  journalPreview: NodeJournalPreviewState;
  busy: boolean;
  onOpenJournal: () => void;
  onOpenDeviceBoard: () => void;
  onOpenKeys?: (nodeId: string) => void;
  onDelete: () => void;
}) {
  const deviceId = node.device?.mediaDeviceId ?? null;
  const state = deviceId ? runtime.states[deviceId] : undefined;
  const capture = deviceId ? runtime.captures[deviceId] : undefined;
  const deviceLive = runtime.isDeviceLive(deviceId);
  const isRunning = state?.isRunning ?? false;
  const mode = state?.mode ?? 'normal';
  const [captureMode, setCaptureMode] = useState<DeviceCaptureMode>('soft');
  const [captureBusy, setCaptureBusy] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [deviceIdCopied, setDeviceIdCopied] = useState(false);

  useEffect(() => {
    if (!deviceIdCopied) return;
    const timer = window.setTimeout(() => setDeviceIdCopied(false), 2_000);
    return () => window.clearTimeout(timer);
  }, [deviceIdCopied]);

  const copyDeviceId = async (): Promise<void> => {
    if (!deviceId) return;
    try {
      await navigator.clipboard.writeText(deviceId);
      setDeviceIdCopied(true);
    } catch {
      /* клипборд недоступен (например http) — id остаётся выделяемым текстом */
    }
  };

  // CT3 (канон §1): без захвата у кабинета нет контроля над сценариями узла.
  const isCaptured = capture !== undefined;
  const canCapture = deviceId !== null && deviceLive && !captureBusy;

  const handleCapture = async () => {
    setCaptureBusy(true);
    setCaptureError(null);
    try {
      await runtime.captureDevice(node.id, captureMode);
    } catch (e) {
      setCaptureError(e instanceof Error ? e.message : 'Не удалось захватить устройство');
    } finally {
      setCaptureBusy(false);
    }
  };

  const handleRelease = async () => {
    setCaptureBusy(true);
    setCaptureError(null);
    try {
      await runtime.releaseDevice(node.id);
    } catch (e) {
      setCaptureError(e instanceof Error ? e.message : 'Не удалось отпустить устройство');
    } finally {
      setCaptureBusy(false);
    }
  };

  const statusBadge = !isRunning ? (
    <span className="badge badge-ghost">Остановлен</span>
  ) : (
    <span className={`badge ${mode === 'alarm' ? 'badge-warning' : 'badge-info'}`}>
      {mode === 'alarm' ? 'Тревога' : 'Работает'}
    </span>
  );

  // CT3 (канон §7): состояние захвата видно с обеих сторон.
  const captureBadge = isCaptured ? (
    <span
      className={`badge ${capture.mode === 'hard' ? 'badge-warning' : 'badge-info'}`}
      title={
        capture.mode === 'hard'
          ? 'Устройство полностью ведомое; поле только смотрит'
          : 'Поле может запускать и останавливать сценарии; правка и пауза заблокированы'
      }
    >
      {capture.mode === 'hard' ? 'Захвачено: жёсткий' : 'Захвачено: мягкий'}
    </span>
  ) : null;

  const borderClass = isRunning
    ? mode === 'alarm'
      ? 'border-warning'
      : 'border-info animate-pulse'
    : 'border-transparent';

  return (
    <div className={`card border-2 bg-base-200 ${borderClass}`}>
      <div className="card-body gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="card-title text-lg">{node.label}</h2>
            <p className="font-mono text-xs text-base-content/50">{node.id}</p>
            {deviceId ? (
              /* CX1: с каким устройством сопряжён узел — полный id, копируется;
                 зеркально NB1 «Сопряжённое устройство» на клиенте (сверка глазами). */
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-base-content/60">связан с устройством</span>
                <span
                  className="select-all break-all font-mono text-xs font-medium text-primary"
                  data-testid="node-paired-device-id"
                >
                  {deviceId}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => void copyDeviceId()}
                  aria-label="Скопировать id устройства"
                >
                  {deviceIdCopied ? '✓ скопировано' : 'копировать'}
                </button>
              </div>
            ) : null}
            {node.device ? (
              deviceLive ? (
                <span className="badge badge-success badge-sm mt-1">online</span>
              ) : (
                <span className="badge badge-warning badge-sm mt-1">сопряжён · offline</span>
              )
            ) : (
              <span className="badge badge-ghost badge-sm mt-1">не сопряжён</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {captureBadge}
            {statusBadge}
          </div>
        </div>

        <span className="sr-only" role="status" aria-live="polite">
          {`${
            isCaptured
              ? `Устройство захвачено (${capture.mode === 'hard' ? 'жёсткий' : 'мягкий'} режим). `
              : ''
          }${isRunning ? `Режим: ${mode === 'alarm' ? 'тревога' : 'обычный'}` : 'Сценарий остановлен'}`}
        </span>

        {captureError ? (
          <div className="alert alert-error py-2 text-sm">
            <span>{captureError}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {!isCaptured ? (
            // CT3 шаг 1 (канон §1): явный захват — до него контроля нет.
            <>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={!canCapture}
                title={
                  !deviceId
                    ? 'Узел не сопряжён с устройством'
                    : !deviceLive
                      ? DEVICE_OFFLINE_RUN_HINT
                      : undefined
                }
                onClick={() => void handleCapture()}
              >
                Захватить
              </button>
              <label className="flex items-center gap-1.5 text-xs text-base-content/70">
                <span>Режим</span>
                <select
                  className="select select-bordered select-xs"
                  value={captureMode}
                  onChange={(event) => setCaptureMode(event.target.value as DeviceCaptureMode)}
                  aria-label="Режим захвата устройства"
                >
                  <option value="soft">мягкий</option>
                  <option value="hard">жёсткий</option>
                </select>
              </label>
            </>
          ) : (
            // CT3 шаг 2: под захватом — запуск/остановка сохранённого сценария
            // устройства (селектор из нескольких сценариев — отдельная задача).
            <>
              {!isRunning ? (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={!deviceId || !deviceLive}
                  title={!deviceLive ? DEVICE_OFFLINE_RUN_HINT : 'Запустить сохранённый сценарий устройства'}
                  onClick={() => deviceId && runtime.run(deviceId)}
                >
                  Пуск
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-error"
                  disabled={!deviceId}
                  title="Остановить с плавным затуханием (200 мс)"
                  onClick={() => deviceId && runtime.stop(deviceId)}
                >
                  Стоп
                </button>
              )}
              <button
                type="button"
                className="btn btn-sm btn-outline"
                disabled={captureBusy}
                title="Отпустить управление; играющий сценарий продолжит играть"
                onClick={() => void handleRelease()}
              >
                Отпустить
              </button>
            </>
          )}

          <div className="ml-auto flex gap-2">
            {onOpenKeys ? (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={busy}
                onClick={() => onOpenKeys(node.id)}
              >
                Ключи
              </button>
            ) : null}
            <button type="button" className="btn btn-sm btn-ghost" onClick={onOpenJournal}>
              Журнал
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={onOpenDeviceBoard}>
              Доска
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline btn-error"
              disabled={busy}
              onClick={onDelete}
            >
              Удалить
            </button>
          </div>
        </div>

        {deviceId ? (
          <NodeLastTrackPreview
            deviceId={deviceId}
            deviceLive={deviceLive}
            lastTrack={journalPreview.lastTrack}
            loading={journalPreview.loading}
          />
        ) : null}
      </div>
    </div>
  );
}
