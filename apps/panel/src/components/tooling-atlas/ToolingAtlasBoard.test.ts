import { describe, expect, it } from 'vitest';

import {
  ATLAS_DOCS_FALLBACK_URL,
  ATLAS_DOCS_URL,
  ATLAS_GIT_URL,
} from './ToolingAtlasBoard';

describe('ToolingAtlasBoard links', () => {
  it('рабочая ссылка — ATLAS.md в main', () => {
    expect(ATLAS_GIT_URL).toContain('github.com/officefish/Membrana');
    expect(ATLAS_GIT_URL).toContain('docs/tooling-atlas/registry/ATLAS.md');
  });

  it('целевые Mintlify URL зарезервированы (ещё не live)', () => {
    expect(ATLAS_DOCS_URL).toBe('https://docs.mmbrn.tech/tooling/containers');
    expect(ATLAS_DOCS_FALLBACK_URL).toContain('mintlify.app');
  });
});
