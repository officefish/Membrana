import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.schema';

describe('parseEnv', () => {
  it('parses defaults and mime list', () => {
    const cfg = parseEnv({
      API_INTERNAL_TOKEN: 'tok',
      DATABASE_URL: 'postgresql://localhost/db',
    });
    expect(cfg.PORT).toBe(3010);
    expect(cfg.MEDIA_ALLOWED_MIME).toContain('audio/wav');
    expect(cfg.MEDIA_ALLOWED_MIME).toContain('audio/mpeg');
  });
});
