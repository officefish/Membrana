import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import {
  deleteOverlayChain,
  fetchDaySummary,
  fetchEffectiveProcedures,
  fetchProviderCatalog,
  formatTokens,
  putOverlayChain,
  type CatalogProvider,
  type ChainStep,
  type DaySummary,
  type EffectiveProcedure,
  type ProviderCatalog,
} from '@/lib/llmChannelsApi';

type LoadState = 'loading' | 'error' | 'ready';

const CUSTOM_MODEL = '__custom__';

/** Offline fallback if catalog endpoint unavailable (still provider × model). */
const FALLBACK_CATALOG: ProviderCatalog = {
  ritualEnum: ['anthropic', 'openrouter', 'deepseek', 'perplexity', 'openai'],
  providers: [
    {
      id: 'anthropic',
      title: 'Anthropic',
      defaultModel: 'claude-haiku-4-5-20251001',
      models: [
        { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
        { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
        { id: 'claude-opus-4-7', label: 'Opus 4.7' },
      ],
    },
    {
      id: 'openrouter',
      title: 'OpenRouter',
      defaultModel: 'anthropic/claude-haiku-4.5',
      models: [
        { id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5' },
        { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
        { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
        { id: 'perplexity/sonar', label: 'Perplexity Sonar' },
      ],
    },
    {
      id: 'deepseek',
      title: 'DeepSeek',
      defaultModel: 'deepseek-chat',
      models: [
        { id: 'deepseek-chat', label: 'DeepSeek Chat' },
        { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
      ],
    },
    {
      id: 'perplexity',
      title: 'Perplexity',
      defaultModel: 'sonar',
      models: [
        { id: 'sonar', label: 'Sonar' },
        { id: 'sonar-pro', label: 'Sonar Pro' },
      ],
    },
    {
      id: 'openai',
      title: 'ChatGPT',
      defaultModel: 'gpt-4o-mini',
      models: [
        { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
        { id: 'gpt-4o', label: 'GPT-4o' },
      ],
    },
  ],
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function SourceBadge({ source }: { source: 'overlay' | 'default' }) {
  if (source === 'overlay') {
    return <span className="badge badge-accent badge-sm">overlay</span>;
  }
  return <span className="badge badge-outline badge-sm">default</span>;
}

function providerById(catalog: ProviderCatalog, id: string): CatalogProvider | undefined {
  return catalog.providers.find((p) => p.id === id);
}

function ChainStepRow({
  step,
  index,
  catalog,
  busy,
  canRemove,
  onChange,
  onRemove,
}: {
  step: ChainStep;
  index: number;
  catalog: ProviderCatalog;
  busy: boolean;
  canRemove: boolean;
  onChange: (next: ChainStep) => void;
  onRemove: () => void;
}) {
  const provider = providerById(catalog, step.provider);
  const knownIds = useMemo(
    () => new Set((provider?.models ?? []).map((m) => m.id)),
    [provider],
  );
  const modelInList = knownIds.has(step.model);
  const modelSelectValue = modelInList ? step.model : CUSTOM_MODEL;

  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-3 space-y-2">
      <div className="text-xs font-medium text-base-content/60">Шаг {index + 1}</div>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="form-control">
          <span className="label-text text-xs">Провайдер</span>
          <select
            className="select select-bordered select-sm min-w-[10rem]"
            value={step.provider}
            onChange={(ev) => {
              const nextId = ev.target.value;
              const nextProvider = providerById(catalog, nextId);
              onChange({
                provider: nextId,
                model: nextProvider?.defaultModel || nextProvider?.models[0]?.id || '',
              });
            }}
            aria-label={`Провайдер шаг ${index + 1}`}
          >
            {catalog.providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
            {!provider ? <option value={step.provider}>{step.provider}</option> : null}
          </select>
        </label>
        <label className="form-control flex-1 min-w-[14rem]">
          <span className="label-text text-xs">Модель</span>
          <select
            className="select select-bordered select-sm w-full"
            value={modelSelectValue}
            onChange={(ev) => {
              const v = ev.target.value;
              if (v === CUSTOM_MODEL) {
                onChange({
                  provider: step.provider,
                  model: modelInList ? '' : step.model,
                });
                return;
              }
              onChange({ provider: step.provider, model: v });
            }}
            aria-label={`Модель шаг ${index + 1}`}
          >
            {(provider?.models ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} ({m.id})
              </option>
            ))}
            <option value={CUSTOM_MODEL}>Своя модель…</option>
          </select>
        </label>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={!canRemove || busy}
          onClick={onRemove}
          aria-label={`Удалить шаг ${index + 1}`}
        >
          −
        </button>
      </div>
      {modelSelectValue === CUSTOM_MODEL ? (
        <label className="form-control w-full">
          <span className="label-text text-xs">Id модели у провайдера</span>
          <input
            className="input input-bordered input-sm w-full font-mono"
            value={step.model}
            placeholder={provider?.defaultModel ?? 'model-id'}
            onChange={(ev) => onChange({ provider: step.provider, model: ev.target.value })}
            aria-label={`Свой id модели шаг ${index + 1}`}
          />
        </label>
      ) : null}
    </div>
  );
}

function ChainEditor({
  procedure,
  catalog,
  onSaved,
}: {
  procedure: EffectiveProcedure;
  catalog: ProviderCatalog;
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
    if (steps.some((s) => !s.provider.trim() || !s.model.trim())) {
      setNotice('У каждого шага нужны и провайдер, и модель.');
      return;
    }
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

  const firstProvider = catalog.providers[0];

  return (
    <form className="card bg-base-200 p-4 space-y-3" onSubmit={(e) => void onSave(e)}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{procedure.title ?? procedure.procedureId}</h3>
        <code className="text-xs opacity-70">{procedure.procedureId}</code>
        <SourceBadge source={procedure.source} />
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <ChainStepRow
            key={i}
            step={step}
            index={i}
            catalog={catalog}
            busy={busy}
            canRemove={steps.length > 1}
            onChange={(next) => setSteps(steps.map((s, j) => (j === i ? next : s)))}
            onRemove={() => setSteps(steps.filter((_, j) => j !== i))}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy || !firstProvider}
          onClick={() => {
            if (!firstProvider) return;
            setSteps([
              ...steps,
              {
                provider: firstProvider.id,
                model: firstProvider.defaultModel,
              },
            ]);
          }}
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
  const [catalog, setCatalog] = useState<ProviderCatalog>(FALLBACK_CATALOG);

  const reload = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const [d, procs, cat] = await Promise.all([
        fetchDaySummary(date),
        fetchEffectiveProcedures(),
        fetchProviderCatalog().catch(() => FALLBACK_CATALOG),
      ]);
      setDay(d);
      setProcedures(procs);
      setCatalog(cat.providers.length > 0 ? cat : FALLBACK_CATALOG);
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
          У каждого шага две независимые оси: провайдер (куда слать запрос) и модель
          (какой id у этого провайдера). Секреты ключей здесь не хранятся. При
          недоступном Anthropic поставьте запасной шаг первым или вторым в цепочке.
        </p>
        {procedures
          .filter((p) => !p.group)
          .map((p) => (
            <ChainEditor
              key={p.procedureId}
              procedure={p}
              catalog={catalog}
              onSaved={() => void reload()}
            />
          ))}
        {Array.from(new Set(procedures.filter((p) => p.group).map((p) => p.group as string))).map(
          (groupName) => {
            const stages = procedures.filter((p) => p.group === groupName);
            return (
              <div
                key={groupName}
                className="rounded-xl border border-base-300 bg-base-200/40 p-3 space-y-3"
                aria-label={`Группа ${groupName}`}
              >
                <div className="flex items-center gap-2">
                  <span className="badge badge-accent badge-sm">группа</span>
                  <h4 className="font-semibold capitalize">{groupName}</h4>
                  <span className="text-xs text-base-content/60">{stages.length} стадий</span>
                </div>
                {stages.map((p) => (
                  <ChainEditor
                    key={p.procedureId}
                    procedure={p}
                    catalog={catalog}
                    onSaved={() => void reload()}
                  />
                ))}
              </div>
            );
          },
        )}
      </section>
    </div>
  );
}
