import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import path from 'node:path';

import { registerLoggingIpc, attachWindowShellLogging } from './logging/register-ipc';
import { initShellLog, writeShellLog } from './logging/shell-log';
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
      // SC1 (консилиум studio-capture-adaptation 2026-07-03): таймеры TTL/heartbeat
      // захвата (tariff v2) живут в renderer — свёрнутое окно не должно их троттлить,
      // иначе auto-release опоздает и студия «зависнет» в ведомости дольше TTL.
      backgroundThrottling: false,
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
    const devUrl = process.env.MEMBRANA_STUDIO_DEV_URL ?? STUDIO_DEV_URL;
    void win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    void win.loadFile(clientDistIndexPath());
  }

  attachWindowShellLogging(win);

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
    initShellLog(userData, isDev);
    registerLoggingIpc();
    writeShellLog('info', 'main', 'app ready', {
      version: app.getVersion(),
      isDev,
    });

    const mediaStore = createMediaLibraryFsStore(path.join(userData, 'media-library'));
    registerMediaLibraryIpc(mediaStore);
    const journalStore = createJournalFsStore(path.join(userData, 'journal'));
    registerJournalIpc(journalStore);
    const trendsStore = createTrendsTemplatesFsStore(userData);
    registerTrendsTemplatesIpc(trendsStore);
    configureMediaPermissions();

    // SC1: сервер захватил устройство (board.capture) — поднимаем окно в foreground,
    // чтобы оператор увидел alert и имел мгновенный доступ к emergency stop
    // (канон DEVICE_BOARD_SERVER_FIRST v2.0 §3.3; tray-стоп — ST7, GH #236).
    ipcMain.on('membrana:studio-shell:captureAcquired', () => {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) return;
      if (win.isMinimized()) win.restore();
      win.focus();
      writeShellLog('info', 'main', 'capture acquired — window focused', {});
    });

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
