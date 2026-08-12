import { useCallback, useEffect, useState } from 'react';
import { fetchMembraneMe, type MembraneView } from '@/api/membrane';
import { redeemPromoCode } from '@/api/tariff';
import { formatBytes } from '@/lib/formatBytes';
import { promoDenyText } from '@/lib/promoDenyText';

/**
 * Форма погашения промокода (блок b2 #1761). Регулярное действие кабинета — живёт
 * в карточке тарифа, не в модалке. Успех показывается ТОЛЬКО после ответа сервера
 * (оптимистичных обновлений нет) и рефетчем данных мембраны, не перезагрузкой
 * страницы. Все отказы — одним стилем alert-error, различие в тексте словаря.
 */
function PromoRedeemForm({ onRedeemed }: { onRedeemed: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [deny, setDeny] = useState<string | null>(null);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [redeemedTo, setRedeemedTo] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setDeny(null);
    setTransportError(null);
    setRedeemedTo(null);
    try {
      const outcome = await redeemPromoCode(trimmed);
      if (outcome.ok) {
        setRedeemedTo(outcome.toTariffId);
        setCode('');
        onRedeemed();
      } else {
        setDeny(promoDenyText(outcome.reason));
      }
    } catch (e) {
      setTransportError(e instanceof Error ? e.message : 'Ошибка запроса');
    } finally {
      setBusy(false);
    }
  }, [busy, code, onRedeemed]);

  return (
    <div className="mt-4 rounded-lg bg-base-100 p-4">
      <p className="text-sm text-base-content/60">Промокод</p>
      <p className="mt-1 text-xs text-base-content/50">
        Код открывает тариф выше текущего; понижения по коду нет
      </p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          type="text"
          className="input input-bordered input-sm flex-1 font-mono"
          placeholder="PROMO-2026"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={busy}
          aria-label="Промокод"
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !code.trim()}>
          {busy ? <span className="loading loading-spinner loading-xs" /> : 'Применить'}
        </button>
      </form>
      {deny && (
        <div className="alert alert-error mt-3 py-2 text-sm" role="alert">
          <span>{deny}</span>
        </div>
      )}
      {transportError && (
        <div className="alert alert-error mt-3 py-2 text-sm" role="alert">
          <span>{transportError}</span>
        </div>
      )}
      {redeemedTo && (
        <div className="alert alert-success mt-3 py-2 text-sm" role="status">
          <span>Тариф переключён: {redeemedTo}</span>
        </div>
      )}
    </div>
  );
}

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
          v1: одна мембрана на пользователя. Тариф задаёт объём пользовательских библиотек, буфер
          live и состав системного dataset (MP4).
        </p>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title text-lg">Тариф</h2>
          <p className="font-medium">{tariff.name}</p>
          <p className="font-mono text-sm text-base-content/60">{tariff.id}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-base-100 p-4">
              <p className="text-sm text-base-content/60">Пользовательские библиотеки</p>
              <p className="text-xl font-semibold">{formatBytes(tariff.userStorageQuotaBytes)}</p>
              <p className="mt-1 text-xs text-base-content/50">Суммарный объём ваших коллекций на сервере</p>
            </div>
            <div className="rounded-lg bg-base-100 p-4">
              <p className="text-sm text-base-content/60">Буфер live</p>
              <p className="text-xl font-semibold">{formatBytes(tariff.bufferQuotaBytes)}</p>
              <p className="mt-1 text-xs text-base-content/50">
                Ёмкость записи с микрофона; больше буфер — больше устройств в live
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-base-100 p-4">
            <p className="text-sm text-base-content/60">Системный dataset (read-only)</p>
            <p className="font-mono text-lg font-semibold">{tariff.datasetCatalogId}</p>
            <p className="mt-1 text-xs text-base-content/50">
              Состав каталога по тарифу; влияет на качество детекторов (обучающая выборка)
            </p>
          </div>
          <p className="mt-2 text-sm text-base-content/60">
            Активных ключей на узел: {tariff.maxActiveKeysPerNode}
          </p>
          <PromoRedeemForm onRedeemed={() => void load()} />
        </div>
      </div>
    </div>
  );
}
