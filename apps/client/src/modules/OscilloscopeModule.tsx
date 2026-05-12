import React, { useState, useEffect, useRef } from 'react';
import { ModuleProps, useModulePlugins } from '@membrana/agenda';

export interface OscilloscopeConfig {
  timeScale: number;
  amplitudeScale: number;
  showGrid: boolean;
  triggerMode: 'auto' | 'normal' | 'single';
  colorScheme: 'classic' | 'neon' | 'monochrome';
}

const defaultConfig: OscilloscopeConfig = {
  timeScale: 1,
  amplitudeScale: 1,
  showGrid: true,
  triggerMode: 'auto',
  colorScheme: 'classic'
};

export const OscilloscopeModule: React.FC<ModuleProps<OscilloscopeConfig>> = ({ 
  module,
  onUpdateConfig,
  onTogglePlugin 
}) => {
  const config = module.config as OscilloscopeConfig;
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);
  const animationRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const { plugins, activeIds, toggle: togglePlugin } = useModulePlugins(module.id);

  const initAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(2048, 1, 1);
      
      source.connect(processor);
      processor.connect(context.destination);
      
      sourceRef.current = source;
      setAudioContext(context);
      
      let samples: number[] = [];
      let lastTriggerTime = 0;
      
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        samples = [...samples, ...Array.from(inputData)];
        
        // Ограничиваем буфер
        const maxSamples = Math.floor(1024 / config.timeScale);
        if (samples.length > maxSamples) {
          samples = samples.slice(-maxSamples);
        }
        
        // Отрисовка осциллографа
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          const width = canvas.width;
          const height = canvas.height;
          const centerY = height / 2;
          
          // Очистка
          ctx.fillStyle = config.colorScheme === 'monochrome' ? '#000' : '#1a1a2e';
          ctx.fillRect(0, 0, width, height);
          
          // Сетка
          if (config.showGrid) {
            ctx.strokeStyle = config.colorScheme === 'monochrome' ? '#333' : 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 0.5;
            
            // Горизонтальные линии
            for (let i = -3; i <= 3; i++) {
              const y = centerY + (i * height / 8);
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(width, y);
              ctx.stroke();
            }
            
            // Вертикальные линии
            for (let i = 0; i <= 8; i++) {
              const x = (i / 8) * width;
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, height);
              ctx.stroke();
            }
            
            // Центральная линия
            ctx.strokeStyle = config.colorScheme === 'monochrome' ? '#666' : 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            ctx.lineTo(width, centerY);
            ctx.stroke();
          }
          
          // Отрисовка сигнала
          const step = width / samples.length;
          
          // Выбор цвета
          let lineColor: string;
          switch (config.colorScheme) {
            case 'neon':
              lineColor = '#0f0';
              break;
            case 'monochrome':
              lineColor = '#0f0f0f';
              break;
            default:
              lineColor = '#00ff99';
          }
          
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          
          // Поиск триггера
          let triggerIndex = -1;
          if (config.triggerMode === 'auto' || config.triggerMode === 'normal') {
            for (let i = 1; i < samples.length; i++) {
              const currentTime = Date.now();
              if (samples[i] > 0.1 && samples[i - 1] <= 0.1 && 
                  (currentTime - lastTriggerTime > 200 || config.triggerMode === 'normal')) {
                triggerIndex = i;
                lastTriggerTime = currentTime;
                setIsTriggered(true);
                break;
              }
            }
          }
          
          // Рисуем сигнал
          const startIndex = triggerIndex !== -1 ? triggerIndex : 0;
          let x = 0;
          for (let i = startIndex; i < samples.length; i++) {
            const y = centerY - (samples[i] * height / 2 * config.amplitudeScale);
            const currentX = x * step * config.timeScale;
            
            if (i === startIndex) {
              ctx.moveTo(currentX, y);
            } else {
              ctx.lineTo(currentX, y);
            }
            x++;
            
            if (currentX > width) break;
          }
          
          ctx.stroke();
          
          // Отображение триггера
          if (isTriggered && config.triggerMode !== 'auto') {
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(10, 10, 8, 8);
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.fillText('TRIGGERED', 25, 18);
          }
          
          // Отображение уровня сигнала
          const rms = Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length);
          ctx.fillStyle = '#fff';
          ctx.font = '10px monospace';
          ctx.fillText(`RMS: ${(rms * 100).toFixed(1)}%`, 10, height - 10);
        }
      };
      
      await context.resume();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Доступ к микрофону не получен');
    }
  };

  const stopAudio = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    setIsRecording(false);
    setIsTriggered(false);
  };

  useEffect(() => {
    return () => stopAudio();
  }, []);

  const handleConfigUpdate = (updates: Partial<OscilloscopeConfig>) => {
    onUpdateConfig(updates);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">{module.name}</h2>
          <p className="text-sm text-gray-600">{module.description}</p>
        </div>
        <button
          onClick={isRecording ? stopAudio : initAudio}
          className={`px-4 py-2 rounded text-white transition-colors ${
            isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isRecording ? 'Остановить' : 'Запустить'}
        </button>
      </div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={300}
        className="w-full border rounded bg-gray-900"
        style={{ height: '300px' }}
      />
      
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Time Scale: {config.timeScale.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={config.timeScale}
            onChange={(e) => handleConfigUpdate({ timeScale: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Amplitude: {config.amplitudeScale.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.05"
            value={config.amplitudeScale}
            onChange={(e) => handleConfigUpdate({ amplitudeScale: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Trigger Mode</label>
          <select
            value={config.triggerMode}
            onChange={(e) => handleConfigUpdate({ triggerMode: e.target.value as any })}
            className="w-full p-2 border rounded"
          >
            <option value="auto">Auto</option>
            <option value="normal">Normal</option>
            <option value="single">Single</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Color Scheme</label>
          <select
            value={config.colorScheme}
            onChange={(e) => handleConfigUpdate({ colorScheme: e.target.value as any })}
            className="w-full p-2 border rounded"
          >
            <option value="classic">Classic (Green)</option>
            <option value="neon">Neon (Bright)</option>
            <option value="monochrome">Monochrome</option>
          </select>
        </div>
        
        <div className="col-span-2">
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
      
      {plugins.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h3 className="text-sm font-medium mb-2">Плагины:</h3>
          <div className="flex gap-2 flex-wrap">
            {plugins.map(plugin => (
              <button
                key={plugin.id}
                onClick={() => togglePlugin(plugin.id)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeIds.includes(plugin.id)
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {plugin.name}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {isRecording && (
        <div className="mt-4 text-sm text-gray-500">
          Частота: {audioContext?.sampleRate} Hz | Статус: {isTriggered ? 'Triggered' : 'Waiting'}
        </div>
      )}
    </div>
  );
};