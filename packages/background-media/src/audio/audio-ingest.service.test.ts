import { describe, expect, it } from 'vitest';
import { WaveFile } from 'wavefile';
import type { AppConfig } from '../config/env.schema';
import { AudioIngestService } from './audio-ingest.service';

function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    PORT: 3010,
    NODE_ENV: 'test',
    LOG_LEVEL: 'info',
    API_INTERNAL_TOKEN: 't',
    DATABASE_URL: 'postgresql://x',
    MEDIA_BLOB_DIR: './data/blobs',
    MEDIA_QUOTA_BYTES_PER_DEVICE: 1_000_000,
    MAX_UPLOAD_BYTES: 500_000,
    MEDIA_ALLOWED_MIME: ['audio/wav', 'audio/mpeg'],
    ...overrides,
  };
}

function makeSilentWav(seconds = 0.1, sampleRate = 16000): Buffer {
  const samples = Math.floor(seconds * sampleRate);
  const pcm = new Int16Array(samples);
  const wav = new WaveFile();
  wav.fromScratch(1, sampleRate, '16', pcm);
  return Buffer.from(wav.toBuffer());
}

describe('AudioIngestService', () => {
  it('parses WAV metadata', async () => {
    const svc = new AudioIngestService(testConfig());
    const buf = makeSilentWav();
    const meta = await svc.parseUpload(buf, 'audio/wav');
    expect(meta.audioFormat).toBe('wav');
    expect(meta.sampleRate).toBe(16000);
    expect(meta.channels).toBe(1);
    expect(meta.durationSec).toBeGreaterThan(0);
  });

  it('rejects unknown mime', async () => {
    const svc = new AudioIngestService(testConfig());
    const buf = makeSilentWav();
    await expect(svc.parseUpload(buf, 'audio/aac')).rejects.toMatchObject({
      status: 415,
    });
  });
});
