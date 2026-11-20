import { useEffect, useState } from 'react';

import {
  ColdArchiveApiError,
  fetchColdArchivePulse,
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
 * Пульс и режим — ручка office g5b `pulse` (режим по флагам office). Её отказ не прячет график и журнал:
 * значок остаётся «состояние неизвестно», причина — строкой с role=alert.
 */

export const NOT_CONFIGURED_BANNER = 'Связь с хранилищем записей не настроена — график и журнал недоступны.';

type LoadState = 'loading' | 'not-configured' | 'error' | 'ready';

const MODE_LABEL: Record<ColdArchivePulse['mode'], string> = { disabled: 'выключена', 'dry-run': 'пробная', live: 'боевая' };

export function modeText(pulse: ColdArchivePulse | null): string {
  return pulse ? `Уборка по флагам office: ${MODE_LABEL[pulse.mode]}.` : 'Режим уборки неизвестен.';
}

export function ColdArchiveScheduleTab() {
  const [pulse, setPulse] = useState<ColdArchivePulse | null>(null);
  const [pulseError, setPulseError] = useState('');
  const [state, setState] = useState<LoadState>('loading');
  const [errorText, setErrorText] = useState('');
  const [schedule, setSchedule] = useState<PurgeScheduleRow[]>([]);
  const [runs, setRuns] = useState<PurgeRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PurgeRunDetail | null>(null);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchColdArchivePulse()
      .then((p) => {
        if (!cancelled) setPulse(p);
      })
      .catch((e: unknown) => {
        if (!cancelled) setPulseError(e instanceof Error ? e.message : 'Не удалось узнать пульс уборщика.');
      });
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
      {pulseError && (
        <p role="alert" className="text-sm text-error" data-pulse-error="">
          {pulseError}
        </p>
      )}
      <p className="text-sm" data-mode="">
        {modeText(pulse)}
      </p>
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
