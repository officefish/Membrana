/**
 * Таксономия узлов scenario graph v0.4+ (`nodeKind` на канвасе).
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §15–§16
 */

/**
 * Виды узлов v0.4–v0.5:
 * - v0.4: event, variable-*, print, is-valid, get-microphone, streaming, get-sample, get-fft-frame, …
 * - v0.5: get-recorder, get-spectral-analyser, collect-*, new-track, new-fft-trends-analysis
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
  /** v0.5: terminal — массив AudioSampleRef → track. */
  'new-track',
  /** v0.5: terminal — массив FftFrameRef → trends analysis. */
  'new-fft-trends-analysis',
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
  'new-track',
  'new-fft-trends-analysis',
] as const satisfies readonly ScenarioNodeKind[];

/** Системные виды узлов, которые нельзя удалять с борда. */
export const SYSTEM_SCENARIO_NODE_KINDS = ['event', 'loop-repeat', 'device-global'] as const satisfies readonly ScenarioNodeKind[];

/** Type guard для `ScenarioNodeKind`. */
export function isScenarioNodeKind(value: string): value is ScenarioNodeKind {
  return (SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}

/** True, если узел такого вида системный (неудаляемый). */
export function isSystemScenarioNodeKind(value: string): boolean {
  return (SYSTEM_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}

/** True, если Collect-узел v0.5. */
export function isCollectorScenarioNodeKind(value: string): value is CollectorScenarioNodeKind {
  return (COLLECTOR_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}

/** True, если terminal consumer v0.5. */
export function isTerminalScenarioNodeKind(value: string): boolean {
  return (TERMINAL_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}
