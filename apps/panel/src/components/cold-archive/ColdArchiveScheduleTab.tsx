import { useEffect, useState } from 'react';

import {
  ColdArchiveApiError,
  fetchPurgeRun,
  fetchPurgeRuns,
  fetchPurgeSchedule,
  type ColdArchivePulse,
  type PurgeRunDetail,
  type PurgeRunSummary,
  type PurgeScheduleRow,
} from '@/lib/coldArchiveApi';

import { ColdArchivePulseBadge } from './ColdArchivePulseBadge';
import { ColdArchiveRunDetails } from './ColdArchiveRunDetails';
import { ColdArchiveRunsJournal } from './ColdArchiveRunsJournal';
import { ColdArchiveScheduleTable } from './ColdArchiveScheduleTable';

/**
 * #2632 g6c (Т5): отдельная вкладка владельца «График удалений» — ближайшие удаления, пульс, режим,
 * журнал прогонов и задания выбранного прогона. ТОЛЬКО ЧТЕНИЕ: ни одной кнопки удаления, переключателя
 * режима нет (боевой режим — только словом владельца, флагами office).
 *
 * Пульс: ручки g5b ещё нет — `pulse` по умолчанию `null` (значок «не подключён»); режим до g5b показан
 * по снимку флагов последнего прогона и подписан именно так.
 */

export const NOT_CONFIGURED_BANNER = 'Связь с хранилищем записей не настроена — график и журнал недоступны.';

type LoadState = 'loading' | 'not-configured' | 'error' | 'ready';

export function lastRunModeText(runs: readonly PurgeRunSummary[]): string {
  const last = runs[0];
  if (!last) return 'Режим по последнему прогону: прогонов ещё не было.';
  const mode = !last.enabledSnapshot ? 'уборка выключена' : last.dryRunSnapshot ? 'пробный' : 'боевой';
  return `Режим по последнему прогону: ${mode}.`;
}

export function ColdArchiveScheduleTab({ pulse = null }: { pulse?: ColdArchivePulse | null }) {
  const [state, setState] = useState<LoadState>('loading');
  const [errorText, setErrorText] = useState('');
  const [schedule, setSchedule] = useState<PurgeScheduleRow[]>([]);
  const [runs, setRuns] = useState<PurgeRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PurgeRunDetail | null>(null);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPurgeSchedule(), fetchPurgeRuns()])
      .then(([s, r]) => {
        if (cancelled) return;
        setSchedule(s);
        setRuns(r);
        setState('ready');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ColdArchiveApiError && e.notConfigured) return setState('not-configured');
        setErrorText(e instanceof Error ? e.message : 'Не удалось загрузить график удалений.');
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSelect(runId: string) {
    if (runId === selectedRunId) {
      setSelectedRunId(null);
      setDetail(null);
      return;
    }
    setSelectedRunId(runId);
    setDetail(null);
    setDetailError('');
    try {
      setDetail(await fetchPurgeRun(runId));
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Не удалось загрузить задания прогона.');
    }
  }

  return (
    <div className="space-y-6">
      <ColdArchivePulseBadge pulse={pulse} />
      {state === 'loading' && (
        <div className="flex justify-center py-6" aria-busy="true">
          <span className="loading loading-spinner loading-md text-primary" aria-label="Загрузка графика удалений" />
        </div>
      )}
      {state === 'not-configured' && (
        <div className="alert alert-warning" role="alert" data-banner="media-not-configured">
          <span>{NOT_CONFIGURED_BANNER}</span>
        </div>
      )}
      {state === 'error' && (
        <div className="alert alert-error" role="alert">
          <span>{errorText}</span>
        </div>
      )}
      {state === 'ready' && (
        <>
          <p className="text-sm" data-mode="last-run">{lastRunModeText(runs)}</p>
          <section aria-labelledby="cold-archive-schedule-title" className="space-y-2">
            <h3 id="cold-archive-schedule-title" className="text-sm font-semibold">
              Ближайшие удаления ({schedule.length})
            </h3>
            <ColdArchiveScheduleTable rows={schedule} />
          </section>
          <section aria-labelledby="cold-archive-journal-title" className="space-y-2">
            <h3 id="cold-archive-journal-title" className="text-sm font-semibold">
              Журнал прогонов ({runs.length})
            </h3>
            <ColdArchiveRunsJournal runs={runs} selectedRunId={selectedRunId} onSelect={(id) => void onSelect(id)} />
          </section>
          {selectedRunId && detailError && (
            <p role="alert" className="text-sm text-error">
              {detailError}
            </p>
          )}
          {selectedRunId && !detail && !detailError && <p aria-live="polite" className="text-sm">Загружаем задания прогона…</p>}
          {detail && <ColdArchiveRunDetails run={detail} />}
        </>
      )}
    </div>
  );
}
