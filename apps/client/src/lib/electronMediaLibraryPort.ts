import type { IElectronMediaLibraryPort } from '@membrana/media-library-service';
import type { IElectronJournalStoragePort } from '@membrana/telemetry-journal-service';

/** Автозагрузка Студии при входе в Windows: `supported=false` — разработка или старая сборка. */
export interface StudioLoginItemState {
  supported: boolean;
  openAtLogin: boolean;
}

declare global {
  interface Window {
    electronAPI?: {
      mediaLibrary?: IElectronMediaLibraryPort;
      journal?: IElectronJournalStoragePort;
      trendsTemplates?: {
        read: () => Promise<string | null>;
        write: (json: string) => Promise<void>;
      };
      shellLog?: {
        write: (
          level: 'debug' | 'info' | 'warn' | 'error',
          process: string,
          message: string,
        ) => Promise<void>;
        getLogsDir: () => Promise<string>;
        flushScenarioTrace: (text: string, runId: string | null) => void;
      };
      /** SC1/SC5 (studio-capture-adaptation): focus при захвате; версия сборки. */
      studioShell?: {
        notifyCaptureAcquired: () => void;
        getAppVersion?: () => Promise<string>;
        /** Текст буфера обмена (кнопка «Вставить из буфера», 20.11); старый preload — поля нет. */
        readClipboardText?: () => Promise<string>;
        /** «Запускать Студию при входе в Windows» — состояние ОС (дежурство, 21.11); старый preload — полей нет. */
        getOpenAtLogin?: () => Promise<StudioLoginItemState>;
        setOpenAtLogin?: (enabled: boolean) => Promise<StudioLoginItemState>;
      };
    };
  }
}

/** Desktop preload port when running inside Electron shell. */
export function getElectronMediaLibraryPort(): IElectronMediaLibraryPort | null {
  if (typeof window === 'undefined') return null;
  const port = window.electronAPI?.mediaLibrary;
  if (!port) return null;
  return port;
}

export function isElectronMediaLibraryAvailable(): boolean {
  return getElectronMediaLibraryPort() != null;
}
