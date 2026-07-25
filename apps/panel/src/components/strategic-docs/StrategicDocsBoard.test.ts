import { describe, expect, it } from 'vitest';

import { STRATEGY_AFFINE_RUNBOOK_URL, STRATEGY_AFFINE_URL } from './StrategicDocsBoard';

describe('StrategicDocsBoard links', () => {
  it('primary — Affine custom domain strategy.mmbrn.tech', () => {
    expect(STRATEGY_AFFINE_URL).toBe('https://strategy.mmbrn.tech');
    expect(STRATEGY_AFFINE_URL).not.toContain('docs.mmbrn.tech');
    expect(STRATEGY_AFFINE_URL).not.toContain('harness.mmbrn.tech');
  });

  it('runbook — STRATEGY_AFFINE_DEPLOY.md in main', () => {
    expect(STRATEGY_AFFINE_RUNBOOK_URL).toContain('github.com/officefish/Membrana');
    expect(STRATEGY_AFFINE_RUNBOOK_URL).toContain('docs/deploy/STRATEGY_AFFINE_DEPLOY.md');
  });
});
