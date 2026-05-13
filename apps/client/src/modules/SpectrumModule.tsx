import React, { useEffect, useRef, useState } from 'react';
import { ModuleProps, useTheme } from '@membrana/agenda';
import { getCanvasThemeColors } from '../utils/themeCanvasColors';

export interface SpectrumConfig {
  colormap: string;
  showGrid: boolean;
  persistence: number;
}

export const SpectrumModule: React.FC<ModuleProps<SpectrumConfig>> = ({ module, onUpdateConfig }) => {
  const config = module.config as SpectrumConfig;
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spectrumData, setSpectrumData] = useState<number[][]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomData = Array(100)
        .fill(0)
        .map(() => Math.random() * 255);
      setSpectrumData((prev) => {
        const next = [randomData, ...prev.slice(0, 99)];
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || spectrumData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = getCanvasThemeColors();
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(320, Math.floor(rect.width));
    const cssH = Math.max(240, Math.floor(rect.height));
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = cssW;
    const height = cssH;
    const pixelWidth = width / (spectrumData[0]?.length || 1);
    const pixelHeight = height / spectrumData.length;

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < spectrumData.length; y++) {
      const row = spectrumData[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        const value = row[x] ?? 0;

        let color: string;
        if (config.colormap === 'viridis') {
          color = `rgb(${value * 0.5}, ${value * 0.8}, ${value * 0.3})`;
        } else if (config.colormap === 'plasma') {
          color = `rgb(${value}, ${value * 0.5}, ${255 - value})`;
        } else {
          color = `rgb(${value * 0.2}, ${value * 0.5}, ${value})`;
        }

        ctx.fillStyle = color;
        ctx.fillRect(x * pixelWidth, y * pixelHeight, pixelWidth, pixelHeight);
      }
    }

    if (config.showGrid) {
      ctx.strokeStyle = colors.grid;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 0.5;

      for (let y = 0; y < 4; y++) {
        const yPos = (y / 4) * height;
        ctx.beginPath();
        ctx.moveTo(0, yPos);
        ctx.lineTo(width, yPos);
        ctx.stroke();
      }

      for (let x = 0; x < 8; x++) {
        const xPos = (x / 8) * width;
        ctx.beginPath();
        ctx.moveTo(xPos, 0);
        ctx.lineTo(xPos, height);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }, [spectrumData, config.colormap, config.showGrid, theme]);

  const handleConfigUpdate = (updates: Partial<SpectrumConfig>) => {
    onUpdateConfig(updates);
  };

  return (
    <div className="card bg-base-100 border border-base-200 shadow-sm rounded-box w-full">
      <div className="card-body p-4 md:p-6 gap-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="card-title text-lg text-base-content">{module.name}</h2>
          <p className="text-sm text-base-content/60">{module.description}</p>
        </div>
        <div className="badge badge-outline text-base-content/80 tabular-nums">
          {module.enabled ? 'Активен' : 'Неактивен'}
        </div>
      </div>

      <div className="rounded-box border border-base-300 overflow-hidden bg-base-300/30 min-h-[320px]">
        <canvas ref={canvasRef} className="w-full h-[320px] block" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label" htmlFor={`${module.id}-cmap`}>
            <span className="label-text">Colormap</span>
          </label>
          <select
            id={`${module.id}-cmap`}
            value={config.colormap}
            onChange={(e) => handleConfigUpdate({ colormap: e.target.value })}
            className="select select-bordered select-sm w-full"
          >
            <option value="viridis">Viridis</option>
            <option value="plasma">Plasma</option>
            <option value="inferno">Inferno</option>
          </select>
        </div>

        <div className="form-control">
          <span className="label-text">Настройки</span>
          <label className="label cursor-pointer justify-start gap-3 py-1">
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              checked={config.showGrid}
              onChange={(e) => handleConfigUpdate({ showGrid: e.target.checked })}
            />
            <span className="label-text">Показывать сетку</span>
          </label>
        </div>
      </div>

      <div className="form-control">
        <label className="label" htmlFor={`${module.id}-persist`}>
          <span className="label-text tabular-nums">Persistence: {config.persistence}</span>
        </label>
        <input
          id={`${module.id}-persist`}
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={config.persistence}
          onChange={(e) => handleConfigUpdate({ persistence: parseFloat(e.target.value) })}
          className="range range-primary range-sm w-full"
        />
      </div>

      <p className="text-xs text-base-content/50 tabular-nums">
        Кадров: {spectrumData.length} · ширина буфера: {spectrumData[0]?.length ?? 0}
      </p>
      </div>
    </div>
  );
};
