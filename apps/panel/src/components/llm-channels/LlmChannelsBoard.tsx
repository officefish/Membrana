import { useCallback, useEffect, useState, type FormEvent } from 'react';

import {
  deleteOverlayChain,
  fetchDaySummary,
  fetchEffectiveProcedures,
  formatTokens,
  putOverlayChain,
  type ChainStep,
  type DaySummary,
  type EffectiveProcedure,
} from '@/lib/llmChannelsApi';

type LoadState = 'loading' | 'error' | 'ready';

const PROVIDERS = ['anthropic', 'openrouter'] as const;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function SourceBadge({ source }: { source: 'overlay' | 'default' }) {
  if (source === 'overlay') {
    return <span className="badge badge-accent badge-sm">overlay</span>;
  }
  return <span className="badge badge-outline badge-sm">default</span>;
}

function ChainEditor({
  procedure,
  onSaved,
}: {
  procedure: EffectiveProcedure;
  onSaved: () => void;
}) {
  const [steps, setSteps] = useState<ChainStep[]>(() =>
    procedure.chain.map((s) => ({ ...s })),
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setSteps(procedure.chain.map((s) => ({ ...s })));
  }, [procedure]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (busy || steps.length < 1) return;
    setBusy(true);
    setNotice(null);
    try {
      await putOverlayChain(procedure.procedureId, steps);
      setNotice('Цепочка сохранена в office overlay.');
      onSaved();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Не удалось сохранить.');
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await deleteOverlayChain(procedure.procedureId);
      setNotice('Overlay сброшен — снова git default.');
      onSaved();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Не удалось сбросить.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card bg-base-200 p-4 space-y-3" onSubmit={(e) => void onSave(e)}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{procedure.title ?? procedure.procedureId}</h3>
        <code className="text-xs opacity-70">{procedure.procedureId}</code>
        <SourceBadge source={procedure.source} />
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-wrap gap-2 items-center">
            <select
              className="select select-bordered select-sm"
              value={step.provider}
              onChange={(ev) => {
                const next = steps.map((s, j) =>
                  j === i ? { provider: ev.target.value, model: s.model } : s,
                );
                setSteps(next);
              }}
              aria-label={`Провайдер шаг ${i + 1}`}
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              {!PROVIDERS.includes(step.provider as (typeof PROVIDERS)[number]) ? (
                <option value={step.provider}>{step.provider}</option>
              ) : null}
            </select>
            <input
              className="input input-bordered input-sm flex-1 min-w-[12rem]"
              value={step.model}
              onChange={(ev) => {
                const next = steps.map((s, j) =>
                  j === i ? { provider: s.provider, model: ev.target.value } : s,
                );
                setSteps(next);
              }}
              aria-label={`Модель шаг ${i + 1}`}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={steps.length <= 1 || busy}
              onClick={() => setSteps(steps.filter((_, j) => j !== i))}
            >
              −
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy}
          onClick={() => setSteps([...steps, { provider: 'openrouter', model: '' }])}
        >
          + шаг
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          Сохранить overlay
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={busy || procedure.source === 'default'}
          onClick={() => void onReset()}
        >
          Сбросить к default
        </button>
      </div>
      {notice ? (
        <p className="text-sm text-base-content/70" aria-live="polite">
          {notice}
        </p>
      ) : null}
    </form>
  );
}

export function LlmChannelsBoard() {
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(todayUtc);
  const [day, setDay] = useState<DaySummary | null>(null);
  const [procedures, setProcedures] = useState<EffectiveProcedure[]>([]);

  const reload = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const [d, procs] = await Promise.all([
        fetchDaySummary(date),
        fetchEffectiveProcedures(),
      ]);
      setDay(d);
      setProcedures(procs);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить.');
      setState('error');
    }
  }, [date]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (state === 'loading') {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-md" aria-label="Загрузка" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
        <button type="button" className="btn btn-sm" onClick={() => void reload()}>
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card bg-base-200 p-4 space-y-3" aria-label="Сводка за день">
        <div className="flex flex-wrap items-end gap-3">
          <label className="form-control">
            <span className="label-text text-xs">День (UTC)</span>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <button type="button" className="btn btn-sm" onClick={() => void reload()}>
            Обновить
          </button>
        </div>
        {day ? (
          <>
            <div className="stats stats-vertical sm:stats-horizontal shadow bg-base-100 w-full">
              <div className="stat">
                <div className="stat-title">Вызовы</div>
                <div className="stat-value text-2xl">{day.count}</div>
                <div className="stat-desc">
                  ok {day.okCount} · fail {day.failCount}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Токены in</div>
                <div className="stat-value text-2xl">{formatTokens(day.tokensIn)}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Токены out</div>
                <div className="stat-value text-2xl">{formatTokens(day.tokensOut)}</div>
              </div>
            </div>
            {Object.keys(day.byProvider).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Провайдер</th>
                      <th>Вызовы</th>
                      <th>ok / fail</th>
                      <th>in / out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(day.byProvider).map(([p, row]) => (
                      <tr key={p}>
                        <td>{p}</td>
                        <td>{row.count}</td>
                        <td>
                          {row.okCount} / {row.failCount}
                        </td>
                        <td>
                          {formatTokens(row.tokensIn)} / {formatTokens(row.tokensOut)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-base-content/60">За этот день событий ещё нет.</p>
            )}
            {day.recent.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Время</th>
                      <th>Процедура</th>
                      <th>Канал</th>
                      <th>source</th>
                      <th>ok</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.recent.slice(0, 20).map((ev) => (
                      <tr key={ev.eventId}>
                        <td className="whitespace-nowrap text-xs">{ev.ts.slice(11, 19)}</td>
                        <td>{ev.procedureId}</td>
                        <td className="text-xs">
                          {ev.provider}/{ev.model}
                        </td>
                        <td>
                          <SourceBadge source={ev.source === 'overlay' ? 'overlay' : 'default'} />
                        </td>
                        <td>{ev.ok ? '✓' : ev.errorClass ?? '✗'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="space-y-3" aria-label="Цепочки процедур">
        <h3 className="font-semibold">Цепочки (overlay поверх git default)</h3>
        <p className="text-sm text-base-content/70">
          Секреты ключей здесь не хранятся — только порядок провайдеров и модели. При
          недоступном Anthropic поставьте openrouter первым или вторым в цепочке.
        </p>
        {procedures.map((p) => (
          <ChainEditor key={p.procedureId} procedure={p} onSaved={() => void reload()} />
        ))}
      </section>
    </div>
  );
}
