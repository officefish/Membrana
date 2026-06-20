/**
 * Таксономия узлов scenario graph v0.4+ (`nodeKind` на канвасе).
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §15–§16
 */

/**
 * Виды узлов v0.4–v0.5:
 * - v0.4: event, variable-*, print, is-valid, get-microphone, streaming, get-sample, get-fft-frame, …
 * - v0.5: get-recorder, get-spectral-analyser, collect-*, make-track, make-fft-trends-analysis
 * - v0.6: get-journal, get-reporter, make-report-*, publish-report
 */
export const SCENARIO_NODE_KINDS = [
  'event',
  'variable-get',
  'variable-set',
  'print',
  'is-valid',
  'get-microphone',
  'device-global',
  'stop-runtime',
  'start-streaming',
  'stop-streaming',
  'get-audio-stream',
  'get-sample',
  'get-fft-frame',
  /** v0.5: GetRecorder(device) → RecorderRef singleton. */
  'get-recorder',
  /** v0.5: GetSpectralAnalyser(device) → SpectralAnalyserRef singleton. */
  'get-spectral-analyser',
  /** v0.5: накопитель сэмплов + event-out on flush. */
  'collect-samples',
  /** v0.5: накопитель FFT-кадров + event-out on flush. */
  'collect-fft-frames',
  /** v0.5/v0.6: MakeTrack(recorder, samples[]) → TrackRef. */
  'make-track',
  /** v0.5/v0.6: MakeFftTrendsAnalysis(analyser, frames[]) → FftTrendAnalysisRef. */
  'make-fft-trends-analysis',
  /** v0.6: GetJournal(device|server) → JournalRef per deviceId. */
  'get-journal',
  /** v0.6: GetReporter(journal) → ReporterRef scoped к journal. */
  'get-reporter',
  /** v0.6: MakeReportFromTrack — ReporterRef + TrackRef → ReportRef. */
  'make-report-from-track',
  /** v0.6: MakeReportFromAnalysis — ReporterRef + FftTrendAnalysisRef → ReportRef. */
  'make-report-from-analysis',
  /** v0.6: PublishReport — JournalRef + ReportRef → append в journal. */
  'publish-report',
  /** Системный терминал лупа (∞): exec-ребро сюда → новая итерация. */
  'loop-repeat',
] as const;

/** Вид узла scenario graph. */
export type ScenarioNodeKind = (typeof SCENARIO_NODE_KINDS)[number];

/** Collect-узлы v0.5. */
export const COLLECTOR_SCENARIO_NODE_KINDS = [
  'collect-samples',
  'collect-fft-frames',
] as const satisfies readonly ScenarioNodeKind[];

export type CollectorScenarioNodeKind = (typeof COLLECTOR_SCENARIO_NODE_KINDS)[number];

/** Terminal consumer-узлы v0.5. */
export const TERMINAL_SCENARIO_NODE_KINDS = [
  'make-track',
  'make-fft-trends-analysis',
  'publish-report',
] as const satisfies readonly ScenarioNodeKind[];

/** @deprecated Сериализованные сценарии до переименования DBJ5→methods. */
export const LEGACY_SCENARIO_NODE_KIND_ALIASES = [
  'new-track',
  'new-fft-trends-analysis',
] as const;

export type TerminalScenarioNodeKind = (typeof TERMINAL_SCENARIO_NODE_KINDS)[number];

/** Journal / reporter узлы v0.6. */
export const JOURNAL_SCENARIO_NODE_KINDS = ['get-journal', 'get-reporter'] as const satisfies readonly ScenarioNodeKind[];

/** Make-report методы Reporter v0.6 (отдельные node kinds для палитры и suggest modal). */
export const REPORTER_METHOD_SCENARIO_NODE_KINDS = [
  'make-report-from-track',
  'make-report-from-analysis',
] as const satisfies readonly ScenarioNodeKind[];

export type JournalScenarioNodeKind = (typeof JOURNAL_SCENARIO_NODE_KINDS)[number];

export type ReporterMethodScenarioNodeKind = (typeof REPORTER_METHOD_SCENARIO_NODE_KINDS)[number];

/** Системные виды узлов, которые нельзя удалять с борда. */
export const SYSTEM_SCENARIO_NODE_KINDS = ['event', 'loop-repeat', 'device-global'] as const satisfies readonly ScenarioNodeKind[];

/** Type guard для `ScenarioNodeKind`. */
export function isScenarioNodeKind(value: string): value is ScenarioNodeKind {
  return (
    (SCENARIO_NODE_KINDS as readonly string[]).includes(value) ||
    (LEGACY_SCENARIO_NODE_KIND_ALIASES as readonly string[]).includes(value)
  );
}

/** True, если узел такого вида системный (неудаляемый). */
export function isSystemScenarioNodeKind(value: string): boolean {
  return (SYSTEM_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}

/** True, если Collect-узел v0.5. */
export function isCollectorScenarioNodeKind(value: string): value is CollectorScenarioNodeKind {
  return (COLLECTOR_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}

/** True, если terminal consumer v0.5+. */
export function isTerminalScenarioNodeKind(value: string): value is TerminalScenarioNodeKind {
  return (
    (TERMINAL_SCENARIO_NODE_KINDS as readonly string[]).includes(value) ||
    value === 'new-track' ||
    value === 'new-fft-trends-analysis'
  );
}

/** True, если journal accessor v0.6. */
export function isJournalScenarioNodeKind(value: string): value is JournalScenarioNodeKind {
  return (JOURNAL_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}

/** True, если make-report метод Reporter v0.6. */
export function isReporterMethodScenarioNodeKind(value: string): value is ReporterMethodScenarioNodeKind {
  return (REPORTER_METHOD_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}
