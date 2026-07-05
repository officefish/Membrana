import { describe, it, expect } from 'vitest';
import { CANON_SOURCES, LAYER_1_TRUTH, LAYER_2_FORM, LAYER_3_DERIVED, OUT_DIR } from './index.js';

describe('comms-studio scaffold (CC1)', () => {
  it('декларирует канон по всем трём слоям (4 + 2 + 3 = 9)', () => {
    expect(LAYER_1_TRUTH.length).toBe(4);
    expect(LAYER_2_FORM.length).toBe(2);
    expect(LAYER_3_DERIVED.length).toBe(3);
    expect(CANON_SOURCES.length).toBe(9);
  });

  it('источники канона — относительные пути рабочей копии (fs-read, не import)', () => {
    for (const src of CANON_SOURCES) {
      expect(src.startsWith('docs/')).toBe(true);
      expect(src).not.toMatch(/@membrana/);
    }
  });

  it('единственный разрешённый выход — каталог out/', () => {
    expect(OUT_DIR).toBe('out');
  });
});
