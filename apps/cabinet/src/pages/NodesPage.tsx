import { useCallback, useEffect, useState } from 'react';
import {
  createAccessKey,
  createNode,
  DURATION_OPTIONS,
  fetchMembraneMe,
  purgeRevokedAccessKeys,
  revokeAccessKey,
  type MembraneView,
  type NodeAccessKeyDuration,
} from '@/api/membrane';

export function NodesPage() {
  const [data, setData] = useState<MembraneView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [duration, setDuration] = useState<NodeAccessKeyDuration>('days_3');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      await createNode('Узел 1');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать узел');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateKey = async () => {
    if (!data?.node) return;
    setBusy(true);
    setError(null);
    setRevealedKey(null);
    setCopied(false);
    try {
      const result = await createAccessKey(data.node.id, duration);
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

  const handlePurgeRevoked = async () => {
    if (!data?.node) return;
    const revokedCount = data.node.accessKeys.filter((key) => key.revokedAt).length;
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
      await purgeRevokedAccessKeys(data.node.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить отозванные ключи');
    } finally {
      setBusy(false);
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

  if (loading) {
    return <span className="loading loading-spinner loading-md" aria-label="Загрузка" />;
  }

  const node = data?.node ?? null;
  const revokedKeyCount = node?.accessKeys.filter((key) => key.revokedAt).length ?? 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Узлы и ключи</h1>
        <p className="mt-2 text-base-content/70">
          Узел связывает мембрану с полевым клиентом. Ключ показывается один раз при создании.
        </p>
      </div>

      {error ? (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      ) : null}

      {!node ? (
        <div className="card bg-base-200">
          <div className="card-body">
            <p>Узел ещё не создан (v1: один на мембрану).</p>
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
        <>
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title text-lg">{node.label}</h2>
              <p className="font-mono text-xs text-base-content/50">{node.id}</p>
            </div>
          </div>

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
                disabled={busy}
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
                <h2 className="card-title text-lg">Ключи</h2>
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
              {node.accessKeys.length === 0 ? (
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
