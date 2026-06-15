import React, { useEffect, useMemo, useState } from 'react';
import { ModuleProps } from '@membrana/agenda';
import { getDefaultMediaLibraryService } from '@membrana/media-library-service';
import { bindSamplePlaybackBlobReader } from '@membrana/sample-playback-service';
import {
  type LiveJournalFilter,
  countLiveJournalFilters,
  matchesLiveJournalFilter,
  useLiveJournal,
} from '@membrana/telemetry-journal-service';

import { LiveJournalItemRow } from './components/LiveJournalItemRow';
import type { TelemetryJournalModuleConfig } from './types';

const FILTER_OPTIONS: { value: LiveJournalFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'tracks', label: 'Треки' },
  { value: 'reports', label: 'Отчёты' },
  { value: 'detections', label: 'Обнаружения' },
];

const STORAGE_MODE_LABELS: Record<string, string> = {
  'remote-server': 'Сервер',
  'electron-fs': 'Desktop FS',
  'browser-limited-fallback': 'Локально (сессия)',
};

export const TelemetryJournalModule: React.FC<
  ModuleProps<TelemetryJournalModuleConfig>
> = ({ module: _module }) => {
  const { snapshot, service } = useLiveJournal();
  const [filter, setFilter] = useState<LiveJournalFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    bindSamplePlaybackBlobReader((sampleId) => getDefaultMediaLibraryService().getSampleBlob(sampleId));
  }, []);

  const filterCounts = useMemo(
    () => countLiveJournalFilters(snapshot.items),
    [snapshot.items, snapshot.version],
  );

  const displayed = useMemo(() => {
    let list = snapshot.items.filter((item) => matchesLiveJournalFilter(item, filter));
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((item) => {
        if (item.moduleName.toLowerCase().includes(query)) return true;
        if (item.moduleId.toLowerCase().includes(query)) return true;
        if (item.tags.some((tag) => tag.toLowerCase().includes(query))) return true;
        if (item.track?.title.toLowerCase().includes(query)) return true;
        if (item.track?.sampleId.toLowerCase().includes(query)) return true;
        if (item.report?.summaryText?.toLowerCase().includes(query)) return true;
        if (item.report?.trackId.toLowerCase().includes(query)) return true;
        return false;
      });
    }
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }, [snapshot.items, snapshot.version, filter, search]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(displayed, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `live_journal_${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const storageLabel =
    STORAGE_MODE_LABELS[snapshot.storageMode] ?? snapshot.storageMode;

  return (
    <div className="card bg-base-100 border border-base-200 shadow-sm rounded-box w-full">
      <div className="card-body p-4 md:p-6 gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-base-content/60 flex-1 min-w-[12rem]">
            Live-журнал микрофона: 5‑с клипы и отчёты детекторов дрона.
          </p>
          <span className="badge badge-outline badge-sm">{storageLabel}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs min-h-8"
            onClick={() => void service.refresh()}
          >
            Обновить
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Фильтр live-журнала"
          >
            {FILTER_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`btn btn-xs min-h-10 ${filter === value ? 'btn-primary' : 'btn-ghost'}`}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label} ({filterCounts[value]})
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
            <label className="form-control flex-1 min-w-[12rem]">
              <span className="label py-0">
                <span className="label-text text-xs">Поиск</span>
                <span className="label-text-alt text-xs text-base-content/50">
                  показано: {displayed.length}
                </span>
              </span>
              <input
                type="search"
                className="input input-bordered input-sm w-full"
                placeholder="трек, sampleId, отчёт…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm btn-outline" onClick={exportJson}>
                Экспорт JSON
              </button>
            </div>
          </div>
        </div>

        {displayed.length === 0 ? (
          <p className="text-sm text-center text-base-content/50 py-8 border border-dashed border-base-300 rounded-box">
            Нет записей. Запустите live-микрофон с авто-записью 5 с — появятся треки и отчёты
            анализа.
          </p>
        ) : (
          <ul className="space-y-2 max-h-[min(32rem,70vh)] overflow-y-auto pr-1">
            {displayed.map((item) => (
              <li key={item.id}>
                <LiveJournalItemRow item={item} items={snapshot.items} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
