import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { LinearService } from './linear.service';

describe('LinearService (office — no GraphQL)', () => {
  it('getIssueByIdentifier refuses with clear media-egress error (no fetch)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const svc = new LinearService();
    await expect(svc.getIssueByIdentifier('TEC-42')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    try {
      await svc.getIssueByIdentifier('TEC-42');
    } catch (e) {
      const ex = e as ServiceUnavailableException;
      const body = ex.getResponse() as { code?: string; message?: string };
      expect(body.code).toBe('LINEAR_OFFICE_EGRESS_DISABLED');
      expect(String(body.message)).toMatch(/media-NL|linear-snapshots\/capture/i);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('addComment refuses without network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const svc = new LinearService();
    await expect(svc.addComment('TEC-42', 'hi')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('formatIssueForPrompt still formats a local view object', () => {
    const svc = new LinearService();
    const text = svc.formatIssueForPrompt({
      id: '1',
      identifier: 'TEC-1',
      title: 'T',
      description: 'D',
      state: 'Todo',
      labels: [],
      comments: [],
      url: 'https://linear.app/x',
    });
    expect(text).toContain('TEC-1');
    expect(text).toContain('D');
  });
});
