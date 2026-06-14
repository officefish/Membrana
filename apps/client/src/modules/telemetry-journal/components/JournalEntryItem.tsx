import React, { useState } from 'react';
import type { TelemetryEntry } from '@membrana/telemetry-service';

import { initReportRenderers } from '../reportRenderers/initReportRenderers';
import { resolveReportRenderer } from '../reportRenderers/registry';

import { JournalEntryRow } from './JournalEntryRow';

initReportRenderers();

export interface JournalEntryItemProps {
  readonly entry: TelemetryEntry;
}

export const JournalEntryItem: React.FC<JournalEntryItemProps> = ({ entry }) => {
  const [expanded, setExpanded] = useState(false);
  const renderer = resolveReportRenderer(entry);

  if (renderer) {
    return renderer({
      entry,
      expanded,
      onToggle: () => setExpanded((v) => !v),
    });
  }

  return <JournalEntryRow entry={entry} />;
};
