import { useCallback, useEffect, useState } from 'react';
import { fetchMembraneMe, type MembraneView } from '@/api/membrane';
import {
  fetchTariffCatalog,
  previewTariffDowngrade,
  redeemPromoCode,
  selectTariff,
  setDowngradePolicy,
  type DowngradePreviewPlan,
  type SelectTariffOutcome,
  type TariffCatalogView,
} from '@/api/tariff';
import { BufferOverflowPolicyCard } from '@/components/membrane/BufferOverflowPolicyCard';
import {
  DowngradeConfirmDialog,
  downgradeRefusal,
  formatArchiveDate,
  type DowngradeRefusal,
} from '@/components/membrane/DowngradeConfirmDialog';
import { DowngradeKeepCard } from '@/components/membrane/DowngradeKeepCard';
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

interface SelectDone {
  toTariffId: string;
  updated: number;
  failed: number;
  /** Сколько записей ушло в архив и до какого дня (срок поставил сервер записей). */
  archived: { count: number; until: string } | null;
}

function selectDone(outcome: Extract<SelectTariffOutcome, { ok: true }>, shown: DowngradePreviewPlan | null): SelectDone {
  const frozen = outcome.frozen ?? [];
  const until = frozen.map((f) => f.expiresAt).sort()[0];
  const count = shown ? shown.nodes.filter((n) => frozen.some((f) => f.nodeId === n.nodeId)).reduce((s, n) => s + n.freezeCount, 0) : 0;
  return {
    toTariffId: outcome.toTariffId,
    updated: outcome.contextSync.updated,
    failed: outcome.contextSync.failed,
    archived: until ? { count, until } : null,
  };
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
 *
 * **Понижение с избытком — через окно подтверждения** (#2587 b5, ADR-0031 р.5). Сначала
 * предпросмотр; есть что уносить в архив — окно с числами по узлам, и смена уходит с хешами
 * показанного плана. Избытка нет — обычный путь без окна. Успех — только после ответа «тариф
 * сменён»; любой отказ говорит «тариф не изменён», и страница тариф не перечитывает.
 */
export function TariffSelector({
  currentTariffId,
  onChanged,
  nodeLabels = {},
  onPolicyChanged,
}: {
  currentTariffId: string;
  onChanged: () => void;
  nodeLabels?: Readonly<Record<string, string>>;
  onPolicyChanged?: () => void;
}) {
  const [catalog, setCatalog] = useState<TariffCatalogView | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deny, setDeny] = useState<string | null>(null);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [done, setDone] = useState<SelectDone | null>(null);
  const [dialog, setDialog] = useState<{ plan: DowngradePreviewPlan; name: string } | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [refusal, setRefusal] = useState<DowngradeRefusal | null>(null);

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

  /** Исход смены: успех — после ответа; `preview_required` — окно; отказ — «тариф не изменён». */
  const settle = useCallback(
    (outcome: SelectTariffOutcome, name: string, shown: DowngradePreviewPlan | null) => {
      if (outcome.ok) {
        setDialog(null);
        setDone(selectDone(outcome, shown));
        onChanged();
      } else if (outcome.reason === 'preview_required' && 'preview' in outcome) {
        setRefusal(null);
        setDialog({ plan: outcome.preview, name });
      } else if (shown) {
        setRefusal(downgradeRefusal(outcome));
      } else {
        setDeny(tariffDenyText(outcome.reason));
      }
    },
    [onChanged],
  );

  const choose = useCallback(
    async (toTariffId: string, name: string, isDowngrade: boolean) => {
      if (pendingId) return;
      setPendingId(toTariffId);
      setDeny(null);
      setTransportError(null);
      setDone(null);
      try {
        if (isDowngrade) {
          const preview = await previewTariffDowngrade(toTariffId);
          if (!preview.ok) {
            setDeny(tariffDenyText(preview.reason));
            return;
          }
          if (preview.downgrade && preview.requiresConfirmation) {
            setRefusal(null);
            setDialog({ plan: preview, name });
            return;
          }
        }
        settle(await selectTariff(toTariffId), name, null);
      } catch (e) {
        setTransportError(e instanceof Error ? e.message : 'Ошибка запроса');
      } finally {
        setPendingId(null);
      }
    },
    [pendingId, settle],
  );

  /** Шаг внутри окна (подтверждение, режим, новый предпросмотр). Тариф до ответа «сменён» прежний. */
  const runInDialog = useCallback(async (step: () => Promise<void>) => {
    setDialogBusy(true);
    setRefusal(null);
    try {
      await step();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка запроса';
      setRefusal({ text: `Нет ответа сервера (${msg}) — обновите страницу, чтобы увидеть текущий тариф`, stale: false });
    } finally {
      setDialogBusy(false);
    }
  }, []);

  const repreview = useCallback(async (toTariffId: string, name: string) => {
    const preview = await previewTariffDowngrade(toTariffId);
    if (preview.ok && preview.downgrade) setDialog({ plan: preview, name });
    else setRefusal({ text: preview.ok ? 'Архив больше не нужен — закройте окно и повторите выбор' : tariffDenyText(preview.reason), stale: false });
  }, []);

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
        Выбор действует сразу, без заявки. Если при понижении записи не поместятся в буфер, сначала
        покажем, что уйдёт в архив
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
                  <p className="text-xs text-warning">
                    Ниже текущего: пределы уменьшатся, лишние записи уйдут в архив после подтверждения
                  </p>
                )}
              </div>
              <button
                type="button"
                className="btn btn-sm"
                disabled={item.current || pendingId !== null}
                onClick={() => void choose(item.id, item.name, isDowngrade)}
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
            Тариф изменён: {done.toTariffId}.
            {done.archived
              ? ` ${done.archived.count} записей в архиве до ${formatArchiveDate(done.archived.until)}.`
              : ''}{' '}
            Приборов обновлено: {done.updated}
            {done.failed > 0
              ? `, не удалось: ${done.failed} — на них предел обновится при следующем подключении`
              : ''}
          </span>
        </div>
      )}
      {dialog && (
        <DowngradeConfirmDialog
          plan={dialog.plan}
          toTariffName={dialog.name}
          nodeLabels={nodeLabels}
          busy={dialogBusy}
          refusal={refusal}
          onCancel={() => setDialog(null)}
          onConfirm={(digests) =>
            void runInDialog(async () => settle(await selectTariff(dialog.plan.toTariffId, digests), dialog.name, dialog.plan))
          }
          onCriterionChange={(criterion) =>
            void runInDialog(async () => {
              const saved = await setDowngradePolicy(criterion);
              if (!saved.ok) {
                setRefusal({ text: `Режим не сохранён: ${saved.detail ?? saved.reason}`, stale: false });
                return;
              }
              onPolicyChanged?.();
              await repreview(dialog.plan.toTariffId, dialog.name);
            })
          }
          onRefresh={() => void runInDialog(() => repreview(dialog.plan.toTariffId, dialog.name))}
        />
      )}
    </div>
  );
}

export function MembranePage() {
  const [data, setData] = useState<MembraneView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Режим отбора меняют и карточка, и окно понижения: окно сдвигает ревизию — карточка перечитывает.
  const [policyRev, setPolicyRev] = useState(0);

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
          <TariffSelector
            currentTariffId={tariff.id}
            onChanged={() => void load()}
            nodeLabels={Object.fromEntries(data.nodes.map((n) => [n.id, n.label]))}
            onPolicyChanged={() => setPolicyRev((r) => r + 1)}
          />
          <PromoRedeemForm onRedeemed={() => void load()} />
        </div>
      </div>

      {/* #2308: политика переполнения — та же витрина, что тариф; отдельной страницы прибора нет */}
      <BufferOverflowPolicyCard data={data} onChanged={() => void load()} />

      {/* #2587 b5: режим отбора при понижении — настройка мембраны */}
      <DowngradeKeepCard key={policyRev} />
    </div>
  );
}
