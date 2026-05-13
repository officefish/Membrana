```typescript
// index.ts
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useModulePlugins } from '../../hooks/useModulePlugins';
import { MicrophoneService } from './services/MicrophoneService';
import DeviceSelector from './components/DeviceSelector';
import { MicrophoneState } from './types';
import { IPluginContext } from '../../types/plugins';
import ModuleHeader from '../../components/ui/ModuleHeader';

const MODULE_ID = 'microphone';

const INITIAL_STATE: MicrophoneState = {
  isRecording: false,
  rawVolume: 0,
  processedVolume: 0,
  error: null,
  audioDevices: [],
  selectedDeviceId: '',
  recordingDuration: 0,
};

const Microphone: React.FC = () => {
  const [state, setState] = useState<MicrophoneState>(INITIAL_STATE);

  const serviceRef = useRef<MicrophoneService | null>(null);
  const isInitializedRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ✅ Функция для получения потока из сервиса
  const getStream = useCallback(() => {
    return serviceRef.current?.getStream() || null;
  }, []);

  // Передаём только сырые данные
  const pluginContext: IPluginContext = {
    moduleId: MODULE_ID as any,
    moduleState: state,
    dispatch: (action: string, payload?: any) => {
      console.log(`[Microphone2] Dispatch ${action}`, payload);
      switch (action) {
        case 'startMonitoring':
          handleStartMonitoring();
          break;
        case 'stopMonitoring':
          handleStopMonitoring();
          break;
        case 'changeDevice':
          if (payload?.deviceId) handleDeviceChange(payload.deviceId);
          break;
      }
    },
    getData: () => stateRef.current,
    setData: (data: any) => {
      setState(prev => ({ ...prev, ...data }));
    },

    // Только сырые данные от микрофона
    rawVolume: state.rawVolume,
    processedVolume: state.processedVolume,
    isRecording: state.isRecording,

    // ✅ Добавляем функцию для получения потока
    getStream,
  };

  const {
    activePlugins,
    widgets,
    emitEvent,
    executeOnPlugins,
  } = useModulePlugins<MicrophoneState>({
    moduleId: MODULE_ID as any,
    getInitialState: () => INITIAL_STATE,
  });

  const getService = useCallback(() => {
    if (!serviceRef.current) {
      const service = new MicrophoneService((volume) => {
        const results = executeOnPlugins('processAudioFrame', { volume });
        if (results.length > 0 && results[0] !== null && typeof results[0] === 'number') {
          return results[0];
        }
        return volume;
      });

      service.on('onVolumeUpdate', (rawVolume, processedVolume) => {
        setState(prev => ({ ...prev, rawVolume, processedVolume }));
        emitEvent('volumeUpdate', { rawVolume, processedVolume });
      });

      service.on('onRecordingStart', () => {
        setState(prev => ({ ...prev, isRecording: true, error: null }));
        emitEvent('recordingStarted');

        // ✅ Отправляем событие с потоком для плагинов
        const stream = service.getStream();
        if (stream) {
          emitEvent('streamAvailable', { stream });
        }
      });

      service.on('onRecordingStop', (duration) => {
        setState(prev => ({ ...prev, isRecording: false, recordingDuration: duration }));
        emitEvent('recordingStopped', { duration });
      });

      service.on('onDurationUpdate', (duration) => {
        setState(prev => ({ ...prev, recordingDuration: duration }));
      });

      service.on('onError', (error) => {
        setState(prev => ({ ...prev, error }));
      });

      service.on('onDevicesUpdate', (devices) => {
        setState(prev => ({ ...prev, audioDevices: devices }));
      });

      service.on('onDeviceChange', (deviceId) => {
        setState(prev => ({ ...prev, selectedDeviceId: deviceId }));
      });

      serviceRef.current = service;
    }
    return serviceRef.current;
  }, [emitEvent, executeOnPlugins]);

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const service = getService();
    service.getAudioDevices().then(devices => {
      if (devices.length > 0) {
        setState(prev => ({
          ...prev,
          audioDevices: devices,
          selectedDeviceId: devices[0].deviceId
        }));
      }
    });

    return () => {
      if (serviceRef.current) {
        serviceRef.current.dispose();
        serviceRef.current = null;
      }
    };
  }, [getService]);

  const handleStartMonitoring = useCallback(async () => {
    const service = getService();
    if (!service) return;
    await service.startRecording(state.selectedDeviceId || undefined);
  }, [state.selectedDeviceId, getService]);

  const handleStopMonitoring = useCallback(() => {
    const service = getService();
    if (!service) return;
    service.stopRecording();
  }, [getService]);

  const handleDeviceChange = useCallback(async (deviceId: string) => {
    const service = getService();
    if (!service) return;
    setState(prev => ({ ...prev, selectedDeviceId: deviceId }));
    await service.changeDevice(deviceId);
  }, [getService]);

  const { isRecording, audioDevices, selectedDeviceId, error } = state;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(220,20%,8%)] to-[hsl(220,20%,10%)] p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-5">

        <ModuleHeader
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.247 7.761a6 6 0 0 1 0 8.478" />
              <path d="M19.075 4.933a10 10 0 0 1 0 14.134" />
              <path d="M4.925 19.067a10 10 0 0 1 0-14.134" />
              <path d="M7.753 16.239a6 6 0 0 1 0-8.478" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          }
          title="Microphone"
          description="Real-time microphone switching & audio quality analysis"
        />

        {error && (
          <div className="rounded-xl bg-red-500/15 border border-red-500/30 p-3 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <DeviceSelector
          devices={audioDevices}
          selectedDeviceId={selectedDeviceId}
          onDeviceChange={handleDeviceChange}
          onStartMonitoring={handleStartMonitoring}
          onStopMonitoring={handleStopMonitoring}
          isRecording={isRecording}
        />

        {activePlugins.length > 0 && (
          <div className="space-y-4">
            {widgets.map((widget) => {
              const plugin = activePlugins.find(p => p.id === widget.pluginId);
              if (!plugin) return null;
              return (
                <div key={widget.id}>
                  <widget.component
                    plugin={plugin}
                    context={pluginContext}
                    onAction={(action, data) => plugin.execute?.(action, data, pluginContext)}
                    isActive={plugin.enabled}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Microphone;
```

