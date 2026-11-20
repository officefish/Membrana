import type { PurgeScheduleRow } from '@/lib/coldArchiveApi';

import { formatBytes, formatRunTime } from './ColdArchiveRunsJournal';

/**
 * #2632 g6c (Т5): таблица ближайших удалений — замороженные партии по сроку. Только чтение:
 * ни одной кнопки удаления (удаляет только уборщик по расписанию). Адресов файлов нет.
 */

export const EMPTY_SCHEDULE_TEXT = 'Ближайших удалений нет: замороженных архивов не найдено.';

export function ColdArchiveScheduleTable({ rows }: { rows: readonly PurgeScheduleRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-base-content/60" data-schedule="empty">{EMPTY_SCHEDULE_TEXT}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="table table-sm" aria-label="Ближайшие удаления архива">
        <thead>
          <tr>
            <th>Удалится не раньше</th>
            <th>Мембрана</th>
            <th>Прибор</th>
            <th>Партия</th>
            <th>Объём</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.batchId} data-batch-id={r.batchId}>
              <td className="text-xs tabular-nums">{formatRunTime(r.expiresAt)}</td>
              <td className="font-mono text-xs">{r.membraneId.slice(0, 8)}…</td>
              <td className="font-mono text-xs">{r.deviceId.slice(0, 8)}…</td>
              <td className="font-mono text-xs">{r.batchId.slice(0, 8)}…</td>
              <td className="text-sm tabular-nums">{formatBytes(r.frozenBytes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
