import type { PurgeRunSummary } from '@/lib/coldArchiveApi';

/**
 * #2632 g6b: журнал прогонов уборщика — только чтение, ни одной кнопки удаления. Числа текстом.
 * Пустой журнал — «прогонов ещё не было», это НЕ «всё чисто» (DoD g6b).
 */

export const EMPTY_JOURNAL_TEXT = 'Прогонов ещё не было — это не значит, что всё чисто.';

const STATUS_TEXT: Record<PurgeRunSummary['status'], string> = {
  running: 'идёт',
  succeeded: 'успешно',
  failed: 'с ошибкой',
  abandoned: 'оборван',
};

export function formatRunTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('ru-RU');
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  return `${(n / (1024 * 1024)).toFixed(1)} МБ`;
}

export interface ColdArchiveRunsJournalProps {
  runs: readonly PurgeRunSummary[];
  selectedRunId: string | null;
  onSelect: (runId: string) => void;
}

export function ColdArchiveRunsJournal({ runs, selectedRunId, onSelect }: ColdArchiveRunsJournalProps) {
  if (runs.length === 0) {
    return <p className="text-sm text-base-content/60" data-journal="empty">{EMPTY_JOURNAL_TEXT}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="table table-sm" aria-label="Журнал прогонов уборщика">
        <thead>
          <tr>
            <th>Начат</th>
            <th>Режим</th>
            <th>Исход</th>
            <th>Заданий: всего / успешно / повтор / безнадёжных</th>
            <th>Освобождено</th>
            <th>
              <span className="sr-only">Подробности</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => {
            const selected = r.runId === selectedRunId;
            return (
              <tr key={r.runId} data-run-id={r.runId} className={selected ? 'bg-base-200' : undefined}>
                <td className="text-xs tabular-nums">{formatRunTime(r.startedAt)}</td>
                <td className="text-sm">{r.mode === 'live' ? 'боевой' : 'пробный'}</td>
                <td className="text-sm">
                  {STATUS_TEXT[r.status]}
                  {r.errorSummary && <div className="text-xs text-error">{r.errorSummary}</div>}
                </td>
                <td className="text-sm tabular-nums">
                  {r.jobsTotal} / {r.jobsSucceeded} / {r.jobsFailed} /{' '}
                  <span className={r.jobsDeadLetter > 0 ? 'font-semibold text-error' : undefined}>{r.jobsDeadLetter}</span>
                </td>
                <td className="text-sm tabular-nums">{formatBytes(r.bytesFreed)}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    aria-expanded={selected}
                    aria-controls="cold-archive-run-details"
                    onClick={() => onSelect(r.runId)}
                  >
                    Задания
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
