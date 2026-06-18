import { useCallback, useEffect, useState } from 'react';
import {
  createAccessKey,
  DURATION_OPTIONS,
  fetchMembraneMe,
  purgeRevokedAccessKeys,
  revokeAccessKey,
  type MembraneView,
  type NodeAccessKeyDuration,
  type NodeView,
} from '@/api/membrane';

export function KeysPage() {
  const [data, setData] = useState<MembraneView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [duration, setDuration] = useState<NodeAccessKeyDuration>('days_3');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const view = await fetchMembraneMe();
      setData(view);
      setSelectedNodeId((prev) =>
        prev && view.nodes.some((n) => n.id === prev) ? prev : (view.nodes[0]?.id ?? null),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const nodes = data?.nodes ?? [];
  const node: NodeView | null = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const handleCreateKey = async () => {
    if (!node) return;
    setBusy(true);
    setError(null);
    setRevealedKey(null);
    setCopied(false);
    try {
      const result = await createAccessKey(node.id, duration);
      setRevealedKey(result.key);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать ключ');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyKey = async () => {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Не удалось скопировать ключ');
    }
  };

  const handleRevoke = async (keyId: string) => {
    setBusy(true);
    setError(null);
    try {
      await revokeAccessKey(keyId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отозвать ключ');
    } finally {
      setBusy(false);
    }
  };

  const handlePurgeRevoked = async () => {
    if (!node) return;
    const revokedCount = node.accessKeys.filter((key) => key.revokedAt).length;
    if (revokedCount === 0) return;
    if (
      !window.confirm(
        `Удалить ${revokedCount} отозванн${revokedCount === 1 ? 'ый ключ' : revokedCount < 5 ? 'ых ключа' : 'ых ключей'}? Это действие необратимо.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await purgeRevokedAccessKeys(node.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить отозванные ключи');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <span className="loading loading-spinner loading-md" aria-label="Загрузка" />;
  }

  const revokedKeyCount = node?.accessKeys.filter((key) => key.revokedAt).length ?? 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ключи</h1>
        <p className="mt-2 text-base-content/70">
          Ключ доступа сопрягает узел с полевым клиентом. Ключ показывается один раз при создании.
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
            <p>Сначала создайте узел в разделе «Узлы».</p>
          </div>
        </div>
      ) : (
        <>
          <label className="form-control w-full max-w-xs">
            <span className="label-text">Узел</span>
            <select
              className="select select-bordered"
              value={selectedNodeId ?? ''}
              onChange={(e) => setSelectedNodeId(e.target.value)}
              disabled={busy}
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </label>

          <div className="card bg-base-200">
            <div className="card-body gap-4">
              <h2 className="card-title text-lg">Новый ключ доступа</h2>
              <label className="form-control w-full max-w-xs">
                <span className="label-text">Срок действия</span>
                <select
                  className="select select-bordered"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value as NodeAccessKeyDuration)}
                  disabled={busy}
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn-primary w-fit"
                disabled={busy || !node}
                onClick={() => void handleCreateKey()}
              >
                Создать ключ
              </button>
              {revealedKey ? (
                <div className="alert alert-warning">
                  <div className="w-full space-y-2">
                    <p className="font-semibold">Скопируйте ключ сейчас — он больше не покажется:</p>
                    <div className="flex flex-wrap items-start gap-2">
                      <code className="min-w-0 flex-1 break-all text-sm">{revealedKey}</code>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline shrink-0"
                        disabled={busy}
                        onClick={() => void handleCopyKey()}
                      >
                        {copied ? 'Скопировано' : 'Копировать'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="card-title text-lg">Ключи узла</h2>
                {revokedKeyCount > 0 ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={busy}
                    onClick={() => void handlePurgeRevoked()}
                  >
                    Удалить отозванные ({revokedKeyCount})
                  </button>
                ) : null}
              </div>
              {!node || node.accessKeys.length === 0 ? (
                <p className="text-base-content/60">Пока нет ключей.</p>
              ) : (
                <ul className="space-y-3">
                  {node.accessKeys.map((key) => {
                    const label =
                      DURATION_OPTIONS.find((o) => o.value === key.duration)?.label ?? key.duration;
                    return (
                      <li
                        key={key.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-base-100 p-3"
                      >
                        <div>
                          <p className="font-medium">{label}</p>
                          <p className="text-xs text-base-content/60">
                            до {new Date(key.expiresAt).toLocaleString('ru-RU')}
                          </p>
                          <span
                            className={`badge badge-sm mt-1 ${key.active ? 'badge-success' : 'badge-ghost'}`}
                          >
                            {key.revokedAt ? 'отозван' : key.active ? 'активен' : 'истёк'}
                          </span>
                        </div>
                        {key.active ? (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled={busy}
                            onClick={() => void handleRevoke(key.id)}
                          >
                            Отозвать
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
