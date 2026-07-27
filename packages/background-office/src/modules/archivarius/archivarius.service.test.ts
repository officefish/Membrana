import { describe, expect, it } from 'vitest';

import { MemoryArchivariusStore } from './archivarius.memory-store';
import { ArchivariusService } from './archivarius.service';

describe('ArchivariusService', () => {
  it('returns GET span extraction with bytes and sha256', async () => {
    const store = new MemoryArchivariusStore();
    const service = new ArchivariusService(store);
    await service.ingest([{
      sessionId: 's1',
      uuid: 'u1',
      ts: '2026-07-27T10:00:00.000Z',
      actor: 'owner',
      replyType: 'input',
      bytes: 'hello',
      sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      masked: false,
    }]);

    await expect(service.getSpan('s1', 'u1')).resolves.toEqual({
      bytes: 'hello',
      sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    });
    await expect(service.audit()).resolves.toMatchObject({ ok: true, spans: 1, sessions: 1 });
    await expect(service.inspectElement('s1')).resolves.toMatchObject({ sessionId: 's1', actors: ['owner'] });
    await expect(service.search({ actor: 'owner', text: 'hell' })).resolves.toHaveLength(1);
  });
});
