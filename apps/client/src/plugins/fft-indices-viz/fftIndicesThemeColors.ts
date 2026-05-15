/** Цвета метрик: центроид → error, поток → info, громкость → success. */

export type FftIndicesMetricTheme = 'error' | 'info' | 'success';

export const FFT_INDICES_METRIC_THEME = {
  centroid: 'error',
  flux: 'info',
  rms: 'success',
} as const satisfies Record<'centroid' | 'flux' | 'rms', FftIndicesMetricTheme>;

export interface FftIndicesDrawPalette {
  readonly error: string;
  readonly info: string;
  readonly success: string;
}

const FALLBACK: FftIndicesDrawPalette = {
  error: 'oklch(0.63 0.24 25)',
  info: 'oklch(0.68 0.15 235)',
  success: 'oklch(0.72 0.19 155)',
};

let cachedThemeKey = '';
let cachedPalette: FftIndicesDrawPalette = FALLBACK;

function readBgClass(className: string): string {
  const probe = document.createElement('span');
  probe.className = className;
  probe.setAttribute('aria-hidden', 'true');
  Object.assign(probe.style, {
    position: 'absolute',
    visibility: 'hidden',
    pointerEvents: 'none',
    width: '1px',
    height: '1px',
  });
  document.body.appendChild(probe);
  const bg = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : '';
}

function withAlpha(rgb: string, alpha: number): string {
  const m = rgb.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (!m) return rgb;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
}

/** Читает актуальные цвета темы (кэш сбрасывается при смене data-theme). */
export function getFftIndicesDrawPalette(): FftIndicesDrawPalette {
  if (typeof document === 'undefined') return FALLBACK;
  const themeKey = document.documentElement.getAttribute('data-theme') ?? '';
  if (themeKey === cachedThemeKey && cachedPalette !== FALLBACK) {
    return cachedPalette;
  }

  const error = readBgClass('bg-error') || FALLBACK.error;
  const info = readBgClass('bg-info') || FALLBACK.info;
  const success = readBgClass('bg-success') || FALLBACK.success;

  cachedThemeKey = themeKey;
  cachedPalette = { error, info, success };
  return cachedPalette;
}

export function colorForMetric(
  palette: FftIndicesDrawPalette,
  kind: keyof typeof FFT_INDICES_METRIC_THEME,
): string {
  return palette[FFT_INDICES_METRIC_THEME[kind]];
}

export function withPaletteAlpha(color: string, alpha: number): string {
  return withAlpha(color, alpha);
}
