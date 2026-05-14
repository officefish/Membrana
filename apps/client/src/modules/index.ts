/**
 * Реализации модулей грузятся лениво. Точка входа регистрации — registerClientModules.
 */
export { registerClientModules } from './registerClientModules';
export type { FFTConfig } from './FFTModule';
export type { SpectrumConfig } from './SpectrumModule';
export type { OscilloscopeConfig } from './OscilloscopeModule';
export type { AudioFileUploadConfig } from './AudioFileUploadModule';
export type { MicrophoneConfig } from './microphone/MicrophoneModule';
export type { TelemetryJournalModuleConfig } from './telemetry-journal/types';
