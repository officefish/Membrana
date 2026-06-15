import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

import { CabinetLiveJournalReportCard } from './CabinetLiveJournalReportCard';
import { CabinetLiveJournalTrackCard } from './CabinetLiveJournalTrackCard';

export interface CabinetLiveJournalItemRowProps {
  readonly item: LiveJournalItem;
  readonly linkedReportCount: number;
  readonly trackTitle?: string | null;
  readonly isPlaying: boolean;
  readonly isActive: boolean;
  readonly onPlay: () => Promise<void>;
  readonly onExportBlob: () => Promise<Blob>;
}

export function CabinetLiveJournalItemRow({
  item,
  linkedReportCount,
  trackTitle,
  isPlaying,
  isActive,
  onPlay,
  onExportBlob,
}: CabinetLiveJournalItemRowProps) {
  if (item.kind === 'track') {
    return (
      <CabinetLiveJournalTrackCard
        item={item}
        linkedReportCount={linkedReportCount}
        isPlaying={isPlaying}
        isActive={isActive}
        onPlay={onPlay}
        onExportBlob={onExportBlob}
      />
    );
  }

  return <CabinetLiveJournalReportCard item={item} trackTitle={trackTitle} />;
}
