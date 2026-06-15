import type { PatternTemplate } from '@membrana/trends-detector-service';
import { create } from 'zustand';

import {
  getActiveUserTemplatesBackend,
  loadUserTemplatesFromStorage,
  saveUserTemplatesToStorage,
  type UserTemplatesStorageBackend,
} from './userTemplatesPersistence';

interface UserTemplatesZustandState {
  readonly templates: PatternTemplate[];
  readonly hydrated: boolean;
  readonly storageBackend: UserTemplatesStorageBackend;
  hydrate: () => Promise<void>;
  upsert: (template: PatternTemplate) => Promise<void>;
  remove: (key: string) => Promise<void>;
  resetForTests: () => void;
}

let hydratePromise: Promise<void> | null = null;

export const useUserTemplatesZustandStore = create<UserTemplatesZustandState>((set, get) => ({
  templates: [],
  hydrated: false,
  storageBackend: 'local-storage',

  hydrate: async () => {
    if (get().hydrated) return;
    if (hydratePromise) {
      await hydratePromise;
      return;
    }

    hydratePromise = (async () => {
      const { templates, backend } = await loadUserTemplatesFromStorage();
      set({ templates: [...templates], hydrated: true, storageBackend: backend });
    })();

    try {
      await hydratePromise;
    } finally {
      hydratePromise = null;
    }
  },

  upsert: async (template) => {
    await get().hydrate();
    const current = get().templates;
    const index = current.findIndex((t) => t.key === template.key);
    const next =
      index >= 0
        ? [...current.slice(0, index), template, ...current.slice(index + 1)]
        : [...current, template];
    const backend = await saveUserTemplatesToStorage(next);
    set({ templates: next, storageBackend: backend });
  },

  remove: async (key) => {
    await get().hydrate();
    const next = get().templates.filter((t) => t.key !== key);
    const backend = await saveUserTemplatesToStorage(next);
    set({ templates: next, storageBackend: backend });
  },

  resetForTests: () => {
    set({ templates: [], hydrated: true, storageBackend: 'local-storage' });
  },
}));

export function getUserTemplatesStorageBackendLabel(
  backend: UserTemplatesStorageBackend = getActiveUserTemplatesBackend(),
): string {
  switch (backend) {
    case 'electron-fs':
      return 'файловая система (Electron)';
    case 'remote-server':
      return 'сервер (кэш в localStorage)';
    default:
      return 'localStorage браузера';
  }
}
