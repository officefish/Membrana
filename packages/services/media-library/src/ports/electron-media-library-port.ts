import type { IStorageBackend } from './storage-backend.js';

/** Desktop shell IPC port — implemented by Electron preload (`electronAPI.mediaLibrary`). */
export type IElectronMediaLibraryPort = IStorageBackend;
