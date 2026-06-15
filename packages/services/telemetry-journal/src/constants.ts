import type { LiveJournalStorageMode } from './types.js';

export const DEFAULT_LIVE_JOURNAL_MAX_ITEMS = 500;

export const LIVE_JOURNAL_MODULE_NAME = 'microphone';

export const LIVE_JOURNAL_TRACK_TAGS = ['live', 'track'] as const;

export const LIVE_JOURNAL_REPORT_TAGS = ['live', 'report', 'analysis'] as const;

export const LIVE_JOURNAL_DETECTION_TAG = 'detection';

export const LIVE_JOURNAL_CLEAR_TAG = 'clear';

export const DEFAULT_LIVE_JOURNAL_STORAGE_MODE: LiveJournalStorageMode =
  'browser-limited-fallback';

export interface LiveJournalConfig {
  readonly maxItems: number;
}

export const DEFAULT_LIVE_JOURNAL_CONFIG: LiveJournalConfig = {
  maxItems: DEFAULT_LIVE_JOURNAL_MAX_ITEMS,
};
