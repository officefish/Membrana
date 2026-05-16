import { describe, expect, it } from 'vitest';
import { harmonicDroneWindow, sineWindow, whiteNoiseWindow } from '@membrana/detector-base';
import { AgenticClaudeDetector } from './detector.js';

describe('agentic-claude detector contract', () => {
  const detector = new AgenticClaudeDetector();

  it('exposes name and family', () => {
    expect(detector.name).toBe('agentic-claude');
    expect(detector.family).toBe('agentic');
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
