import React, { useEffect, useMemo } from 'react';
import { useMembranaStore } from '@membrana/agenda';
import { useDeviceBoardMode } from '@membrana/device-board';
import { getDefaultMediaLibraryService } from '@membrana/media-library-service';
import { bindSamplePlaybackBlobReader } from '@membrana/sample-playback-service';
import { useLiveJournal } from '@membrana/telemetry-journal-service';

import { useServerFirstStore } from '@/stores/serverFirstStore';

import { LiveJournalItemRow } from '../telemetry-journal/components/LiveJournalItemRow';
import { useLiveJournalAutoRefresh } from '../telemetry-journal/useLiveJournalAutoRefresh';
import { compactLiveJournalItems } from './boardTelemetryCompact';

const TELEMETRY_JOURNAL_MODULE_ID = 'telemetry-journal';

/**
 * BTJ2 (board-telemetry-journal): компакт-панель журнала телеметрии для слота
 * правого сайдбара борда (BTJ1). Переиспользует lp5-рендереры (`LiveJournalItemRow`)
 * и живой источник (`useLiveJournal` + автообновление) — без дублирования логики.
 * Только хвост последних N записей; полный журнал (фильтры/поиск/экспорт) — в модуле.
 */
export const BoardTelemetryJournalPanel: React.FC = () => {
  const { snapshot, service } = useLiveJournal();
  useLiveJournalAutoRefresh(service);
  const capture = useServerFirstStore((s) => s.capture);
  const { exitBoardMode } = useDeviceBoardMode();

  useEffect(() => {
    bindSamplePlaybackBlobReader((sampleId: string) =>
      getDefaultMediaLibraryService().getSampleBlob(sampleId),
    );
  }, []);

  const items = useMemo(() => compactLiveJournalItems(snapshot.items), [snapshot.items]);
  // CX4: под захватом борд заперт — «Открыть журнал» (выход в модуль) заблокирован.
  const captured = capture !== null;

  const openFullJournal = (): void => {
    if (captured) return;
    exitBoardMode();
    useMembranaStore.getState().selectModule(TELEMETRY_JOURNAL_MODULE_ID);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 text-xs" role="log" aria-label="Журнал телеметрии">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-base-content/70">Телеметрия · треки и отчёты</span>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          disabled={captured}
          title={
            captured
              ? 'Устройство захвачено кабинетом — выход из борда заблокирован'
              : 'Открыть полный журнал (фильтры, поиск, экспорт)'
          }
          onClick={openFullJournal}
        >
          Открыть журнал
        </button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-box border border-dashed border-base-300 px-2 py-6 text-center text-base-content/50">
          Журнал пуст — запустите сценарий с микрофоном, появятся треки и отчёты.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {items.map((item) => (
            <li key={item.id}>
              <LiveJournalItemRow item={item} items={snapshot.items} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
