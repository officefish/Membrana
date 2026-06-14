import { useMembranaStore } from '@membrana/agenda';
import type { MediaLibraryCaptureFormat, MediaLibraryRecordingMode } from '@membrana/media-library-service';

import {
  MIC_BUFFER_RECORDER_PLUGIN_ID,
  defaultMicBufferRecorderConfig,
  resolveMicBufferRecorderConfig,
  type MicBufferRecorderPluginConfig,
} from './types';
import { formatCaptureLabel } from './recordingUtils';

interface Props {
  readonly moduleId: string;
}

export function MicBufferRecorderSidebarSettings({ moduleId }: Props) {
  const rawConfig = useMembranaStore((s) =>
    s.getPlugin(moduleId, MIC_BUFFER_RECORDER_PLUGIN_ID)?.config,
  );
  const updatePluginConfig = useMembranaStore((s) => s.updatePluginConfig);
  const config = resolveMicBufferRecorderConfig(rawConfig ?? defaultMicBufferRecorderConfig);

  const patch = (updates: Partial<MicBufferRecorderPluginConfig>): void => {
    updatePluginConfig<MicBufferRecorderPluginConfig>(
      moduleId,
      MIC_BUFFER_RECORDER_PLUGIN_ID,
      updates,
    );
  };

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-base-content/60 text-xs leading-snug">
        Запись клипов с микрофона в буфер библиотеки. Захват потока — в модуле «Микрофон».
      </p>
      <label className="form-control w-full">
        <span className="label-text text-xs">Режим по умолчанию</span>
        <select
          className="select select-bordered select-xs"
          value={config.defaultMode}
          onChange={(e) => patch({ defaultMode: e.target.value as MediaLibraryRecordingMode })}
        >
          <option value="manual">Ручной</option>
          <option value="auto">Авто</option>
        </select>
      </label>
      <label className="form-control w-full">
        <span className="label-text text-xs">Формат по умолчанию</span>
        <select
          className="select select-bordered select-xs"
          value={config.defaultFormat}
          onChange={(e) => patch({ defaultFormat: e.target.value as MediaLibraryCaptureFormat })}
        >
          <option value="wav">{formatCaptureLabel('wav')}</option>
          <option value="webm">{formatCaptureLabel('webm')}</option>
          <option value="mp4">{formatCaptureLabel('mp4')}</option>
        </select>
      </label>
    </div>
  );
}
