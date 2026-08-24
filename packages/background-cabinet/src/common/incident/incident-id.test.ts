import { describe, expect, it } from 'vitest';

import {
  CROCKFORD_ALPHABET,
  INCIDENT_ID_PATTERN,
  mintIncidentId,
} from './incident-id';

describe('incident-id — форма номера происшествия (вердикт M1)', () => {
  it('алфавит Crockford Base32: 32 символа, без I, L, O, U', () => {
    expect(CROCKFORD_ALPHABET).toHaveLength(32);
    for (const banned of ['I', 'L', 'O', 'U']) {
      expect(CROCKFORD_ALPHABET).not.toContain(banned);
    }
  });

  it('чекан TMP: TMP-XXXX-XXXX, символы только из алфавита (диктуемо голосом)', () => {
    for (let i = 0; i < 50; i += 1) {
      const { id, source } = mintIncidentId();
      expect(source).toBe('tmp');
      expect(id).toMatch(INCIDENT_ID_PATTERN);
      expect(id.startsWith('TMP-')).toBe(true);
      for (const ch of id.slice(4).replace('-', '')) {
        expect(CROCKFORD_ALPHABET).toContain(ch);
      }
    }
  });

  it('номера не повторяются на разумной выборке', () => {
    const seen = new Set(Array.from({ length: 200 }, () => mintIncidentId().id));
    expect(seen.size).toBe(200);
  });

  it('паттерн принимает и будущий официальный INC той же формы', () => {
    expect('INC-7X2M-Q9RD').toMatch(INCIDENT_ID_PATTERN);
    expect('INC-7I2M-Q9RD').not.toMatch(INCIDENT_ID_PATTERN); // I запрещён
    expect('TMP-1234').not.toMatch(INCIDENT_ID_PATTERN);
  });
});
