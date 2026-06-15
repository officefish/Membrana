import type { TelemetryLiveRecordView } from '@/api/journal';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface CloudLiveRecordRowProps {
  record: TelemetryLiveRecordView;
}

export function CloudLiveRecordRow({ record }: CloudLiveRecordRowProps) {
  const isActive = record.status === 'active';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-base-300 bg-base-200/40 px-3 py-2">
      <span
        className={`badge badge-sm ${isActive ? 'badge-warning' : 'badge-ghost'}`}
      >
        {isActive ? 'live' : 'ended'}
      </span>
      <span className="text-sm font-medium">{record.recordKind}</span>
      <span className="text-xs text-base-content/60 tabular-nums">
        {formatWhen(record.startedAt)}
        {record.endedAt ? ` → ${formatWhen(record.endedAt)}` : ''}
      </span>
      {record.moduleId ? (
        <span className="text-[10px] text-base-content/50 truncate">{record.moduleId}</span>
      ) : null}
    </div>
  );
}
