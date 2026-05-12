/**
 * Читает цвета активной DaisyUI-темы для 2D canvas (fillStyle / strokeStyle).
 * Значения приходят из getComputedStyle — поддерживают смену data-theme.
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

const pick = (style: CSSStyleDeclaration, name: string, fallback: string) => {
  const v = style.getPropertyValue(name).trim();
  return v || fallback;
};

export function getCanvasThemeColors(
  root: HTMLElement = document.documentElement
): CanvasThemeColors {
  const s = getComputedStyle(root);
  return {
    bg: pick(s, '--b3', '#111827'),
    surface: pick(s, '--b2', '#1f2937'),
    grid: pick(s, '--bc', '#9ca3af'),
    accent: pick(s, '--p', '#7c3aed'),
    accentContent: pick(s, '--pc', '#f9fafb'),
    text: pick(s, '--bc', '#f9fafb'),
    textMuted: pick(s, '--bc', '#9ca3af'),
    danger: pick(s, '--er', '#ef4444'),
    success: pick(s, '--su', '#22c55e'),
  };
}
