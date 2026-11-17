import type { CollectionDetectorBatchRunOutcome } from '@membrana/media-library-service';

export interface BatchDetectorRunPanelProps {
  readonly state: 'idle' | 'running' | 'done' | 'error';
  readonly outcome: CollectionDetectorBatchRunOutcome | null;
  readonly error: string | null;
  readonly bufferFull: boolean;
  readonly disabled: boolean;
  readonly onRun: () => void;
}

const statusClass = (status: 'ok' | 'failed' | 'skipped'): string => {
  if (status === 'ok') return 'badge-success';
  if (status === 'failed') return 'badge-error';
  return 'badge-warning';
};

export function BatchDetectorRunPanel({
  state,
  outcome,
  error,
  bufferFull,
  disabled,
  onRun,
}: BatchDetectorRunPanelProps) {
  const aggregate = outcome?.aggregate;

  return (
    <section className="border-y border-base-300 py-3" aria-busy={state === 'running'}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">Детекторы по набору</h3>
        {aggregate ? (
          <div className="flex flex-wrap gap-1 text-xs tabular-nums">
            <span className="badge badge-success badge-sm">готово {aggregate.ok}</span>
            <span className="badge badge-error badge-sm">ошибки {aggregate.failed}</span>
            <span className="badge badge-warning badge-sm">пропущено {aggregate.skipped}</span>
            <span className="badge badge-neutral badge-sm">обнаружено {aggregate.detected}</span>
          </div>
        ) : null}
        <button
          type="button"
          className="btn btn-sm btn-neutral ml-auto"
          disabled={disabled || state === 'running'}
          onClick={onRun}
        >
          {state === 'running' ? <span className="loading loading-spinner loading-xs" /> : null}
          {state === 'running' ? 'Выполняется' : 'Запустить прогон'}
        </button>
      </div>

      {bufferFull ? (
        <div className="alert alert-warning mt-3 py-2 text-sm">
          Буфер заполнен. Прогон работает без переноса и не освобождает место.
        </div>
      ) : null}

      {error ? <div className="alert alert-error mt-3 py-2 text-sm">{error}</div> : null}
      {outcome?.status === 'rejected' && outcome.rejection ? (
        <div className="alert alert-error mt-3 py-2 text-sm" role="alert">
          Прогон отклонён: {outcome.rejection.detail}
        </div>
      ) : null}

      {outcome?.status === 'completed' ? (
        <details className="mt-3" open={outcome.aggregate.failed + outcome.aggregate.skipped > 0}>
          <summary className="cursor-pointer text-sm font-medium tabular-nums">
            Результаты: {outcome.aggregate.total}
          </summary>
          <div className="mt-2 max-h-64 overflow-auto border border-base-300">
            <table className="table table-xs">
              <thead>
                <tr>
                  <th>Проба</th>
                  <th>Статус</th>
                  <th className="text-right">Уверенность</th>
                  <th>Причина</th>
                </tr>
              </thead>
              <tbody>
                {outcome.results.map((row) => (
                  <tr key={row.sampleId}>
                    <td className="max-w-64 truncate" title={row.title}>{row.title}</td>
                    <td><span className={`badge badge-sm ${statusClass(row.status)}`}>{row.status}</span></td>
                    <td className="text-right tabular-nums">
                      {row.confidence === undefined ? '—' : row.confidence.toFixed(3)}
                    </td>
                    <td className="max-w-72 truncate" title={row.reason}>{row.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-base-content/60 tabular-nums" aria-live="polite">
            p50 {outcome.aggregate.latencyP50Ms.toFixed(1)} мс · p95 {outcome.aggregate.latencyP95Ms.toFixed(1)} мс
          </p>
        </details>
      ) : null}
    </section>
  );
}
