/** Legacy terminal node kinds (collectors v0.5); migrate to v0.6 journal reporter chain (DBJ5). */
export const LEGACY_TERMINAL_NODE_KINDS = [
  'new-track',
  'new-fft-trends-analysis',
] as const;

export type LegacyTerminalNodeKind = (typeof LEGACY_TERMINAL_NODE_KINDS)[number];

/** Migration hint for runtime logs and docs. */
export const LEGACY_TERMINAL_MIGRATION_HINT =
  'v0.6: GetJournal → GetReporter → MakeReport* → PublishReport (DEVICE_BOARD_CONCEPT §17)';

/** True, если nodeKind — legacy terminal consumer v0.5. */
export function isLegacyTerminalNodeKind(nodeKind: string): nodeKind is LegacyTerminalNodeKind {
  return (LEGACY_TERMINAL_NODE_KINDS as readonly string[]).includes(nodeKind);
}

/** Structured deprecation log для legacy terminal (NewTrack / NewFftTrendsAnalysis). */
export function logLegacyTerminalDeprecation(
  log: (message: string, context?: Readonly<Record<string, unknown>>) => void,
  nodeKind: LegacyTerminalNodeKind,
  nodeId: string,
): void {
  log('legacy-terminal-deprecated', {
    nodeKind,
    nodeId,
    migration: LEGACY_TERMINAL_MIGRATION_HINT,
  });
}
