/**
 * @membrana/audio-engine-service — публичное API.
 *
 * Фундаментный сервис: AudioContext, файлы, микрофон, поток сэмплов.
 * Не делает анализа — только поставляет данные потребителям
 * (FFT-, нейросетевые-, LLM-анализаторы).
 *
 * См. docs/SERVICES.md.
 */

// Engine
export { LiveSampler } from './core/live-sampler.js';
export type {
  LiveSamplerEvent,
  LiveSamplerEventMap,
} from './core/live-sampler.js';

// Web Audio helpers
export {
  createAudioContext,
  closeAudioContext,
} from './core/audio-context.js';
export {
  loadAudioBuffer,
  getMonoChannel,
} from './core/load-audio-buffer.js';
export {
  acquireMicrophone,
  releaseMediaStream,
  checkMicrophonePermission,
  getAudioInputDevices,
} from './core/microphone.js';

// React-хуки
export {
  useLiveSampler,
  type UseLiveSamplerOptions,
  type UseLiveSamplerReturn,
} from './hooks/use-live-sampler.js';
export {
  useMicrophone,
  type UseMicrophoneOptions,
  type UseMicrophoneReturn,
} from './hooks/use-microphone.js';
export {
  useAudioFile,
  type UseAudioFileReturn,
} from './hooks/use-audio-file.js';

// Типы
export type {
  AudioSampleFrame,
  SampleFrameHandler,
  LiveCaptureConfig,
  LiveSamplerState,
} from './types.js';
export { DEFAULT_LIVE_CAPTURE_CONFIG } from './types.js';
