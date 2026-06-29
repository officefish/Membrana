/**
 * Каталог типов сокетов signal graph.
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §5.1
 */

/** Все известные типы сокетов (расширяется через PR в core). */
export const SOCKET_TYPES = [
  'AudioFrame',
  'Spectrum',
  'Detection',
  'TDOAPair',
  'IQSamples',
  'RFSignature',
  'ThermalFrame',
  'BlobMask',
  'Observation',
  // v0.4 (device-board refactor): ссылочные типы данных для dataflow сценария.
  'DeviceRef',
  'MicrophoneRef',
  'ServerRef',
  'AudioStreamRef',
  'AudioSampleRef',
  'FftFrameRef',
  // v0.5 (collectors): singleton refs + batch lists for terminal nodes.
  'RecorderRef',
  'SpectralAnalyserRef',
  'AudioSampleRefList',
  'FftFrameRefList',
  // v0.6 (journal + reporter): journal scope, reporter, track/report/analysis refs.
  'JournalRef',
  'ReporterRef',
  'TrackRef',
  'ReportRef',
  'FftTrendAnalysisRef',
  /** v0.7: PCM slice после StopRecording (host-held до MakeTrack). */
  'RecordingSliceRef',
  // v0.4+: value-типы scenario dataflow (не ссылки на внешний ресурс).
  'DateTime',
  'Integer',
  'String',
  /** v0.7: policy окна записи (windowSec + captureFormat). */
  'RecordingPolicy',
  /** v0.8: policy FFT trends-анализа (MakeFftTrendsPolicy). */
  'FftTrendsPolicy',
  /** AP v1: handle in-flight async job (start-async-job → await / on-async-resolved). */
  'PromiseRef',
] as const;

/** Имя типа сокета signal graph. */
export type SocketType = (typeof SOCKET_TYPES)[number];

/** Минимальный набор для хакатона 1 / D0. */
export const D0_SOCKET_TYPES = ['AudioFrame', 'Spectrum'] as const satisfies readonly SocketType[];

/**
 * Ссылочные типы данных scenario dataflow (v0.4): несут handle на ресурс
 * устройства и флаг `valid`. Источник — Event-узел, переменные, get-методы.
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §15 (v0.4)
 */
export const REFERENCE_SOCKET_TYPES = [
  'DeviceRef',
  'MicrophoneRef',
  'ServerRef',
  'AudioStreamRef',
  'AudioSampleRef',
  'FftFrameRef',
  'RecorderRef',
  'SpectralAnalyserRef',
  'AudioSampleRefList',
  'FftFrameRefList',
  'JournalRef',
  'ReporterRef',
  'TrackRef',
  'ReportRef',
  'FftTrendAnalysisRef',
  'RecordingSliceRef',
  'PromiseRef',
] as const satisfies readonly SocketType[];

/**
 * Value-типы scenario dataflow: передаются по dataflow как значения
 * (без `valid` / nullable-ссылочной семантики).
 */
export const VALUE_SOCKET_TYPES = [
  'DateTime',
  'Integer',
  'String',
  'RecordingPolicy',
  'FftTrendsPolicy',
] as const satisfies readonly SocketType[];

/** Имя ссылочного типа данных (подмножество `SocketType`). */
export type ReferenceSocketType = (typeof REFERENCE_SOCKET_TYPES)[number];

/** Имя value-типа данных (подмножество `SocketType`). */
export type ValueSocketType = (typeof VALUE_SOCKET_TYPES)[number];

/** Type guard для `ReferenceSocketType`. */
export function isReferenceSocketType(value: string): value is ReferenceSocketType {
  return (REFERENCE_SOCKET_TYPES as readonly string[]).includes(value);
}

/** Type guard для `ValueSocketType`. */
export function isValueSocketType(value: string): value is ValueSocketType {
  return (VALUE_SOCKET_TYPES as readonly string[]).includes(value);
}

/** Описание pin на ноде signal graph. */
export interface SocketSpec {
  readonly name: string;
  readonly socketType: SocketType;
}

/** Type guard для `SocketType`. */
export function isSocketType(value: string): value is SocketType {
  return (SOCKET_TYPES as readonly string[]).includes(value);
}

/**
 * Совместимость data-соединения signal graph: только одинаковые типы.
 * Exec-рёбра scenario graph валидируются отдельно.
 */
export function isValidSocketConnection(source: SocketType, target: SocketType): boolean {
  return source === target;
}
