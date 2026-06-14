import { describe, expect, it, beforeEach } from 'vitest';

import { createEmptyUserTemplate } from './templateEditorDefaults';
import { parseUserTemplatesPayload, serializeUserTemplatesPayload } from './userTemplatesPersistence';
import { userTemplatesStore } from './userTemplatesStore';
import { useUserTemplatesZustandStore } from './userTemplatesZustandStore';

describe('userTemplatesStore', () => {
  beforeEach(() => {
    userTemplatesStore.resetForTests();
  });

  it('upserts and returns user templates', async () => {
    const template = createEmptyUserTemplate([]);
    await useUserTemplatesZustandStore.getState().upsert(template);
    expect(userTemplatesStore.getTemplates()).toHaveLength(1);
    expect(userTemplatesStore.getTemplates()[0]?.key).toBe(template.key);
  });

  it('removes template by key', async () => {
    const template = createEmptyUserTemplate([]);
    await useUserTemplatesZustandStore.getState().upsert(template);
    await useUserTemplatesZustandStore.getState().remove(template.key);
    expect(userTemplatesStore.getTemplates()).toHaveLength(0);
  });

  it('serializes templates as versioned JSON payload', () => {
    const template = createEmptyUserTemplate([]);
    const raw = serializeUserTemplatesPayload([template]);
    const parsed = parseUserTemplatesPayload(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.key).toBe(template.key);
  });
});
