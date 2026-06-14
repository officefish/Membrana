import type { IElectronMediaLibraryPort } from '@membrana/media-library-service';

declare global {
  interface Window {
    electronAPI?: {
      mediaLibrary?: IElectronMediaLibraryPort;
      trendsTemplates?: {
        read: () => Promise<string | null>;
        write: (json: string) => Promise<void>;
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
