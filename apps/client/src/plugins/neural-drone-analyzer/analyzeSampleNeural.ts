/**
 * ND2 — offline-прогон нейро-детекции по сэмплу библиотеки.
 *
 * Буфер сэмпла берётся через sample-playback-service (публичный API audio-engine,
 * без прямого Web Audio — ARCHITECTURE §1b). Весь клип отдаётся детектору одним
 * AudioWindow: YAMNet сам нарезает волну на фреймы 0.96 с, clip-score усредняется.
 */
import { getMonoChannel } from '@membrana/audio-engine-service';
import { loadSampleBufferById } from '@membrana/sample-playback-service';
import type { AudioWindow, DetectionResult, DroneDetector } from '@membrana/detector-base';

export async function analyzeSampleNeural(
  detector: DroneDetector,
  sampleId: string,
): Promise<DetectionResult> {
  const buffer = await loadSampleBufferById(sampleId);
  const samples = getMonoChannel(buffer);
  const window: AudioWindow = {
    samples,
    sampleRate: buffer.sampleRate,
    timestamp: 0,
    durationSec: samples.length / buffer.sampleRate,
  };
  return detector.detect(window);
}
