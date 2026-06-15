import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

import { CabinetLiveJournalReportCard } from './CabinetLiveJournalReportCard';
import { CabinetLiveJournalTrackCard } from './CabinetLiveJournalTrackCard';

export interface CabinetLiveJournalItemRowProps {
  readonly item: LiveJournalItem;
  readonly linkedReportCount: number;
  readonly trackTitle?: string | null;
  readonly onPlay: () => Promise<void>;
  readonly onExportBlob: () => Promise<Blob>;
}

export function CabinetLiveJournalItemRow({
  item,
  linkedReportCount,
  trackTitle,
  onPlay,
  onExportBlob,
}: CabinetLiveJournalItemRowProps) {
  if (item.kind === 'track') {
    return (
      <CabinetLiveJournalTrackCard
        item={item}
        linkedReportCount={linkedReportCount}
        onPlay={onPlay}
        onExportBlob={onExportBlob}
      />
    );
  }

  return <CabinetLiveJournalReportCard item={item} trackTitle={trackTitle} />;
}
