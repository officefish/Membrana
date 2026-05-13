import { useEffect } from 'react';
import { invalidateCanvasThemeColorCache } from '../theme/canvasThemeColors';

/** Сброс кэша цветов canvas при смене атрибута `data-theme` у корня документа. */
export function useInvalidateCanvasThemeOnDataTheme(): void {
  useEffect(() => {
    const root = document.documentElement;
    const obs = new MutationObserver(() => invalidateCanvasThemeColorCache());
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
}
