import { describe, expect, it } from 'vitest';

import { ATLAS_DOCS_FALLBACK_URL, ATLAS_DOCS_URL } from './ToolingAtlasBoard';

describe('ToolingAtlasBoard links', () => {
  it('канон — docs.mmbrn.tech/tooling/containers', () => {
    expect(ATLAS_DOCS_URL).toBe('https://docs.mmbrn.tech/tooling/containers');
  });

  it('fallback — membrana.mintlify.app', () => {
    expect(ATLAS_DOCS_FALLBACK_URL).toContain('mintlify.app');
    expect(ATLAS_DOCS_FALLBACK_URL).toContain('tooling/containers');
  });
});
