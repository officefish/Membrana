import { useCallback, useEffect, useState } from 'react';
import {
  fetchTelemetryLiveRecords,
  fetchTelemetryReports,
  type TelemetryLiveRecordView,
  type TelemetryReportView,
} from '@/api/journal';
import { CloudLiveRecordRow } from '@/components/journal/CloudLiveRecordRow';
import { CloudReportCard } from '@/components/journal/CloudReportCard';

export function JournalPage() {
  const [reports, setReports] = useState<TelemetryReportView[]>([]);
  const [liveRecords, setLiveRecords] = useState<TelemetryLiveRecordView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextReports, nextLive] = await Promise.all([
        fetchTelemetryReports(),
        fetchTelemetryLiveRecords(),
      ]);
      setReports(nextReports);
      setLiveRecords(nextLive);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить журнал');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <span className="loading loading-spinner loading-md text-primary" aria-hidden />
        <span className="text-base-content/70">Загрузка журнала…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
        <button type="button" className="btn btn-sm" onClick={() => void reload()}>
          Повторить
        </button>
      </div>
    );
  }

  const activeLive = liveRecords.filter((r) => r.status === 'active');

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Журнал телеметрии</h1>
          <p className="text-sm text-base-content/60">
            Отчёты и live-сессии с paired-клиентов вашей мембраны.
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void reload()}>
          Обновить
        </button>
      </div>

      {activeLive.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">
            Активные сессии
          </h2>
          <div className="space-y-2">
            {activeLive.map((record) => (
              <CloudLiveRecordRow key={record.id} record={record} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">
          Отчёты ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <p className="text-base-content/60 text-sm">
            Пока нет отчётов. Запустите анализ в paired-клиенте — записи появятся здесь.
          </p>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <CloudReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </section>

      {liveRecords.filter((r) => r.status === 'ended').length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">
            Завершённые live-сессии
          </h2>
          <div className="space-y-2">
            {liveRecords
              .filter((r) => r.status === 'ended')
              .map((record) => (
                <CloudLiveRecordRow key={record.id} record={record} />
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
