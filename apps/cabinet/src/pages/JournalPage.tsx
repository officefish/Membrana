import type { LiveJournalFilter } from '@membrana/telemetry-journal-service';

import { CabinetLiveJournalItemRow } from '@/components/journal/CabinetLiveJournalItemRow';
import { LiveJournalPager } from '@/components/journal/LiveJournalPager';
import { useCabinetLiveJournal } from '@/lib/useCabinetLiveJournal';

const FILTER_OPTIONS: { value: LiveJournalFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'tracks', label: 'Треки' },
  { value: 'reports', label: 'Отчёты' },
  { value: 'detections', label: 'Обнаружения' },
];

export function JournalPage() {
  const journal = useCabinetLiveJournal();

  if (journal.loading && journal.items.length === 0) {
    return (
      <div className="flex items-center gap-3">
        <span className="loading loading-spinner loading-md text-primary" aria-hidden />
        <span className="text-base-content/70">Загрузка журнала…</span>
      </div>
    );
  }

  if (journal.error && journal.items.length === 0) {
    return (
      <div className="alert alert-error">
        <span>{journal.error}</span>
        <button type="button" className="btn btn-sm" onClick={() => void journal.reload()}>
          Повторить
        </button>
      </div>
    );
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(journal.filtered, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cabinet_live_journal_${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Live-журнал телеметрии</h1>
          <p className="text-sm text-base-content/60">
            5‑с клипы и отчёты детекторов с paired-клиентов — по каждому узлу отдельно.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => void journal.reload({ silent: true })}
        >
          Обновить
        </button>
      </div>

      <label className="form-control max-w-md">
        <span className="label py-0">
          <span className="label-text text-xs">Узел / deviceId</span>
        </span>
        <select
          className="select select-bordered select-sm"
          value={journal.selectedDeviceId ?? ''}
          onChange={(event) =>
            journal.setSelectedDeviceId(event.target.value.length > 0 ? event.target.value : null)
          }
        >
          <option value="">Выберите paired-узел</option>
          {journal.nodes.map((node) => (
            <option key={node.id} value={node.deviceId ?? ''} disabled={!node.deviceId || !node.paired}>
              {node.label}
              {!node.paired ? ' (offline)' : ''}
            </option>
          ))}
        </select>
      </label>

      {!journal.selectedDeviceId ? (
        <p className="text-sm text-base-content/50 border border-dashed border-base-300 rounded-box p-6 text-center">
          Выберите paired-узел — журнал привязан к media deviceId узла.
        </p>
      ) : (
        <div className="card bg-base-100 border border-base-200 shadow-sm rounded-box">
          <div className="card-body p-4 md:p-6 gap-4">
            {!journal.mediaReady ? (
              <p className="text-xs text-warning">Медиатека узла недоступна — play/export blob отключены.</p>
            ) : null}

            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Фильтр live-журнала"
            >
              {FILTER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`btn btn-xs min-h-10 ${journal.filter === value ? 'btn-primary' : 'btn-ghost'}`}
                  aria-pressed={journal.filter === value}
                  onClick={() => journal.setFilter(value)}
                >
                  {label} ({journal.filterCounts[value]})
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
              <label className="form-control flex-1 min-w-[12rem]">
                <span className="label py-0">
                  <span className="label-text text-xs">Поиск</span>
                  <span className="label-text-alt text-xs text-base-content/50">
                    показано: {journal.filtered.length}
                  </span>
                </span>
                <input
                  type="search"
                  className="input input-bordered input-sm w-full"
                  placeholder="трек, sampleId, отчёт…"
                  value={journal.search}
                  onChange={(event) => journal.setSearch(event.target.value)}
                />
              </label>
              <button type="button" className="btn btn-sm btn-outline" onClick={exportJson}>
                Экспорт JSON
              </button>
            </div>

            {journal.filtered.length === 0 ? (
              <p className="text-sm text-center text-base-content/50 py-8 border border-dashed border-base-300 rounded-box">
                Нет записей для выбранного узла. Запустите live-микрофон с авто-записью 5 с на paired-клиенте.
              </p>
            ) : (
              <>
                <ul className="space-y-2 max-h-[min(32rem,70vh)] overflow-y-auto pr-1">
                  {journal.displayed.map((item) => (
                    <li key={item.id}>
                      <CabinetLiveJournalItemRow
                        item={item}
                        linkedReportCount={journal.linkedReportCount(item)}
                        trackTitle={journal.trackTitleForReport(item)}
                        onPlay={() => journal.playTrack(item)}
                        onExportBlob={() => journal.exportTrackBlob(item)}
                      />
                    </li>
                  ))}
                </ul>
                {journal.totalPages > 1 ? (
                  <LiveJournalPager
                    page={journal.page}
                    totalPages={journal.totalPages}
                    pageSize={journal.pageSize}
                    shownCount={journal.displayed.length}
                    onPrev={() => journal.setPage((current) => Math.max(1, current - 1))}
                    onNext={() =>
                      journal.setPage((current) => Math.min(journal.totalPages, current + 1))
                    }
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
