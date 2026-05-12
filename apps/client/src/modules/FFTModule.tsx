import React, { useState, useEffect, useRef } from 'react';
import { ModuleProps, useModulePlugins } from '@membrana/agenda';

export interface FFTConfig {
  fftSize: number;
  smoothingTimeConstant: number;
  minDecibels: number;
  maxDecibels: number;
}

export const FFTModule: React.FC<ModuleProps<FFTConfig>> = ({ 
  module,
  onUpdateConfig,
  onTogglePlugin 
}) => {
  // Теперь config берем из module.config
  const config = module.config as FFTConfig;
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const animationRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { plugins, activeIds, toggle: togglePlugin } = useModulePlugins(module.id);

  const initAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyserNode = context.createAnalyser();
      
      analyserNode.fftSize = config.fftSize as 512 | 1024 | 2048 | 4096;
      analyserNode.smoothingTimeConstant = config.smoothingTimeConstant;
      analyserNode.minDecibels = config.minDecibels;
      analyserNode.maxDecibels = config.maxDecibels;
      
      source.connect(analyserNode);
      
      setAudioContext(context);
      setAnalyser(analyserNode);
      
      await context.resume();
      setIsRecording(true);
      startVisualization(analyserNode);
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Доступ к микрофону не получен');
    }
  };

  const startVisualization = (analyserNode: AnalyserNode) => {
    const draw = () => {
      if (!analyserNode || !canvasRef.current) return;
      
      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      analyserNode.getByteFrequencyData(dataArray);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / dataArray.length;
      
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, width, height);
      
      for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i];
        const barHeight = (value / 255) * height;
        const x = i * barWidth;
        const y = height - barHeight;
        
        const hue = (value / 255) * 120;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
  };

  const stopAudio = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
    setAnalyser(null);
    setIsRecording(false);
  };

  useEffect(() => {
    return () => stopAudio();
  }, []);

  useEffect(() => {
    if (analyser) {
      analyser.fftSize = config.fftSize as 512 | 1024 | 2048 | 4096;
      analyser.smoothingTimeConstant = config.smoothingTimeConstant;
      analyser.minDecibels = config.minDecibels;
      analyser.maxDecibels = config.maxDecibels;
    }
  }, [config, analyser]);

  const handleConfigUpdate = (updates: Partial<FFTConfig>) => {
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
          <label className="block text-sm font-medium mb-1">FFT Size</label>
          <select
            value={config.fftSize}
            onChange={(e) => handleConfigUpdate({ fftSize: Number(e.target.value) })}
            className="w-full p-2 border rounded"
          >
            <option value={512}>512</option>
            <option value={1024}>1024</option>
            <option value={2048}>2048</option>
            <option value={4096}>4096</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Smoothing</label>
          <input
            type="range"
            min="0"
            max="0.95"
            step="0.05"
            value={config.smoothingTimeConstant}
            onChange={(e) => handleConfigUpdate({ smoothingTimeConstant: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Min Decibels</label>
          <input
            type="range"
            min="-120"
            max="-20"
            step="5"
            value={config.minDecibels}
            onChange={(e) => handleConfigUpdate({ minDecibels: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Max Decibels</label>
          <input
            type="range"
            min="-80"
            max="0"
            step="5"
            value={config.maxDecibels}
            onChange={(e) => handleConfigUpdate({ maxDecibels: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>
      
      {plugins.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h3 className="text-sm font-medium mb-2">Плагины:</h3>
          <div className="flex gap-2">
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
          Частота дискретизации: {audioContext?.sampleRate} Hz | Размер FFT: {config.fftSize}
        </div>
      )}
    </div>
  );
};