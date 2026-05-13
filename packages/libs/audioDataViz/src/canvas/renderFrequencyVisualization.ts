import { getCanvasThemeColors } from '../theme/canvasThemeColors';

export interface SyncCanvasOptions {
  minCssWidth?: number;
  minCssHeight?: number;
}

/**
 * Подгоняет bitmap canvas под CSS-размеры и DPR (как в FFTModule).
 */
export function syncCanvasToCssBox(
  canvas: HTMLCanvasElement,
  options?: SyncCanvasOptions,
): { cssWidth: number; cssHeight: number; ctx: CanvasRenderingContext2D } | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const minW = options?.minCssWidth ?? 320;
  const minH = options?.minCssHeight ?? 180;
  const cssW = Math.max(minW, Math.floor(rect.width));
  const cssH = Math.max(minH, Math.floor(rect.height));

  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { cssWidth: cssW, cssHeight: cssH, ctx };
}

/** Столбиковый спектр по полосам анализатора (как виджет FFTModule). */
export function renderFftBarsCanvas(
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  layout?: SyncCanvasOptions,
): void {
  const colors = getCanvasThemeColors();
  const pack = syncCanvasToCssBox(canvas, layout);
  if (!pack) return;
  const { cssWidth: width, cssHeight: height, ctx } = pack;

  const barWidth = width / dataArray.length;

  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < dataArray.length; i++) {
    const value = dataArray[i] ?? 0;
    const barHeight = (value / 255) * height;
    const x = i * barWidth;
    const y = height - barHeight;
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = 0.35 + (value / 255) * 0.65;
    ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
  }
  ctx.globalAlpha = 1;
}

export interface SpectrumLineOptions extends SyncCanvasOptions {
  /** Число точек по горизонтали (даунсэмпл из FFT). */
  pointCount?: number;
}

/**
 * Сглаженная кривая спектра (популярный «EQ»-вид), заливка под кривой + контур.
 */
export function renderSpectrumLineCanvas(
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  options?: SpectrumLineOptions,
): void {
  const colors = getCanvasThemeColors();
  const pointCount = options?.pointCount ?? 180;
  const pack = syncCanvasToCssBox(canvas, options);
  if (!pack) return;
  const { cssWidth: w, cssHeight: h, ctx } = pack;

  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, w, h);

  const n = Math.min(pointCount, Math.max(8, dataArray.length));
  const padX = 6;
  const padY = 8;
  const usableW = w - padX * 2;
  const usableH = h - padY * 2;

  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const srcIdx = Math.min(dataArray.length - 1, Math.floor(t * (dataArray.length - 1)));
    const v = (dataArray[srcIdx] ?? 0) / 255;
    pts.push({
      x: padX + t * usableW,
      y: padY + usableH * (1 - v * 0.94),
    });
  }

  if (pts.length === 0) return;

  ctx.beginPath();
  ctx.moveTo(padX, h - padY);
  for (const p of pts) {
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(w - padX, h - padY);
  ctx.closePath();
  ctx.fillStyle = colors.accent;
  ctx.globalAlpha = 0.18;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i]!.x, pts[i]!.y);
  }
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
}
