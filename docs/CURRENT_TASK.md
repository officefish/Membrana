```typescript
import React from 'react';

interface QualityWidgetProps {
  qualityScore: number;
  snr: number;
  noise: number;
}

const QualityWidget: React.FC<QualityWidgetProps> = ({ qualityScore, snr, noise }) => {
  const angle = (qualityScore / 100) * 180;
  const radius = 38;
  const center = 50;
  const startX = center - radius;
  const startY = center;

  const radians = (angle * Math.PI) / 180;
  const endX = center + radius * Math.cos(radians - Math.PI / 2);
  const endY = center + radius * Math.sin(radians - Math.PI / 2);

  const getColor = () => {
    if (qualityScore < 30) return 'hsl(0, 70%, 50%)';
    if (qualityScore < 70) return 'hsl(48, 96%, 53%)';
    return 'hsl(142, 76%, 36%)';
  };

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
          Quality
        </span>
      </div>

      <div className="flex justify-center">
        <svg width="100" height="68" viewBox="0 0 100 68">
          <path
            d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
            fill="none"
            stroke="hsl(220, 18%, 20%)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1="50"
            y1="55"
            x2={endX}
            y2={endY}
            stroke="hsl(220, 15%, 35%)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ transition: '0.3s' }}
          />
          <circle
            cx="50"
            cy="55"
            r="3"
            fill={getColor()}
            style={{ transition: 'fill 0.3s' }}
          />
          <text
            x="50"
            y="43"
            textAnchor="middle"
            fontSize="10"
            fill="hsl(210, 15%, 40%)"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {qualityScore === 0 ? '--' : qualityScore}
          </text>
          <text
            x="50"
            y="52"
            textAnchor="middle"
            fontSize="5.5"
            fill="hsl(210, 15%, 45%)"
            fontFamily="monospace"
          >
            / 100
          </text>
        </svg>
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2 text-center">
        <div>
          <p className="text-xs text-base-content/50">SNR</p>
          <p className="text-sm font-mono font-bold text-base-content/80">
            {snr === 0 ? '--' : snr}
          </p>
        </div>
        <div>
          <p className="text-xs text-base-content/50">Noise</p>
          <p className="text-sm font-mono font-bold text-base-content/80">
            {noise === 0 ? '--' : noise}
          </p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(QualityWidget);
```

```typescript

import React from 'react';

interface SpectrumWidgetProps {
  spectrumData: number[];
}

const SpectrumWidget: React.FC<SpectrumWidgetProps> = ({ spectrumData }) => {
  const frequencies = [20, 80, 200, 500, '1k', '2k', '4k', '8k', '16k', '20k'];

  const getBarColor = (value: number) => {
    if (value < 0.3) return 'hsl(152, 76%, 52%)';
    if (value < 0.6) return 'hsl(34, 100%, 52%)';
    return 'hsl(0, 72%, 51%)';
  };

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
          Frequency Spectrum
        </span>
        <span className="text-xs text-base-content/40 font-mono">Hz</span>
      </div>

      <div className="bg-base-300/50 rounded-lg border border-base-300 p-3 pb-0">
        <div className="flex items-end gap-0.5 h-20">
          {spectrumData.map((value, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all duration-75"
              style={{
                height: `${Math.max(2, value * 100)}%`,
                backgroundColor: getBarColor(value),
                transition: 'height 0.08s ease-out, background-color 0.3s',
              }}
            />
          ))}
        </div>

        <div className="flex justify-between pt-1.5 pb-2">
          {frequencies.map((freq, i) => (
            <span key={i} className="text-[9px] text-base-content/40 font-mono">
              {freq}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-base-content/50">Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-xs text-base-content/50">Mid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-400" />
          <span className="text-xs text-base-content/50">High</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SpectrumWidget);
```

```typescript
import React from 'react';

interface VolumeWidgetProps {
  volume: number;
}

const VolumeWidget: React.FC<VolumeWidgetProps> = ({ volume }) => {
  const percent = Math.min(100, Math.max(0, Math.round(volume * 100)));

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
          Volume
        </span>
      </div>

      <div className="flex items-end justify-center gap-0.5 h-24">
        {Array.from({ length: 20 }).map((_, i) => {
          const barHeight = ((i + 1) * 5);
          const isActive = percent >= barHeight;
          const getColor = () => {
            if (barHeight < 30) return isActive ? 'bg-green-500' : 'bg-base-300';
            if (barHeight < 60) return isActive ? 'bg-yellow-500' : 'bg-base-300';
            return isActive ? 'bg-red-500' : 'bg-base-300';
          };

          return (
            <div
              key={i}
              className={`flex-1 rounded-sm transition-all duration-75 ${getColor()}`}
              style={{ height: `${barHeight}%` }}
            />
          );
        })}
      </div>

      <div className="mt-3 text-center">
        <span className="text-2xl font-mono font-bold text-base-content">
          {percent === 0 ? '--' : percent}
        </span>
        <span className="text-xs text-base-content/50 ml-1">%</span>
      </div>
    </div>
  );
};

export default React.memo(VolumeWidget);

```

