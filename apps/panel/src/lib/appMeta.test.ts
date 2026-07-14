import { describe, expect, it } from 'vitest';
import { PANEL_TITLE, apiBase, apiPath } from './appMeta';

describe('appMeta (OP1 smoke)', () => {
  it('заголовок панели задан', () => {
    expect(PANEL_TITLE).toContain('Membrana');
  });

  it('apiPath строит относительный /v1-путь (прод и дев проксируют одинаково)', () => {
    expect(apiBase()).toBe('/v1');
    expect(apiPath('drift-anchor/digest')).toBe('/v1/drift-anchor/digest');
    expect(apiPath('/drift-anchor/digest')).toBe('/v1/drift-anchor/digest');
  });
});
