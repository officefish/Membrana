/**
 * Цвета активной DaisyUI-темы для 2D canvas.
 * Читает CSS-переменные и разрешает их в rgb/rgba через временный элемент —
 * сырые значения вида oklch(...) из getPropertyValue плохо подходят для fillStyle.
 * Результат кэшируется по data-theme до следующей смены темы.
 */
export interface CanvasThemeColors {
  bg: string;
  surface: string;
  grid: string;
  accent: string;
  accentContent: string;
  text: string;
  textMuted: string;
  danger: string;
  success: string;
}

let cache: CanvasThemeColors | null = null;
let cacheKey: string | null = null;

function getProbe(root: HTMLElement): HTMLSpanElement {
  let el = root.querySelector<HTMLSpanElement>('[data-membrana-theme-probe]');
  if (!el) {
    el = document.createElement('span');
    el.setAttribute('data-membrana-theme-probe', '');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText =
      'position:absolute;left:0;top:0;width:1px;height:1px;margin:0;padding:0;border:0;opacity:0;pointer-events:none;overflow:hidden;clip:rect(0,0,0,0);';
    root.appendChild(el);
  }
  return el;
}

function resolveVar(
  root: HTMLElement,
  varName: string,
  fallback: string,
  as: 'color' | 'background-color',
): string {
  const probe = getProbe(root);
  probe.style.color = '';
  probe.style.backgroundColor = '';
  if (as === 'color') {
    probe.style.color = `var(${varName}, ${fallback})`;
  } else {
    probe.style.backgroundColor = `var(${varName}, ${fallback})`;
  }
  const cs = getComputedStyle(probe);
  const raw = as === 'color' ? cs.color : cs.backgroundColor;
  if (!raw || raw === 'rgba(0, 0, 0, 0)') {
    return fallback;
  }
  return raw;
}

function computeColors(root: HTMLElement): CanvasThemeColors {
  return {
    bg: resolveVar(root, '--b3', '#111827', 'background-color'),
    surface: resolveVar(root, '--b2', '#1f2937', 'background-color'),
    grid: resolveVar(root, '--bc', '#9ca3af', 'color'),
    accent: resolveVar(root, '--p', '#7c3aed', 'color'),
    accentContent: resolveVar(root, '--pc', '#f9fafb', 'color'),
    text: resolveVar(root, '--bc', '#f9fafb', 'color'),
    textMuted: resolveVar(root, '--bc', '#9ca3af', 'color'),
    danger: resolveVar(root, '--er', '#ef4444', 'color'),
    success: resolveVar(root, '--su', '#22c55e', 'color'),
  };
}

/** Сброс кэша (например, после программной смены темы вне data-theme). */
export function invalidateCanvasThemeColorCache(): void {
  cache = null;
  cacheKey = null;
}

export function getCanvasThemeColors(
  root: HTMLElement = document.documentElement,
): CanvasThemeColors {
  const key = root.getAttribute('data-theme') ?? '';
  if (cache && cacheKey === key) {
    return cache;
  }
  cache = computeColors(root);
  cacheKey = key;
  return cache;
}
