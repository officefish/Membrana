import { describe, expect, it, beforeEach } from 'vitest';

import { createEmptyUserTemplate } from './templateEditorDefaults';
import { userTemplatesStore } from './userTemplatesStore';

describe('userTemplatesStore', () => {
  beforeEach(() => {
    userTemplatesStore.resetForTests();
  });

  it('upserts and returns user templates', () => {
    const template = createEmptyUserTemplate([]);
    userTemplatesStore.upsert(template);
    expect(userTemplatesStore.getTemplates()).toHaveLength(1);
    expect(userTemplatesStore.getTemplates()[0]?.key).toBe(template.key);
  });

  it('removes template by key', () => {
    const template = createEmptyUserTemplate([]);
    userTemplatesStore.upsert(template);
    userTemplatesStore.remove(template.key);
    expect(userTemplatesStore.getTemplates()).toHaveLength(0);
  });
});
