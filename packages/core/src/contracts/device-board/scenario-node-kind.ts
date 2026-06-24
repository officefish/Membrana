/**
 * Таксономия узлов scenario graph v0.4+ (`nodeKind` на канвасе).
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §15–§16
 */

/**
 * Виды узлов v0.4–v0.5:
 * - v0.4: event, variable-*, print, is-valid, get-microphone, streaming, get-sample, get-fft-frame, …
 * - v0.5: get-recorder, get-spectral-analyser, collect-*, make-track, make-fft-trends-analysis
 * - v0.6: get-journal, get-reporter, make-report-*, publish-report
 * - v0.7: start-recording, stop-recording, is-recording-window-full, flush-spectral-analyser
 * - v0.8: make-recording-policy, make-fft-trends-policy (policy constructors)
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
  'pause-runtime',
  /** Exec fan-out replacement: Then 0..N + exec-out. */
  'sequence',
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
  /** v0.7: StartRecording(recorder, stream, policy?) → rolling PCM window. */
  'start-recording',
  /** v0.7: StopRecording(recorder) → RecordingSliceRef. */
  'stop-recording',
  /** v0.7: gate — elapsed >= windowSec (host clock). */
  'is-recording-window-full',
  /** v0.7: FlushSpectralAnalyser(analyser) → FftFrameRefList (explicit flush). */
  'flush-spectral-analyser',
  /** v0.8: MakeRecordingPolicy — exec → RecordingPolicy value (constructor). */
  'make-recording-policy',
  /** v0.8: MakeFftTrendsPolicy — exec → FftTrendsPolicy value (constructor). */
  'make-fft-trends-policy',
  /** CGF F1: system Input tunnel (function canvas). */
  'function-input',
  /** CGF F1: system Output tunnel (function canvas). */
  'function-output',
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

/** Recording gate узлы v0.7. */
export const RECORDING_GATE_SCENARIO_NODE_KINDS = [
  'start-recording',
  'stop-recording',
  'is-recording-window-full',
  'flush-spectral-analyser',
] as const satisfies readonly ScenarioNodeKind[];

export type RecordingGateScenarioNodeKind = (typeof RECORDING_GATE_SCENARIO_NODE_KINDS)[number];

/**
 * Узлы-конструкторы v0.8+: создают value/ref на exec и отдают по data-out.
 * MakeTrack / make-report-* / make-fft-trends-analysis — ref-конструкторы (side-effect + host store).
 * make-*-policy — pure value constructors (конфиг на узле → dataflow value; always pure v0.9).
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §15.7
 */
export const POLICY_CONSTRUCTOR_SCENARIO_NODE_KINDS = [
  'make-recording-policy',
  'make-fft-trends-policy',
] as const satisfies readonly ScenarioNodeKind[];

export type PolicyConstructorScenarioNodeKind =
  (typeof POLICY_CONSTRUCTOR_SCENARIO_NODE_KINDS)[number];

/** Ref-конструкторы: host-side materialization (TrackRef, ReportRef, …). */
export const REF_CONSTRUCTOR_SCENARIO_NODE_KINDS = [
  'make-track',
  'make-fft-trends-analysis',
  'make-report-from-track',
  'make-report-from-analysis',
] as const satisfies readonly ScenarioNodeKind[];

export type RefConstructorScenarioNodeKind = (typeof REF_CONSTRUCTOR_SCENARIO_NODE_KINDS)[number];

/** Все узлы-конструкторы (policy + ref). */
export const CONSTRUCTOR_SCENARIO_NODE_KINDS = [
  ...POLICY_CONSTRUCTOR_SCENARIO_NODE_KINDS,
  ...REF_CONSTRUCTOR_SCENARIO_NODE_KINDS,
] as const satisfies readonly ScenarioNodeKind[];

export type ConstructorScenarioNodeKind = (typeof CONSTRUCTOR_SCENARIO_NODE_KINDS)[number];

/** True, если policy value constructor v0.8. */
export function isPolicyConstructorScenarioNodeKind(
  value: string,
): value is PolicyConstructorScenarioNodeKind {
  return (POLICY_CONSTRUCTOR_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}

/** True, если ref constructor (MakeTrack, MakeReport, …). */
export function isRefConstructorScenarioNodeKind(value: string): value is RefConstructorScenarioNodeKind {
  return (REF_CONSTRUCTOR_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}

/** True, если любой constructor node kind. */
export function isConstructorScenarioNodeKind(value: string): value is ConstructorScenarioNodeKind {
  return (CONSTRUCTOR_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}

/** Системные виды узлов, которые нельзя удалять с борда. */
export const SYSTEM_SCENARIO_NODE_KINDS = [
  'event',
  'loop-repeat',
  'device-global',
  'function-input',
  'function-output',
] as const satisfies readonly ScenarioNodeKind[];

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

/** True, если recording gate v0.7. */
export function isRecordingGateScenarioNodeKind(value: string): value is RecordingGateScenarioNodeKind {
  return (RECORDING_GATE_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}
