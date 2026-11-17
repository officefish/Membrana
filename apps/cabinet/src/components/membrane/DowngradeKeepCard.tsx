/**
 * КАРТОЧКА «ЧТО ОСТАВИТЬ ПРИ ПОНИЖЕНИИ» (#2587 b5; ADR-0031, решение владельца 05.10: режим
 * выбирает пользователь, умолчание — «превышение над фоном»).
 *
 * Тройка режимов — та же, что у витрины chart-list (`CHART_LIST_CRITERIA`): второй словарь
 * подписей о тех же режимах завёл бы расхождение копий. Успех — только после ответа сервера.
 */
import { useCallback, useEffect, useState } from 'react';

import { fetchDowngradePolicy, setDowngradePolicy } from '@/api/tariff';
import { CHART_LIST_CRITERIA } from '@/plugins/chart-list/chartList';

/** Карточка режима отбора при понижении на странице мембраны. */
export function DowngradeKeepCard() {
  const [criterion, setCriterion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setCriterion((await fetchDowngradePolicy()).criterion);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Настройка недоступна');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = useCallback(
    async (next: string) => {
      if (busy || next === criterion) return;
      setBusy(true);
      setError(null);
      setSaved(false);
      try {
        const outcome = await setDowngradePolicy(next);
        if (outcome.ok) {
          setCriterion(outcome.policy.criterion);
          setSaved(true);
        } else {
          setError(`Режим не сохранён: ${outcome.detail ?? outcome.reason}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка запроса');
      } finally {
        setBusy(false);
      }
    },
    [busy, criterion],
  );

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <fieldset disabled={busy || criterion === null}>
          <legend className="card-title text-lg">Что оставить при понижении тарифа</legend>
          <p className="mt-1 text-sm text-base-content/70">
            Если записи не поместятся в буфер младшего тарифа, лишние уйдут в архив, а не удалятся.
            Размеченные и отмеченные «хранить» остаются первыми; дальше — по выбранному режиму.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {CHART_LIST_CRITERIA.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="downgrade-keep-criterion"
                  className="radio radio-sm"
                  value={c.id}
                  checked={criterion === c.id}
                  onChange={() => void choose(c.id)}
                />
                <span className="text-sm">{c.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <div className="alert alert-error mt-3 py-2 text-sm" role="alert">
            <span>{error}</span>
          </div>
        )}
        {saved && (
          <p className="mt-2 text-xs text-success" role="status">
            Режим сохранён
          </p>
        )}
      </div>
    </div>
  );
}
