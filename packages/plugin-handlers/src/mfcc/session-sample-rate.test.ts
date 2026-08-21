import { describe, expect, it } from 'vitest';
import { summarizeSessionSampleRates } from './session-sample-rate.js';

describe('mfcc session sample-rate consistency', () => {
  it('accepts a homogeneous 48 kHz session set', () => {
    expect(summarizeSessionSampleRates([
      { sampleId: 'a', sampleRate: 48000 },
      { sampleId: 'b', sampleRate: 48000 },
    ], 48000)).toMatchObject({
      status: 'homogeneous',
      judgeable: true,
      reason: null,
      groups: [{ sampleRate: 48000, sampleIds: ['a', 'b'] }],
    });
  });

  it('names homogeneous but non-judgeable 44.1 kHz sets', () => {
    const result = summarizeSessionSampleRates([{ sampleId: 'field-441', sampleRate: 44100 }], 48000);
    expect(result).toMatchObject({ status: 'homogeneous', judgeable: false });
    expect(result.reason).toMatch(/44100 Hz ≠ 48000 Hz/u);
  });

  it('names mixed 44.1 and 48 kHz sets explicitly', () => {
    const result = summarizeSessionSampleRates([
      { sampleId: 'track-48-a', sampleRate: 48000 },
      { sampleId: 'track-441', title: 'MakeTrack 31b53800-1d5', sampleRate: 44100 },
      { sampleId: 'track-48-b', sampleRate: 48000 },
    ], 48000);
    expect(result.status).toBe('mixed');
    expect(result.judgeable).toBe(false);
    expect(result.reason).toMatch(/разнородная частота/u);
    expect(result.reason).toMatch(/44100 Hz: MakeTrack 31b53800-1d5/u);
    expect(result.reason).toMatch(/48000 Hz: track-48-a, track-48-b/u);
  });

  it('does not silently ignore missing sampleRate', () => {
    const result = summarizeSessionSampleRates([
      { sampleId: 'ok', sampleRate: 48000 },
      { sampleId: 'unknown', sampleRate: null },
    ], 48000);
    expect(result).toMatchObject({ status: 'missing', judgeable: false });
    expect(result.reason).toMatch(/без sampleRate/u);
  });
});