```typescript
import React from 'react';

interface WaveformWidgetProps {
  waveformData: number[];
}

const WaveformWidget: React.FC<WaveformWidgetProps> = ({ waveformData }) => {
  const points = waveformData.map((value, index) => {
    const x = (index / waveformData.length) * 560;
    const y = 40 + value * 30;
    return `${x},${y}`;
  }).join(' L ');

  const pathData = points.length ? `M ${points}` : '';

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
          Waveform
        </span>
      </div>

      <div className="w-full overflow-hidden rounded-lg bg-base-300/50 border border-base-300">
        <svg viewBox="0 0 560 80" width="100%" height="80" preserveAspectRatio="none" className="block">
          <defs>
            <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.5" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <line x1="0" y1="40" x2="560" y2="40" stroke="hsl(220, 15%, 22%)" strokeWidth="1" strokeDasharray="4,4" />

          {pathData && (
            <path
              d={pathData}
              fill="none"
              stroke="url(#waveGrad)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          )}
        </svg>
      </div>
    </div>
  );
};

export default React.memo(WaveformWidget);
```

```typescript
import React from 'react';

interface WidgetControlsProps {
  widgetStates: {
    volume: boolean;
    quality: boolean;
    waveform: boolean;
    spectrum: boolean;
  };
  onToggle: (widget: keyof WidgetControlsProps['widgetStates']) => void;
}

const WidgetControls: React.FC<WidgetControlsProps> = ({ widgetStates, onToggle }) => {
  const widgets = [
    { id: 'volume' as const, label: 'Volume Meter', icon: '📊', color: 'text-green-500' },
    { id: 'quality' as const, label: 'Quality Meter', icon: '🎯', color: 'text-purple-500' },
    { id: 'waveform' as const, label: 'Waveform', icon: '〰️', color: 'text-cyan-400' },
    { id: 'spectrum' as const, label: 'Spectrum', icon: '📈', color: 'text-indigo-400' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {widgets.map((widget) => (
        <label
          key={widget.id}
          className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-base-300/50 transition-colors"
        >
          <input
            type="checkbox"
            checked={widgetStates[widget.id]}
            onChange={() => onToggle(widget.id)}
            className="checkbox checkbox-xs checkbox-primary"
          />
          <span className={`${widget.color}`}>{widget.icon}</span>
          <span className="text-gray-400">{widget.label}</span>
        </label>
      ))}
    </div>
  );
};

export default React.memo(WidgetControls);
```

