import { useEffect, useState, type RefObject } from 'react';

export function useCanvasContainerSize(
  containerRef: RefObject<HTMLElement | null>,
  fallbackWidth: number,
): number {
  const [width, setWidth] = useState(fallbackWidth);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = (): void => {
      const next = Math.floor(el.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return width;
}
