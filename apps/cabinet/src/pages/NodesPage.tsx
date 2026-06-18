import { useCallback, useEffect, useState } from 'react';
import { createNode, fetchMembraneMe, type MembraneView, type NodeView } from '@/api/membrane';
import { isNodeLimitReachedView } from '@/lib/nodeListView';
import { useCabinetNodeRuntime } from '@/lib/useCabinetNodeRuntime';

interface NodesPageProps {
  onOpenJournal: () => void;
  onOpenDeviceBoard: () => void;
}

export function NodesPage({ onOpenJournal, onOpenDeviceBoard }: NodesPageProps) {
  const [data, setData] = useState<MembraneView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const membraneId = data?.membrane.id ?? null;
  const runtime = useCabinetNodeRuntime(membraneId);

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
              onOpenJournal={onOpenJournal}
              onOpenDeviceBoard={onOpenDeviceBoard}
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
  onOpenJournal,
  onOpenDeviceBoard,
}: {
  node: NodeView;
  runtime: ReturnType<typeof useCabinetNodeRuntime>;
  onOpenJournal: () => void;
  onOpenDeviceBoard: () => void;
}) {
  const deviceId = node.device?.mediaDeviceId ?? null;
  const state = deviceId ? runtime.states[deviceId] : undefined;
  const isRunning = state?.isRunning ?? false;
  const mode = state?.mode ?? 'normal';

  const borderClass = isRunning
    ? mode === 'alarm'
      ? 'border-warning'
      : 'border-info animate-pulse'
    : 'border-transparent';

  return (
    <div className={`card border-2 bg-base-200 ${borderClass}`}>
      <div className="card-body gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="card-title text-lg">{node.label}</h2>
            <p className="font-mono text-xs text-base-content/50">{node.id}</p>
            {node.device ? (
              <span className="badge badge-success badge-sm mt-1">сопряжён</span>
            ) : (
              <span className="badge badge-ghost badge-sm mt-1">не сопряжён</span>
            )}
          </div>
          {isRunning ? (
            <span className={`badge ${mode === 'alarm' ? 'badge-warning' : 'badge-info'}`}>
              {mode === 'alarm' ? 'Тревога' : 'Работает'}
            </span>
          ) : (
            <span className="badge badge-ghost">Остановлен</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isRunning ? (
            <button
              type="button"
              className="btn btn-sm btn-error"
              disabled={!deviceId}
              onClick={() => deviceId && runtime.stop(deviceId)}
            >
              Стоп
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!deviceId}
              title={!deviceId ? 'Узел не сопряжён с устройством' : undefined}
              onClick={() => deviceId && runtime.run(deviceId)}
            >
              Пуск
            </button>
          )}

          {isRunning && deviceId ? (
            <div className="join">
              <button
                type="button"
                className={`btn btn-sm join-item ${mode === 'normal' ? 'btn-info' : 'btn-ghost'}`}
                onClick={() => runtime.setMode(deviceId, 'normal')}
              >
                Обычный
              </button>
              <button
                type="button"
                className={`btn btn-sm join-item ${mode === 'alarm' ? 'btn-warning' : 'btn-ghost'}`}
                onClick={() => runtime.setMode(deviceId, 'alarm')}
              >
                Тревога
              </button>
            </div>
          ) : null}

          <div className="ml-auto flex gap-2">
            <button type="button" className="btn btn-sm btn-ghost" onClick={onOpenJournal}>
              Журнал
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={onOpenDeviceBoard}>
              Доска
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
