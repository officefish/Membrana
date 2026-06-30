import React, { useMemo } from 'react';
import type { LiveJournalItem } from '@membrana/telemetry-journal-service';
import { findReportsForTrack, findTrackForReport } from '@membrana/telemetry-journal-service';

import { LiveJournalReportCard } from './LiveJournalReportCard';
import { LiveJournalTrackCard } from './LiveJournalTrackCard';

export interface LiveJournalItemRowProps {
  readonly item: LiveJournalItem;
  readonly items: readonly LiveJournalItem[];
}

export const LiveJournalItemRow: React.FC<LiveJournalItemRowProps> = ({ item, items }) => {
  const linkedReportCount = useMemo(() => {
    if (item.kind !== 'track' || !item.track) return 0;
    return findReportsForTrack(items, item.track.trackId).length;
  }, [item, items]);

  const trackTitle = useMemo(() => {
    if (item.kind !== 'report' || !item.report) return null;
    return findTrackForReport(items, item.report.trackId)?.track?.title ?? null;
  }, [item, items]);

  if (item.kind === 'track') {
    return <LiveJournalTrackCard item={item} linkedReportCount={linkedReportCount} />;
  }

  return <LiveJournalReportCard item={item} trackTitle={trackTitle} />;
};
