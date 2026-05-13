/**
 * @deprecated Эти хелперы переехали в @membrana/audio-engine-service.
 * Re-export оставлен ТОЛЬКО для совместимости. Новые потребители должны
 * импортировать напрямую из engine.
 */
export {
  createAudioContext,
  loadAudioBuffer,
  checkMicrophonePermission,
  getAudioInputDevices,
} from '@membrana/audio-engine-service';
