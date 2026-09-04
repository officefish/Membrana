import { useCallback, useEffect, useState } from 'react';
import { fetchMembraneMe, type MembraneView } from '@/api/membrane';
import {
  fetchTariffCatalog,
  redeemPromoCode,
  selectTariff,
  type TariffCatalogView,
} from '@/api/tariff';
import { formatBytes } from '@/lib/formatBytes';
import { tariffDenyText } from '@/lib/tariffDenyText';

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
        setDeny(tariffDenyText(outcome.reason));
      }
    } catch (e) {
      setTransportError(e instanceof Error ? e.message : 'Ошибка запроса');
    } finally {
      setBusy(false);
    }
  }, [busy, code, onRedeemed]);

  return (
    <div className="mt-4 rounded-lg bg-base-100 p-4">
      <label htmlFor="promo-code-input" className="text-sm text-base-content/60">
        Промокод
      </label>
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
          id="promo-code-input"
          type="text"
          className="input input-bordered input-sm flex-1 font-mono"
          placeholder="PROMO-2026"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={busy}
          aria-invalid={deny ? true : undefined}
          aria-describedby={deny ? 'promo-deny-text' : undefined}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !code.trim()}>
          {busy ? <span className="loading loading-spinner loading-xs" /> : 'Применить'}
        </button>
      </form>
      {deny && (
        <div id="promo-deny-text" className="alert alert-error mt-3 py-2 text-sm" role="alert">
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

/**
 * ВЫБОР ТАРИФА СОБСТВЕННЫМ РЕШЕНИЕМ (#2281, слово владельца 04.09).
 *
 * «Переход на другой тариф становится функцией собственного выбора, без ворот» — поэтому здесь
 * нет ни заявки, ни ожидания подтверждения: список, кнопка, ответ сервера.
 *
 * **Понижение не заперто, а НАЗВАНО.** Тариф ниже текущего доступен к выбору (запрет понижения —
 * правило подарка, а не перехода), но строка честно говорит, что пределы уменьшатся. Показ и
 * действие берут один и тот же признак — сравнение рангов; разведи их, и предупреждение начнёт
 * врать в окне между двумя порогами.
 *
 * **Счёт разноски показан, а не спрятан в лог.** Смена может состояться, а новый предел до
 * прибора не доехать. Промолчав об этом, страница показала бы новый тариф при старой квоте — и
 * пользователь искал бы причину там, где её нет.
 */
function TariffSelector({
  currentTariffId,
  onChanged,
}: {
  currentTariffId: string;
  onChanged: () => void;
}) {
  const [catalog, setCatalog] = useState<TariffCatalogView | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deny, setDeny] = useState<string | null>(null);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [done, setDone] = useState<{ toTariffId: string; updated: number; failed: number } | null>(
    null,
  );

  const loadCatalog = useCallback(async () => {
    setCatalogError(null);
    try {
      setCatalog(await fetchTariffCatalog());
    } catch (e) {
      setCatalog(null);
      setCatalogError(e instanceof Error ? e.message : 'Витрина тарифов недоступна');
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog, currentTariffId]);

  const choose = useCallback(
    async (toTariffId: string) => {
      if (pendingId) return;
      setPendingId(toTariffId);
      setDeny(null);
      setTransportError(null);
      setDone(null);
      try {
        const outcome = await selectTariff(toTariffId);
        if (outcome.ok) {
          setDone({
            toTariffId: outcome.toTariffId,
            updated: outcome.contextSync.updated,
            failed: outcome.contextSync.failed,
          });
          onChanged();
        } else {
          setDeny(tariffDenyText(outcome.reason));
        }
      } catch (e) {
        setTransportError(e instanceof Error ? e.message : 'Ошибка запроса');
      } finally {
        setPendingId(null);
      }
    },
    [onChanged, pendingId],
  );

  if (catalogError) {
    return (
      <div className="alert alert-error mt-4 py-2 text-sm" role="alert">
        <span>{catalogError}</span>
        <button type="button" className="btn btn-xs" onClick={() => void loadCatalog()}>
          Повторить
        </button>
      </div>
    );
  }

  if (!catalog) {
    return <span className="loading loading-spinner loading-sm mt-4" aria-label="Загрузка тарифов" />;
  }

  const currentRank = catalog.items.find((item) => item.id === currentTariffId)?.rank;

  return (
    <div className="mt-4 rounded-lg bg-base-100 p-4">
      <h3 className="text-sm text-base-content/60">Сменить тариф</h3>
      <p className="mt-1 text-xs text-base-content/50">
        Выбор действует сразу; заявка и подтверждение не требуются
      </p>

      <ul className="mt-3 space-y-2">
        {catalog.items.map((item) => {
          // Один признак на показ и на действие: понижение и помечается, и подписывается отсюда.
          const isDowngrade = currentRank !== undefined && item.rank < currentRank;
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-base-200 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {item.name}
                  {item.current && <span className="badge badge-sm ml-2">текущий</span>}
                </p>
                <p className="text-xs text-base-content/50">
                  Библиотеки {formatBytes(item.userStorageQuotaBytes)} · буфер{' '}
                  {formatBytes(item.bufferQuotaBytes)} · узлов до {item.maxNodesPerMembrane}
                </p>
                {isDowngrade && (
                  <p className="text-xs text-warning">Ниже текущего: пределы уменьшатся</p>
                )}
              </div>
              <button
                type="button"
                className="btn btn-sm"
                disabled={item.current || pendingId !== null}
                onClick={() => void choose(item.id)}
              >
                {pendingId === item.id ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  'Перейти'
                )}
              </button>
            </li>
          );
        })}
      </ul>

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
      {done && (
        <div
          className={`alert mt-3 py-2 text-sm ${done.failed > 0 ? 'alert-warning' : 'alert-success'}`}
          role="status"
        >
          <span>
            Тариф переключён: {done.toTariffId}. Приборов обновлено: {done.updated}
            {done.failed > 0
              ? `, не удалось: ${done.failed} — на них предел обновится при следующем подключении`
              : ''}
          </span>
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
          <TariffSelector currentTariffId={tariff.id} onChanged={() => void load()} />
          <PromoRedeemForm onRedeemed={() => void load()} />
        </div>
      </div>
    </div>
  );
}
