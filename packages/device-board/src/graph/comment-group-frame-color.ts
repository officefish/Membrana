import type { CSSProperties } from 'react';
import {
  resolveScenarioCommentGroupFrameColor,
  type ScenarioCommentGroupFrameColor,
  type ScenarioCommentGroupFrameColorPreset,
} from '@membrana/core';

/** Fallback hex для custom без rgb. */
export const COMMENT_GROUP_CUSTOM_FRAME_DEFAULT_HEX = '#7c3aed';

/** Подписи пресетов в инспекторе. */
export const COMMENT_GROUP_FRAME_COLOR_PRESET_LABELS: Record<
  ScenarioCommentGroupFrameColorPreset,
  string
> = {
  custom: 'Custom',
  neutral: 'Neutral',
  primary: 'Primary',
  secondary: 'Secondary',
  info: 'Info',
  warning: 'Warning',
  accent: 'Accent',
  error: 'Error',
};

/** DaisyUI-классы рамки по пресету (не custom). */
const PRESET_FRAME_TAILWIND: Record<
  Exclude<ScenarioCommentGroupFrameColorPreset, 'custom'>,
  {
    readonly frame: string;
    readonly ring: string;
    readonly header: string;
    readonly footer: string;
  }
> = {
  neutral: {
    frame: 'border-neutral/50 bg-neutral/5',
    ring: 'ring-neutral/40',
    header: 'bg-neutral/20 text-neutral',
    footer: 'text-neutral/80',
  },
  primary: {
    frame: 'border-primary/50 bg-primary/5',
    ring: 'ring-primary/40',
    header: 'bg-primary/20 text-primary',
    footer: 'text-primary/80',
  },
  secondary: {
    frame: 'border-secondary/50 bg-secondary/5',
    ring: 'ring-secondary/40',
    header: 'bg-secondary/20 text-secondary',
    footer: 'text-secondary/80',
  },
  info: {
    frame: 'border-info/50 bg-info/5',
    ring: 'ring-info/40',
    header: 'bg-info/20 text-info',
    footer: 'text-info/80',
  },
  warning: {
    frame: 'border-warning/50 bg-warning/5',
    ring: 'ring-warning/40',
    header: 'bg-warning/20 text-warning',
    footer: 'text-warning/80',
  },
  accent: {
    frame: 'border-accent/50 bg-accent/5',
    ring: 'ring-accent/40',
    header: 'bg-accent/20 text-accent',
    footer: 'text-accent/80',
  },
  error: {
    frame: 'border-error/50 bg-error/5',
    ring: 'ring-error/40',
    header: 'bg-error/20 text-error',
    footer: 'text-error/80',
  },
};

/** Tailwind bg-* для превью-сwatch в инспекторе. */
export const COMMENT_GROUP_FRAME_SWATCH_CLASS: Record<
  Exclude<ScenarioCommentGroupFrameColorPreset, 'custom'>,
  string
> = {
  neutral: 'bg-neutral',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  info: 'bg-info',
  warning: 'bg-warning',
  accent: 'bg-accent',
  error: 'bg-error',
};

export interface CommentGroupFrameVisual {
  readonly frameClassName: string;
  readonly frameStyle: CSSProperties | undefined;
  readonly ringClassName: string;
  readonly ringStyle: CSSProperties | undefined;
  readonly headerClassName: string;
  readonly headerStyle: CSSProperties | undefined;
  readonly footerClassName: string;
  readonly footerStyle: CSSProperties | undefined;
}

function expandShortHex(hex: string): string {
  const body = hex.slice(1);
  return `#${body[0]}${body[0]}${body[1]}${body[1]}${body[2]}${body[2]}`.toLowerCase();
}

/** Нормализует ввод #RRGGBB / #RGB / rgb(r,g,b) → #rrggbb или null. */
export function parseCommentGroupRgbInput(value: string): string | null {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return expandShortHex(trimmed);
  }
  const rgbMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+\s*)?\)$/i,
  );
  if (rgbMatch === null) {
    return null;
  }
  const parts = [rgbMatch[1], rgbMatch[2], rgbMatch[3]].map((part) => {
    const n = Number(part);
    if (!Number.isFinite(n) || n < 0 || n > 255) {
      return null;
    }
    return n.toString(16).padStart(2, '0');
  });
  if (parts.some((part) => part === null)) {
    return null;
  }
  return `#${parts.join('')}`;
}

function hexToRgbChannels(hex: string): { r: number; g: number; b: number } | null {
  const normalized = parseCommentGroupRgbInput(hex);
  if (normalized === null) {
    return null;
  }
  const body = normalized.slice(1);
  return {
    r: Number.parseInt(body.slice(0, 2), 16),
    g: Number.parseInt(body.slice(2, 4), 16),
    b: Number.parseInt(body.slice(4, 6), 16),
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const channels = hexToRgbChannels(hex);
  if (channels === null) {
    return `rgba(124, 58, 237, ${alpha})`;
  }
  return `rgba(${channels.r}, ${channels.g}, ${channels.b}, ${alpha})`;
}

/** Визуальные классы/стили рамки, хедера и футера группы. */
export function resolveCommentGroupFrameVisual(
  frameColor: Partial<ScenarioCommentGroupFrameColor> | null | undefined,
): CommentGroupFrameVisual {
  const resolved = resolveScenarioCommentGroupFrameColor(frameColor);
  if (resolved.preset === 'custom') {
    const hex = parseCommentGroupRgbInput(resolved.rgb ?? COMMENT_GROUP_CUSTOM_FRAME_DEFAULT_HEX)
      ?? COMMENT_GROUP_CUSTOM_FRAME_DEFAULT_HEX;
    return {
      frameClassName: '',
      frameStyle: {
        borderColor: hexToRgba(hex, 0.5),
        backgroundColor: hexToRgba(hex, 0.05),
      },
      ringClassName: '',
      ringStyle: { boxShadow: `0 0 0 2px ${hexToRgba(hex, 0.4)}` },
      headerClassName: 'text-base-content',
      headerStyle: {
        backgroundColor: hexToRgba(hex, 0.2),
        color: hex,
      },
      footerClassName: '',
      footerStyle: { color: hexToRgba(hex, 0.85) },
    };
  }

  const preset = PRESET_FRAME_TAILWIND[resolved.preset];
  return {
    frameClassName: preset.frame,
    frameStyle: undefined,
    ringClassName: preset.ring,
    ringStyle: undefined,
    headerClassName: preset.header,
    headerStyle: undefined,
    footerClassName: preset.footer,
    footerStyle: undefined,
  };
}

/** Hex для color input при custom preset. */
export function commentGroupCustomPickerHex(
  frameColor: Partial<ScenarioCommentGroupFrameColor> | null | undefined,
): string {
  const resolved = resolveScenarioCommentGroupFrameColor(frameColor);
  if (resolved.preset !== 'custom') {
    return COMMENT_GROUP_CUSTOM_FRAME_DEFAULT_HEX;
  }
  return (
    parseCommentGroupRgbInput(resolved.rgb ?? COMMENT_GROUP_CUSTOM_FRAME_DEFAULT_HEX)
    ?? COMMENT_GROUP_CUSTOM_FRAME_DEFAULT_HEX
  );
}