```typescript
import { IPlugin, IPluginWidget } from '../../../types/plugins';
import PluginCard from '../../../components/ui/PluginCard';
import VolumeWidget from '../components/VolumeWidget';
import QualityWidget from '../components/QualityWidget';
import WaveformWidget from '../components/WaveformWidget';
import SpectrumWidget from '../components/SpectrumWidget';
import { useState, useEffect, useRef, useCallback } from 'react';

interface TuneMonitorState {
  rawVolume: number;
  processedVolume: number;
  volume: number;
  qualityScore: number;
  snr: number;
  noise: number;
  waveformData: number[];
  spectrumData: number[];
  isRecording: boolean;
}

const INITIAL_STATE: TuneMonitorState = {
  rawVolume: 0,
  processedVolume: 0,
  volume: 0,
  qualityScore: 0,
  snr: 0,
  noise: 0,
  waveformData: Array(200).fill(0),
  spectrumData: Array(32).fill(0),
  isRecording: false,
};

// ========== УТИЛИТЫ ДЛЯ РАСЧЁТОВ ==========

const calculateQuality = (volume: number): { qualityScore: number; snr: number; noise: number } => {
  const qualityScore = Math.min(100, Math.max(0, Math.round(volume * 100 + 20)));
  const snr = Math.min(60, Math.max(0, Math.round(volume * 50 + 10)));
  const noise = Math.min(40, Math.max(0, Math.round((1 - volume) * 40)));
  return { qualityScore, snr, noise };
};

const generateWaveform = (volume: number, length: number = 200): number[] => {
  const t = Date.now() / 1000;
  return Array.from({ length }, (_, i) => {
    return Math.sin(t * 10 + i * 0.1) * volume;
  });
};

const generateSpectrum = (volume: number, length: number = 32): number[] => {
  return Array.from({ length }, (_, i) => {
    return Math.min(1, Math.max(0, volume * (1 - i / 64) + Math.random() * 0.1));
  });
};

const smoothTransition = (current: number, target: number, factor: number = 0.3): number => {
  return current + (target - current) * factor;
};

// ========== КОМПОНЕНТ ВИДЖЕТА ==========

const TuneMonitorWidget: React.FC<{
  plugin: IPlugin;
  context?: any;
  onAction: (action: string, data?: any) => void;
  isActive: boolean;
}> = ({ plugin, context, isActive }) => {
  const [state, setState] = useState<TuneMonitorState>(INITIAL_STATE);
  const animationRef = useRef<number | null>(null);
  const lastVolumeRef = useRef<number>(0);

  const updateFromContext = useCallback(() => {
    const rawVolume = context?.rawVolume ?? 0;
    const processedVolume = context?.processedVolume ?? 0;
    const isRecording = context?.isRecording ?? false;

    const smoothedVolume = smoothTransition(lastVolumeRef.current, processedVolume, 0.3);
    lastVolumeRef.current = smoothedVolume;

    const { qualityScore, snr, noise } = calculateQuality(smoothedVolume);
    const waveformData = generateWaveform(smoothedVolume);
    const spectrumData = generateSpectrum(smoothedVolume);

    setState({
      rawVolume,
      processedVolume,
      volume: smoothedVolume,
      qualityScore,
      snr,
      noise,
      waveformData,
      spectrumData,
      isRecording,
    });
  }, [context?.rawVolume, context?.processedVolume, context?.isRecording]);

  useEffect(() => {
    if (!isActive) return;

    const animate = () => {
      updateFromContext();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, updateFromContext]);

  if (!isActive) return null;

  const {
    volume,
    qualityScore,
    snr,
    noise,
    waveformData,
    spectrumData,
    isRecording: isRec
  } = state;

  const showVolume = (plugin as any).settings?.showVolume ?? true;
  const showQuality = (plugin as any).settings?.showQuality ?? true;
  const showWaveform = (plugin as any).settings?.showWaveform ?? true;
  const showSpectrum = (plugin as any).settings?.showSpectrum ?? true;

  return (
    <PluginCard plugin={plugin} isActive={isActive}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {showVolume && <VolumeWidget volume={volume} />}
          {showQuality && <QualityWidget qualityScore={qualityScore} snr={snr} noise={noise} />}
        </div>

        {showWaveform && <WaveformWidget waveformData={waveformData} />}
        {showSpectrum && <SpectrumWidget spectrumData={spectrumData} />}

        {!isRec && (
          <div className="text-center text-xs text-base-content/40 py-2">
            ⚪ Микрофон не активен
          </div>
        )}
      </div>
    </PluginCard>
  );
};

// Виджет
const tuneMonitorWidget: IPluginWidget = {
  id: 'tune-monitor-widget',
  pluginId: 'microphone2-tune-monitor',
  title: 'Tune Monitor',
  icon: '🎵',
  position: 'bottom',
  order: 1,
  width: 'full',
  component: TuneMonitorWidget,
};

// ========== КЛАСС ПЛАГИНА ==========

class TuneMonitorPluginClass implements IPlugin {
  id = 'microphone2-tune-monitor';
  name = 'Tune Monitor';
  version = '1.0.0';
  description = 'Визуализация звука: громкость, качество, волна и спектр';
  icon = '🎵';
  moduleId = 'microphone' as const;
  enabled = false;

  availableActions = ['setWidgetState', 'getWidgetState', 'resetWidgets'];

  settings = {
    showVolume: true,
    showQuality: true,
    showWaveform: true,
    showSpectrum: true,
  };

  widget = tuneMonitorWidget;

  onActivate(): void {
    console.log('🎵 Tune Monitor Plugin activated');
  }

  onDeactivate(): void {
    console.log('🎵 Tune Monitor Plugin deactivated');
  }

  onModuleEvent(
    //event: string, data: any
  ): void {
    //console.log(`🎵 Tune Monitor event: ${event}`, data);
  }

  execute(action: string, data?: any): any {
    //console.log(`🎵 TuneMonitor execute: ${action}`, data);

    switch (action) {
      case 'setWidgetState':
        if (data) {
          Object.assign(this.settings, data);
        }
        return true;

      case 'getWidgetState':
        return { ...this.settings };

      case 'resetWidgets':
        this.settings = {
          showVolume: true,
          showQuality: true,
          showWaveform: true,
          showSpectrum: true,
        };
        return true;

      case 'processAudioFrame':
        if (data?.volume !== undefined) {
          const { qualityScore, snr, noise } = calculateQuality(data.volume);
          const waveformData = generateWaveform(data.volume);
          const spectrumData = generateSpectrum(data.volume);
          return {
            volume: data.volume,
            qualityScore,
            snr,
            noise,
            waveformData,
            spectrumData,
          };
        }
        return null;

      default:
        return null;
    }
  }
}

export const TuneMonitorPlugin = new TuneMonitorPluginClass();
```
