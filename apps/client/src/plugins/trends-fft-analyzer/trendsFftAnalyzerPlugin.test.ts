import { describe, expect, it } from 'vitest';

import { createTrendsFftAnalyzerPlugin } from './trendsFftAnalyzerPlugin';
import { TRENDS_FFT_ANALYZER_PLUGIN_ID } from './types';

describe('createTrendsFftAnalyzerPlugin', () => {
  it('registers plugin with canonical id and microphone-only v1 config', () => {
    const plugin = createTrendsFftAnalyzerPlugin();
    expect(plugin.id).toBe(TRENDS_FFT_ANALYZER_PLUGIN_ID);
    expect(plugin.config?.analysisSource).toBe('microphone');
    expect(plugin.config?.enabledTemplateKeys.length).toBeGreaterThan(0);
  });
});
