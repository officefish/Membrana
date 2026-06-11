import { useSyncExternalStore } from 'react';

import { userTemplatesStore } from './userTemplatesStore';

export function useUserTemplates() {
  return useSyncExternalStore(
    userTemplatesStore.subscribe,
    userTemplatesStore.getTemplates,
    userTemplatesStore.getTemplates,
  );
}
