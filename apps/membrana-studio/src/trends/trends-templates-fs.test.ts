import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TrendsTemplatesFsStore } from './trends-templates-fs';

describe('TrendsTemplatesFsStore', () => {
  let tmpDir: string;
  let store: TrendsTemplatesFsStore;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'membrana-trends-'));
    store = new TrendsTemplatesFsStore(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns null before first write', async () => {
    expect(await store.read()).toBeNull();
  });

  it('round-trips JSON on disk', async () => {
    const payload = '{"version":1,"templates":[]}';
    await store.write(payload);

    const store2 = new TrendsTemplatesFsStore(tmpDir);
    expect(await store2.read()).toBe(payload);

    const raw = await readFile(path.join(tmpDir, 'trends-templates.json'), 'utf8');
    expect(raw).toBe(payload);
  });
});
