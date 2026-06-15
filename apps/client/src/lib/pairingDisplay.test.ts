import { describe, expect, it } from 'vitest';

import { shortId } from './pairingDisplay';

describe('pairingDisplay', () => {
  it('shortId truncates long ids', () => {
    expect(shortId('abcdefgh-1234-5678')).toBe('abcdefgh…');
  });

  it('shortId leaves short ids unchanged', () => {
    expect(shortId('abc')).toBe('abc');
  });
});
