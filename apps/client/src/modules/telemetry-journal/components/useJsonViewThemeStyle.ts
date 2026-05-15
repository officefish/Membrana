import { useSyncExternalStore, type CSSProperties } from 'react';

const FALLBACK = {
  base: 'oklch(0.85 0.02 260)',
  muted: 'oklch(0.72 0.02 260)',
  faint: 'oklch(0.62 0.02 260)',
  primary: 'oklch(0.75 0.12 260)',
  success: 'oklch(0.78 0.14 155)',
  info: 'oklch(0.78 0.12 235)',
  warning: 'oklch(0.82 0.14 85)',
  accent: 'oklch(0.78 0.12 300)',
  surface: 'oklch(0.28 0.02 260)',
} as const;

function readComputedColor(className: string): string {
  if (typeof document === 'undefined') return '';
  const probe = document.createElement('span');
  probe.className = className;
  probe.textContent = '\u200b';
  probe.setAttribute('aria-hidden', 'true');
  Object.assign(probe.style, {
    position: 'absolute',
    left: '-9999px',
    visibility: 'hidden',
    pointerEvents: 'none',
  });
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  if (!color || color === 'rgba(0, 0, 0, 0)') return '';
  return color;
}

function readComputedBg(className: string): string {
  if (typeof document === 'undefined') return '';
  const probe = document.createElement('span');
  probe.className = className;
  probe.setAttribute('aria-hidden', 'true');
  Object.assign(probe.style, {
    position: 'absolute',
    left: '-9999px',
    visibility: 'hidden',
    pointerEvents: 'none',
    width: '1px',
    height: '1px',
  });
  document.body.appendChild(probe);
  const bg = getComputedStyle(probe).backgroundColor;
  probe.remove();
  if (!bg || bg === 'rgba(0, 0, 0, 0)') return '';
  return bg;
}

function pick(className: string, fallback: string): string {
  return readComputedColor(className) || fallback;
}

function buildJsonViewStyle(): CSSProperties {
  const base = pick('text-base-content', FALLBACK.base);
  const muted = pick('text-base-content/80', FALLBACK.muted);
  const faint = pick('text-base-content/60', FALLBACK.faint);
  const primary = pick('text-primary', FALLBACK.primary);
  const success = pick('text-success', FALLBACK.success);
  const info = pick('text-info', FALLBACK.info);
  const warning = pick('text-warning', FALLBACK.warning);
  const accent = pick('text-accent', FALLBACK.accent);
  const surface = readComputedBg('bg-base-300') || FALLBACK.surface;

  return {
    '--w-rjv-font-family':
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    '--w-rjv-color': base,
    '--w-rjv-background-color': surface,
    '--w-rjv-line-color': faint,
    '--w-rjv-arrow-color': muted,
    '--w-rjv-edit-color': base,
    '--w-rjv-info-color': muted,
    '--w-rjv-update-color': primary,
    '--w-rjv-copied-color': primary,
    '--w-rjv-copied-success-color': success,
    '--w-rjv-curlybraces-color': muted,
    '--w-rjv-colon-color': muted,
    '--w-rjv-brackets-color': muted,
    '--w-rjv-ellipsis-color': warning,
    '--w-rjv-quotes-color': primary,
    '--w-rjv-quotes-string-color': success,
    '--w-rjv-key-string': primary,
    '--w-rjv-key-number': info,
    '--w-rjv-property-color': base,
    '--w-rjv-type-string-color': success,
    '--w-rjv-type-int-color': info,
    '--w-rjv-type-float-color': info,
    '--w-rjv-type-bigint-color': info,
    '--w-rjv-type-boolean-color': warning,
    '--w-rjv-type-date-color': accent,
    '--w-rjv-type-url-color': info,
    '--w-rjv-type-null-color': faint,
    '--w-rjv-type-nan-color': warning,
    '--w-rjv-type-undefined-color': faint,
  } as CSSProperties;
}

function subscribeTheme(listener: () => void): () => void {
  const observer = new MutationObserver(() => {
    listener();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

let cachedThemeKey = '';
let cachedStyle: CSSProperties = buildJsonViewStyle();

function getJsonViewThemeStyle(): CSSProperties {
  if (typeof document === 'undefined') return cachedStyle;
  const themeKey = document.documentElement.getAttribute('data-theme') ?? '';
  if (themeKey !== cachedThemeKey) {
    cachedThemeKey = themeKey;
    cachedStyle = buildJsonViewStyle();
  }
  return cachedStyle;
}

export function useJsonViewThemeStyle(): CSSProperties {
  return useSyncExternalStore(subscribeTheme, getJsonViewThemeStyle, getJsonViewThemeStyle);
}
