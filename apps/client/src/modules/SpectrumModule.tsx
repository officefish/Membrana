import React, { useState, useEffect, useRef } from 'react';
import { ModuleProps } from '@membrana/agenda';

export interface SpectrumConfig {
  colormap: string;
  showGrid: boolean;
  persistence: number;
}

export const SpectrumModule: React.FC<ModuleProps<SpectrumConfig>> = ({ 
  module,
  onUpdateConfig,
  onTogglePlugin 
}) => {
  // Теперь config берем из module.config
  const config = module.config as SpectrumConfig;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spectrumData, setSpectrumData] = useState<number[][]>([]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const randomData = Array(100).fill(0).map(() => Math.random() * 255);
      setSpectrumData(prev => {
        const newDataArray = [randomData, ...prev.slice(0, 99)];
        return newDataArray;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (!canvasRef.current || spectrumData.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const pixelWidth = width / (spectrumData[0]?.length || 1);
    const pixelHeight = height / spectrumData.length;
    
    for (let y = 0; y < spectrumData.length; y++) {
      for (let x = 0; x < spectrumData[y].length; x++) {
        const value = spectrumData[y][x];
        
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
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 0.5;
      
      // Горизонтальные линии
      for (let y = 0; y < 4; y++) {
        const yPos = (y / 4) * height;
        ctx.beginPath();
        ctx.moveTo(0, yPos);
        ctx.lineTo(width, yPos);
        ctx.stroke();
      }
      
      // Вертикальные линии
      for (let x = 0; x < 8; x++) {
        const xPos = (x / 8) * width;
        ctx.beginPath();
        ctx.moveTo(xPos, 0);
        ctx.lineTo(xPos, height);
        ctx.stroke();
      }
    }
  }, [spectrumData, config.colormap, config.showGrid]);
  
  const handleConfigUpdate = (updates: Partial<SpectrumConfig>) => {
    onUpdateConfig(updates);
  };
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">{module.name}</h2>
          <p className="text-sm text-gray-600">{module.description}</p>
        </div>
        <div className="text-xs text-gray-400">
          Состояние: {module.enabled ? 'Активен' : 'Неактивен'}
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="w-full border rounded bg-gray-900"
        style={{ height: '400px' }}
      />
      
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Colormap</label>
          <select
            value={config.colormap}
            onChange={(e) => handleConfigUpdate({ colormap: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="viridis">Viridis</option>
            <option value="plasma">Plasma</option>
            <option value="inferno">Inferno</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Настройки</label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.showGrid}
              onChange={(e) => handleConfigUpdate({ showGrid: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Показывать сетку</span>
          </label>
        </div>
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">
          Persistence: {config.persistence}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={config.persistence}
          onChange={(e) => handleConfigUpdate({ persistence: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>
      
      <div className="mt-4 text-xs text-gray-400">
        Всего точек: {spectrumData.length} | Размер буфера: {spectrumData[0]?.length || 0}
      </div>
    </div>
  );
};