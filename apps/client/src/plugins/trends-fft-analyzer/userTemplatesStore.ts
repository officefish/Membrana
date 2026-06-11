import type { PatternTemplate } from '@membrana/trends-detector-service';

import { resetUserTemplatesPersistenceForTests } from './userTemplatesPersistence';
import { useUserTemplatesZustandStore } from './userTemplatesZustandStore';

/** Инициализация zustand-store шаблонов (вызывать при старте клиента). */
export function initUserTemplatesStore(): Promise<void> {
  return useUserTemplatesZustandStore.getState().hydrate();
}

/**
 * Фасад для плагинов и sync-подписчиков.
 * Источник истины — zustand store с JSON-persist (FS / сервер / localStorage).
 */
export const userTemplatesStore = {
  getTemplates: (): readonly PatternTemplate[] =>
    useUserTemplatesZustandStore.getState().templates,

  subscribe: (listener: () => void): (() => void) =>
    useUserTemplatesZustandStore.subscribe((state, prev) => {
      if (state.templates !== prev.templates) {
        listener();
      }
    }),

  upsert: (template: PatternTemplate): void => {
    void useUserTemplatesZustandStore.getState().upsert(template);
  },

  remove: (key: string): void => {
    void useUserTemplatesZustandStore.getState().remove(key);
  },

  resetForTests: (): void => {
    resetUserTemplatesPersistenceForTests();
    useUserTemplatesZustandStore.getState().resetForTests();
  },
};
