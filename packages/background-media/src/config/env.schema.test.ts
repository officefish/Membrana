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
    expect(cfg.SWAGGER_ENABLED).toBe(true);
  });

  it('defaults SWAGGER_ENABLED to false in production', () => {
    const cfg = parseEnv({
      NODE_ENV: 'production',
      API_INTERNAL_TOKEN: 'tok',
      DATABASE_URL: 'postgresql://localhost/db',
    });
    expect(cfg.SWAGGER_ENABLED).toBe(false);
  });

  it('honours SWAGGER_ENABLED=true in production', () => {
    const cfg = parseEnv({
      NODE_ENV: 'production',
      SWAGGER_ENABLED: 'true',
      API_INTERNAL_TOKEN: 'tok',
      DATABASE_URL: 'postgresql://localhost/db',
    });
    expect(cfg.SWAGGER_ENABLED).toBe(true);
  });
});
