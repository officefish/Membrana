import { useCallback, useMemo } from 'react';
import {
  getTemplateFromCatalog,
  type PatternTemplate,
} from '@membrana/trends-detector-service';

import { useUserTemplates } from './useUserTemplates';

export function useTemplateCatalog() {
  const userTemplates = useUserTemplates();

  const getTemplate = useCallback(
    (key: string): PatternTemplate | undefined =>
      getTemplateFromCatalog(key, userTemplates),
    [userTemplates],
  );

  return useMemo(
    () => ({
      userTemplates,
      getTemplate,
    }),
    [userTemplates, getTemplate],
  );
}
