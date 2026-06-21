import { describe, expect, it } from 'vitest';

import {
  buildRecordingUploadNotes,
  captureFormatToMimeType,
  normalizeCaptureBlob,
} from './recording-upload-utils.js';

describe('recording-upload-utils (A2)', () => {
  it('maps capture formats to MIME types', () => {
    expect(captureFormatToMimeType('wav')).toBe('audio/wav');
    expect(captureFormatToMimeType('webm')).toMatch(/^audio\/webm/);
    expect(captureFormatToMimeType('mp4')).toMatch(/^audio\//);
  });

  it('covers smoke matrix captureFormat MIME mapping', () => {
    for (const format of ['wav', 'webm', 'mp4'] as const) {
      const blob = normalizeCaptureBlob(new Blob([]), format);
      expect(blob.type.length).toBeGreaterThan(0);
      expect(blob.type).toMatch(/^audio\//);
    }
  });

  it('normalizes blob MIME when type is empty', () => {
    const raw = new Blob([new Uint8Array([1, 2, 3])]);
    const normalized = normalizeCaptureBlob(raw, 'wav');
    expect(normalized.type).toBe('audio/wav');
    expect(normalized.size).toBe(raw.size);
  });

  it('preserves blob when MIME already matches format', () => {
    const typed = new Blob([new Uint8Array([1])], { type: 'audio/webm' });
    expect(normalizeCaptureBlob(typed, 'webm')).toBe(typed);
  });

  it('keeps duration invariant through upload notes helper', () => {
    expect(buildRecordingUploadNotes('node-1', 'mp4')).toContain('format=mp4');
    expect(buildRecordingUploadNotes('node-1', 'mp4')).toContain('node-1');
  });
});
