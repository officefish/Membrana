import { useEffect, useRef } from 'react';

import type { PurgeJobSummary, PurgeRunDetail } from '@/lib/coldArchiveApi';

import { formatBytes, formatRunTime } from './ColdArchiveRunsJournal';

/**
 * #2632 g6b (Т2): задания одного прогона; безнадёжные (`dead_letter`, попытки исчерпаны) — отдельной
 * строкой сверху и пометкой в таблице. Только чтение, кнопок удаления и повтора нет. При открытии фокус
 * переходит на заголовок деталей (клавиатурный путь из журнала). Числа текстом, адресов файлов нет.
 */

const JOB_STATUS_TEXT: Record<PurgeJobSummary['status'], string> = {
  pending: 'ждёт',
  claimed: 'в работе',
  succeeded: 'выполнено',
  retry: 'повтор',
  dead_letter: 'безнадёжное',
};

export function ColdArchiveRunDetails({ run }: { run: PurgeRunDetail }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), [run.runId]);
  const dead = run.jobs.filter((j) => j.status === 'dead_letter');

  return (
    <section id="cold-archive-run-details" aria-labelledby="cold-archive-run-details-title" className="space-y-2">
      <h4 id="cold-archive-run-details-title" ref={headingRef} tabIndex={-1} className="text-sm font-semibold">
        Задания прогона от {formatRunTime(run.startedAt)}
      </h4>
      {dead.length > 0 && (
        <p role="alert" className="text-sm text-error" data-dead-letter={dead.length}>
          Безнадёжных заданий: {dead.length}. Файлы не удалось убрать за все попытки — нужен разбор.
        </p>
      )}
      {run.jobs.length === 0 ? (
        <p className="text-sm text-base-content/60">В этом прогоне заданий не было.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm" aria-label="Задания прогона">
            <thead>
              <tr>
                <th>Предмет</th>
                <th>Состояние</th>
                <th>Попытка</th>
                <th>Файлов: всего / убрано / уже не было / не удалось</th>
                <th>Освобождено</th>
              </tr>
            </thead>
            <tbody>
              {run.jobs.map((j) => (
                <tr key={j.jobId} data-job-status={j.status} className={j.status === 'dead_letter' ? 'text-error' : undefined}>
                  <td className="text-sm">
                    {j.targetType === 'batch' ? 'партия' : 'осиротевший файл'}
                    {j.batchId && <div className="font-mono text-xs text-base-content/50">{j.batchId.slice(0, 8)}…</div>}
                  </td>
                  <td className="text-sm">
                    {JOB_STATUS_TEXT[j.status]}
                    {j.lastError && <div className="text-xs">{j.lastError}</div>}
                  </td>
                  <td className="text-sm tabular-nums">{j.attempt}</td>
                  <td className="text-sm tabular-nums">
                    {j.pathsTotal} / {j.outcomes.removed} / {j.outcomes.already_absent} / {j.outcomes.failed}
                  </td>
                  <td className="text-sm tabular-nums">{formatBytes(j.bytesFreed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
