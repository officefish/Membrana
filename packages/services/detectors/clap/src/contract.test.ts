import { describe, expect, it } from 'vitest';
import { harmonicDroneWindow, sineWindow, whiteNoiseWindow } from '@membrana/detector-base';
import { ClapDetector } from './detector.js';

describe('clap detector contract', () => {
  const detector = new ClapDetector();

  it('exposes name and family', () => {
    expect(detector.name).toBe('clap');
    expect(detector.family).toBe('neural');
  });

  it('detect rejects with NotImplementedError on sine', async () => {
    await expect(detector.detect(sineWindow(440))).rejects.toThrow(/not implemented/i);
  });

  it('detect rejects on harmonic mock', async () => {
    await expect(detector.detect(harmonicDroneWindow())).rejects.toThrow(/not implemented/i);
  });

  it('detect rejects on white noise', async () => {
    await expect(detector.detect(whiteNoiseWindow())).rejects.toThrow(/not implemented/i);
  });
});