```typescript
//componens/DeviceSelector.tsx

import React, { useState, useRef, useEffect } from 'react';

interface DeviceSelectorProps {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
  onStartMonitoring: () => void;
  onStopMonitoring: () => void;
  isRecording: boolean;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  selectedDeviceId,
  onDeviceChange,
  onStartMonitoring,
  onStopMonitoring,
  isRecording,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`
      rounded-2xl border p-6 transition-all duration-500
      ${isRecording
        ? 'bg-gradient-to-br bg-gradient-to-b from-emerald-800 to-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/30'
        : 'border-gray-700'
      }
    `}>
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Input Device
        </label>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`
              w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
              ${isRecording
                ? 'bg-gray-900 border-2 border-emerald-700'
                : 'bg-gray-900 border border-gray-700 hover:border-emerald-700'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                w-2.5 h-2.5 rounded-full transition-all duration-300
                ${isRecording
                  ? 'bg-green-500 animate-pulse'
                  : 'bg-indigo-500'
                }
              `} />
              <span className="text-sm font-medium text-gray-200 truncate max-w-[280px]">
                {selectedDevice?.label || (devices.length === 0 ? 'Загрузка устройств...' : 'Выберите устройство')}
              </span>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {isOpen && devices.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-gray-900 border border-gray-700 shadow-xl z-50 max-h-60 overflow-y-auto">
              {devices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => {
                    onDeviceChange(device.deviceId);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150
                    ${selectedDeviceId === device.deviceId
                      ? 'bg-indigo-500/10 text-indigo-400'
                      : 'text-gray-300 hover:bg-gray-800'
                    }
                  `}
                >
                  <div className={`
                    w-2 h-2 rounded-full
                    ${selectedDeviceId === device.deviceId ? 'bg-indigo-500' : 'bg-gray-600'}
                  `} />
                  <span className="text-sm truncate">
                    {device.label || `Микрофон ${device.deviceId.slice(0, 8)}...`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isRecording ? (
        <button
          onClick={onStartMonitoring}
          disabled={devices.length === 0}
          className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-300 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="M12 19v3" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <rect x="9" y="2" width="6" height="13" rx="3" />
          </svg>
          Start Monitoring
        </button>
      ) : (
        <button
          onClick={onStopMonitoring}
          className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-300 bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="M12 19v3" />
            <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
            <path d="M16.95 16.95A7 7 0 0 1 5 12v-2" />
            <path d="M18.89 13.23A7 7 0 0 0 19 12v-2" />
            <path d="m2 2 20 20" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
          </svg>
          Stop Monitoring
        </button>
      )}
    </div>
  );
};

export default React.memo(DeviceSelector);
```
