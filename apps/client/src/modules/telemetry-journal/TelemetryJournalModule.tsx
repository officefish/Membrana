import React, { useMemo, useState } from 'react';
import { ModuleProps } from '@membrana/agenda';
import { useTelemetryJournal } from '@membrana/telemetry-service';

import { JournalEntryItem } from './components/JournalEntryItem';
import {
  countJournalFilters,
  matchesJournalFilter,
  type TelemetryJournalFilter,
} from './filters/matchesTagFilter';
import type { TelemetryJournalModuleConfig } from './types';

const FILTER_OPTIONS: { value: TelemetryJournalFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'analysis', label: 'Анализ' },
  { value: 'detection', label: 'Обнаружено' },
  { value: 'clear', label: 'Чисто' },
  { value: 'event', label: 'События' },
  { value: 'system', label: 'Система' },
];

export const TelemetryJournalModule: React.FC<
  ModuleProps<TelemetryJournalModuleConfig>
> = ({ module: _module }) => {
  const { snapshot, journal } = useTelemetryJournal();
  const [filter, setFilter] = useState<TelemetryJournalFilter>('all');
  const [search, setSearch] = useState('');

  const filterCounts = useMemo(
    () => countJournalFilters(snapshot.entries),
    [snapshot.entries, snapshot.version],
  );

  const displayed = useMemo(() => {
    let list = snapshot.entries.filter((e) => matchesJournalFilter(e, filter));
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
        <p className="text-sm text-base-content/60">
          Записи из{' '}
          <code className="text-xs text-primary">@membrana/telemetry-service</code> в памяти
          вкладки; источники — модули и плагины (например, агрегаты микрофона).
        </p>

        <div className="flex flex-col gap-3">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Фильтр записей журнала"
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
        </div>

        {displayed.length === 0 ? (
          <p className="text-sm text-center text-base-content/50 py-8 border border-dashed border-base-300 rounded-box">
            Нет записей. Запустите модуль «Микрофон» и fft-threshold-test — в журнал попадут
            отчёты анализа и события.
          </p>
        ) : (
          <ul className="space-y-2 max-h-[min(32rem,70vh)] overflow-y-auto pr-1">
            {displayed.map((e) => (
              <li key={e.id}>
                <JournalEntryItem entry={e} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
