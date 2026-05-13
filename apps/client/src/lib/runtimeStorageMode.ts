/**
 * Где живут настройки приложения: в браузере (localStorage) или в оболочке Electron (файлы).
 */
export type RuntimeStorageMode = 'web-localstorage' | 'electron-system-files';

export function getRuntimeStorageMode(): RuntimeStorageMode {
  if (typeof navigator !== 'undefined' && /\bElectron\b/i.test(navigator.userAgent)) {
    return 'electron-system-files';
  }
  if (typeof window !== 'undefined') {
    const w = window as Window & { electronAPI?: unknown };
    if (w.electronAPI != null) {
      return 'electron-system-files';
    }
  }
  return 'web-localstorage';
}
