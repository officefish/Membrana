import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const CABINET_SRC = fileURLToPath(new URL('../../', import.meta.url));

function readCabinetSource(relativePath: string): string {
  return readFileSync(join(CABINET_SRC, relativePath), 'utf8');
}

/** CRDC D4 — sample-library player a11y contract (static audit). */
describe('sample-library a11y (cabinet)', () => {
  it('CabinetSamplePlayerSection exposes region + aria-label', () => {
    const source = readCabinetSource('components/sample-library/CabinetSamplePlayerSection.tsx');
    expect(source).toContain('role="region"');
    expect(source).toContain('aria-label="Плеер сэмпла"');
  });

  it('CabinetSampleTable does not embed waveform scrubber (player is above table)', () => {
    const source = readCabinetSource('components/sample-library/CabinetSampleTable.tsx');
    expect(source).not.toContain('SampleWaveformScrubber');
  });

  it('useCabinetSampleLibrary wires Escape key for playback', () => {
    const source = readCabinetSource('lib/useCabinetSampleLibrary.ts');
    expect(source).toContain('useSamplePlaybackEscapeKey');
  });

  it('SamplePlaybackBar uses group semantics for controls', () => {
    const source = readCabinetSource('components/sample-playback/SamplePlaybackBar.tsx');
    expect(source).toContain('role="group"');
    expect(source).toContain('aria-label="Управление воспроизведением сэмпла"');
  });
});
