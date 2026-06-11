import { useEffect } from 'react';

import { useUserTemplatesZustandStore } from './userTemplatesZustandStore';

export function useUserTemplates() {
  const templates = useUserTemplatesZustandStore((s) => s.templates);
  const hydrate = useUserTemplatesZustandStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return templates;
}
