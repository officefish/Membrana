import type {
  AppendLiveJournalReportInput,
  AppendLiveJournalTrackInput,
  LiveJournalFilter,
  LiveJournalItem,
  LiveJournalStorageMode,
} from '../types.js';

/** Persistence port for live journal items (TJ1 contract). */
export interface IJournalStorageBackend {
  getStorageMode(): LiveJournalStorageMode;
  listItems(): Promise<readonly LiveJournalItem[]>;
  appendTrack(input: AppendLiveJournalTrackInput): Promise<LiveJournalItem | null>;
  appendReport(input: AppendLiveJournalReportInput): Promise<LiveJournalItem | null>;
  getItemByClientEntryId(clientEntryId: string): Promise<LiveJournalItem | null>;
  /** Remove items matching active UI filter (JE5). Returns deleted count. */
  clearByFilter(filter: LiveJournalFilter): Promise<number>;
}
