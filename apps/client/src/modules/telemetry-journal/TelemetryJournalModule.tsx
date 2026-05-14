import React, { useMemo, useState } from 'react';
import { ModuleProps } from '@membrana/agenda';
import {
  type TelemetryEntry,
  type TelemetryEntryType,
  useTelemetryJournal,
} from '@membrana/telemetry-service';
import { JournalEntryRow } from './components/JournalEntryRow';
import type { TelemetryJournalModuleConfig } from './types';

type FilterKind = 'all' | TelemetryEntryType | 'system';

function matchesFilter(entry: TelemetryEntry, filter: FilterKind): boolean {
  if (filter === 'all') return true;
  if (filter === 'system') {
    return entry.type === 'module_start' || entry.type === 'module_stop';
  }
  return entry.type === filter;
}

export const TelemetryJournalModule: React.FC<
  ModuleProps<TelemetryJournalModuleConfig>
> = ({ module: _module }) => {
  const { snapshot, journal } = useTelemetryJournal();
  const [filter, setFilter] = useState<FilterKind>('all');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => journal.getStats(), [journal, snapshot.version]);

  const displayed = useMemo(() => {
    let list = snapshot.entries.filter((e) => matchesFilter(e, filter));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        if (e.moduleName.toLowerCase().includes(q)) return true;
        if (e.moduleId.toLowerCase().includes(q)) return true;
        if (e.tags.some((t) => t.toLowerCase().includes(q))) return true;
        try {
          return JSON.stringify(e.data).toLowerCase().includes(q);
        } catch {
          return false;
        }
      });
    }
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }, [snapshot.entries, snapshot.version, filter, search]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(displayed, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry_journal_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onClear = () => {
    if (
      confirm(
        'Очистить весь журнал телеметрии в памяти? Действие необратимо для текущей вкладки.',
      )
    ) {
      journal.clearEntries();
    }
  };

  return (
    <div className="card bg-base-100 border border-base-200 shadow-sm rounded-box w-full">
      <div className="card-body p-4 md:p-6 gap-4">
        <div>
          <h2 className="card-title text-base">Журнал телеметрии</h2>
          <p className="text-sm text-base-content/60 mt-1">
            Записи из{' '}
            <code className="text-xs text-primary">@membrana/telemetry-service</code> (в
            памяти вкладки). Источники — модули и плагины, например агрегаты микрофона.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="badge badge-outline">всего: {stats.total}</span>
          <span className="badge badge-outline">анализ: {stats.analysis}</span>
          <span className="badge badge-outline">события: {stats.events}</span>
          <span className="badge badge-outline">система: {stats.system}</span>
          <span className="badge badge-ghost">в списке: {displayed.length}</span>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
          <label className="form-control w-full sm:w-auto sm:min-w-[11rem]">
            <span className="label py-0"><span className="label-text text-xs">Тип</span></span>
            <select
              className="select select-bordered select-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterKind)}
            >
              <option value="all">Все</option>
              <option value="analysis">Анализ</option>
              <option value="event">События</option>
              <option value="system">Система (модули)</option>
              <option value="module_start">module_start</option>
              <option value="module_stop">module_stop</option>
            </select>
          </label>
          <label className="form-control flex-1 min-w-[12rem]">
            <span className="label py-0"><span className="label-text text-xs">Поиск</span></span>
            <input
              type="search"
              className="input input-bordered input-sm w-full"
              placeholder="модуль, тег, фрагмент JSON…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-outline" onClick={exportJson}>
              Экспорт JSON
            </button>
            <button type="button" className="btn btn-sm btn-error btn-outline" onClick={onClear}>
              Очистить
            </button>
          </div>
        </div>

        {displayed.length === 0 ? (
          <p className="text-sm text-center text-base-content/50 py-8 border border-dashed border-base-300 rounded-box">
            Нет записей. Запустите модуль «Микрофон» и визуализацию — в журнал попадут
            события и периодические агрегаты.
          </p>
        ) : (
          <ul className="space-y-2 max-h-[min(32rem,70vh)] overflow-y-auto pr-1">
            {displayed.map((e) => (
              <li key={e.id}>
                <JournalEntryRow entry={e} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
