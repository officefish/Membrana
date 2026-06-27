import { describe, expect, it } from 'vitest';

import { loadRagConfig, RAG_CONFIG_DEFAULTS } from './config.js';

describe('loadRagConfig OPENAI_BASE_URL', () => {
  it('uses the official OpenAI endpoint by default', () => {
    expect(loadRagConfig({}).openaiBaseUrl).toBe(RAG_CONFIG_DEFAULTS.openaiBaseUrl);
  });

  it('normalizes a proxy endpoint without changing its path', () => {
    expect(
      loadRagConfig({ OPENAI_BASE_URL: '  http://127.0.0.1:8080/openai/v1///  ' })
        .openaiBaseUrl,
    ).toBe('http://127.0.0.1:8080/openai/v1');
  });
});
