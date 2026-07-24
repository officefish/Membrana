import { describe, expect, it } from 'vitest';

import {
  ATLAS_DOCS_FALLBACK_URL,
  ATLAS_DOCS_URL,
  ATLAS_GIT_URL,
} from './ToolingAtlasBoard';

describe('ToolingAtlasBoard links', () => {
  it('git зеркало — ATLAS.md в main', () => {
    expect(ATLAS_GIT_URL).toContain('github.com/officefish/Membrana');
    expect(ATLAS_GIT_URL).toContain('docs/tooling-atlas/registry/ATLAS.md');
  });

  it('primary — harness custom domain, не product docs', () => {
    expect(ATLAS_DOCS_URL).toBe('https://harness.mmbrn.tech/tooling/containers');
    expect(ATLAS_DOCS_URL).not.toContain('docs.mmbrn.tech');
  });

  it('fallback — harness Mintlify slug, не product membrana.mintlify.app', () => {
    expect(ATLAS_DOCS_FALLBACK_URL).toBe(
      'https://membrana-harness.mintlify.app/tooling/containers',
    );
    expect(ATLAS_DOCS_FALLBACK_URL).not.toContain('membrana.mintlify.app/');
  });
});
