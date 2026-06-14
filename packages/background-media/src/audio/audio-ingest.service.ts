import {
  BadRequestException,
  Inject,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { AudioFormat } from '../prisma/client';
import { WaveFile } from 'wavefile';
import type { AppConfig } from '../config/env.schema';
import { APP_CONFIG } from '../config/config.tokens';

export interface ParsedAudioMeta {
  audioFormat: AudioFormat;
  contentType: string;
  durationSec: number;
  sampleRate: number;
  channels: 1 | 2;
  sizeBytes: number;
}

const MIME_TO_FORMAT: Record<string, { format: AudioFormat; contentType: string }> = {
  'audio/wav': { format: 'wav', contentType: 'audio/wav' },
  'audio/wave': { format: 'wav', contentType: 'audio/wav' },
  'audio/x-wav': { format: 'wav', contentType: 'audio/wav' },
  'audio/mpeg': { format: 'mp3', contentType: 'audio/mpeg' },
  'audio/mp3': { format: 'mp3', contentType: 'audio/mpeg' },
  'audio/flac': { format: 'flac', contentType: 'audio/flac' },
  'audio/ogg': { format: 'ogg', contentType: 'audio/ogg' },
  'application/ogg': { format: 'ogg', contentType: 'audio/ogg' },
};

@Injectable()
export class AudioIngestService {
  private readonly allowedMime: Set<string>;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.allowedMime = new Set(config.MEDIA_ALLOWED_MIME);
  }

  async parseUpload(buffer: Buffer, mimeType: string | undefined): Promise<ParsedAudioMeta> {
    const normalizedMime = (mimeType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
    if (!normalizedMime || !this.allowedMime.has(normalizedMime)) {
      throw new UnsupportedMediaTypeException(
        `Unsupported audio type: ${normalizedMime || 'unknown'}`,
      );
    }

    const mapping = MIME_TO_FORMAT[normalizedMime];
    if (!mapping) {
      throw new UnsupportedMediaTypeException(`Unsupported audio type: ${normalizedMime}`);
    }

    if (buffer.byteLength > this.config.MAX_UPLOAD_BYTES) {
      throw new BadRequestException('File exceeds MAX_UPLOAD_BYTES');
    }

    const { parseBuffer } = await import('music-metadata');
    const metadata = await parseBuffer(buffer, { mimeType: normalizedMime });
    const durationSec = metadata.format.duration ?? 0;
    const sampleRate = metadata.format.sampleRate ?? 0;
    const channelsRaw = metadata.format.numberOfChannels ?? 1;
    const channels: 1 | 2 = channelsRaw >= 2 ? 2 : 1;

    if (mapping.format === 'wav') {
      this.validateWavPcm(buffer, sampleRate, channels);
    }

    if (!durationSec || !sampleRate) {
      throw new BadRequestException('Could not extract audio metadata from file');
    }

    return {
      audioFormat: mapping.format,
      contentType: mapping.contentType,
      durationSec,
      sampleRate: Math.round(sampleRate),
      channels,
      sizeBytes: buffer.byteLength,
    };
  }

  private validateWavPcm(buffer: Buffer, sampleRate: number, channels: 1 | 2): void {
    try {
      const wav = new WaveFile(buffer);
      if (!wav.fmt) {
        throw new BadRequestException('Invalid WAV: missing fmt chunk');
      }
      const fmt = wav.fmt as { sampleRate?: number; numChannels?: number };
      const wavRate = fmt.sampleRate;
      const wavChannels = fmt.numChannels;
      if (wavRate && sampleRate && Math.abs(wavRate - sampleRate) > 1) {
        throw new BadRequestException('WAV header sample rate mismatch');
      }
      if (wavChannels && wavChannels !== channels && wavChannels !== 1 && wavChannels !== 2) {
        throw new BadRequestException('WAV unsupported channel count');
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Invalid WAV file');
    }
  }
}
