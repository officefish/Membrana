import { useCallback, useEffect, useState } from 'react';
import { fetchMembraneMe, type MembraneView } from '@/api/membrane';
import { formatBytes } from '@/lib/formatBytes';

export function MembranePage() {
  const [data, setData] = useState<MembraneView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <span className="loading loading-spinner loading-md" aria-label="Загрузка" />;
  }

  if (error || !data) {
    return (
      <div className="alert alert-error max-w-lg">
        <span>{error ?? 'Нет данных'}</span>
        <button type="button" className="btn btn-sm" onClick={() => void load()}>
          Повторить
        </button>
      </div>
    );
  }

  const { tariff } = data.membrane;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Мембрана</h1>
        <p className="mt-2 text-base-content/70">
          v1: одна мембрана на пользователя. Тариф задаёт квоты dataset и buffer для облачного
          media (MP4).
        </p>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title text-lg">Тариф</h2>
          <p className="font-medium">{tariff.name}</p>
          <p className="font-mono text-sm text-base-content/60">{tariff.id}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-base-100 p-4">
              <p className="text-sm text-base-content/60">Dataset</p>
              <p className="text-xl font-semibold">{formatBytes(tariff.datasetQuotaBytes)}</p>
            </div>
            <div className="rounded-lg bg-base-100 p-4">
              <p className="text-sm text-base-content/60">Buffer</p>
              <p className="text-xl font-semibold">{formatBytes(tariff.bufferQuotaBytes)}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-base-content/60">
            Активных ключей на узел: {tariff.maxActiveKeysPerNode}
          </p>
        </div>
      </div>
    </div>
  );
}
