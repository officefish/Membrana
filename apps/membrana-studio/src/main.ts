import { app, BrowserWindow, session, shell } from 'electron';
import path from 'node:path';

import { createMediaLibraryFsStore } from './media-library/media-library-fs';
import { registerMediaLibraryIpc } from './media-library/register-ipc';
import { createJournalFsStore } from './journal/journal-fs';
import { registerJournalIpc } from './journal/register-ipc';
import { createTrendsTemplatesFsStore } from './trends/trends-templates-fs';
import { registerTrendsTemplatesIpc } from './trends/register-ipc';
import { STUDIO_DEV_URL, clientDistIndexPath, preloadScriptPath } from './paths';

/** Canonical field data root — `%APPDATA%/Membrana/` (MS2–MS3). */
app.setPath('userData', path.join(app.getPath('appData'), 'Membrana'));

const isDev = process.env.MEMBRANA_STUDIO_DEV === '1';
function configureMediaPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media');
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media');
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Membrana Studio',
    show: false,
    webPreferences: {
      preload: preloadScriptPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    void win.loadURL(STUDIO_DEV_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    void win.loadFile(clientDistIndexPath());
  }

  return win;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const existing = BrowserWindow.getAllWindows()[0];
    if (existing) {
      if (existing.isMinimized()) existing.restore();
      existing.focus();
    }
  });

  app.whenReady().then(() => {
    const userData = app.getPath('userData');
    const mediaStore = createMediaLibraryFsStore(path.join(userData, 'media-library'));
    registerMediaLibraryIpc(mediaStore);
    const journalStore = createJournalFsStore(path.join(userData, 'journal'));
    registerJournalIpc(journalStore);
    const trendsStore = createTrendsTemplatesFsStore(userData);
    registerTrendsTemplatesIpc(trendsStore);
    configureMediaPermissions();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

// DevTools / Vite HMR on Windows
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
