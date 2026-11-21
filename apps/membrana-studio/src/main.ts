import { app, BrowserWindow, clipboard, ipcMain, Menu, session, shell } from 'electron';
import path from 'node:path';

import { READ_CLIPBOARD_TEXT_CHANNEL, clipClipboardText, editContextMenuTemplate } from './edit-context-menu';
import { registerLoggingIpc, attachWindowShellLogging } from './logging/register-ipc';
import { registerSecureStorageIpc } from './secure-storage';
import { initShellLog, writeShellLog } from './logging/shell-log';
import { createMediaLibraryFsStore } from './media-library/media-library-fs';
import { registerMediaLibraryIpc } from './media-library/register-ipc';
import { createJournalFsStore } from './journal/journal-fs';
import { registerJournalIpc } from './journal/register-ipc';
import { createTrendsTemplatesFsStore } from './trends/trends-templates-fs';
import { registerTrendsTemplatesIpc } from './trends/register-ipc';
import { STUDIO_DEV_URL, clientDistIndexPath, preloadScriptPath } from './paths';
import { registerLoginItemIpc } from './login-item';
import { createWindowRecoveryLimiter } from './window-recovery';

/** Один ограничитель на процесс: пересоздание окна не обнуляет счёт сбоев (дыра №5 карты дежурства). */
const windowRecovery = createWindowRecoveryLimiter();

/** Перезагрузить окно после сбоя отрисовщика или зависания — с ограничением частоты. */
function attachWindowRecovery(win: BrowserWindow): void {
  const recover = (cause: string): void => {
    if (win.isDestroyed()) return;
    const decision = windowRecovery.onFailure(Date.now());
    if (decision.action === 'reload') {
      writeShellLog('warn', 'main', 'window recovery: reload', { cause, attempt: decision.attempt });
      win.webContents.reload();
    } else if (decision.action === 'give-up') {
      writeShellLog('error', 'main', 'window recovery: gave up', { cause, failures: decision.failures });
    }
  };
  win.webContents.on('render-process-gone', (_event, details) => {
    // clean-exit — окно закрывается штатно, это не сбой.
    if (details.reason !== 'clean-exit') recover(`render-process-gone:${details.reason}`);
  });
  win.webContents.on('unresponsive', () => recover('unresponsive'));
}

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

  // Electron не даёт контекстного меню по умолчанию — без этого в полях ввода нет «Вставить» (20.11).
  win.webContents.on('context-menu', (_event, params) => {
    const template = editContextMenuTemplate(params);
    if (template.length > 0) Menu.buildFromTemplate(template).popup({ window: win });
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
  attachWindowRecovery(win);

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

    // SC5: версия сборки студии — renderer включает её в WS handshake (clientVersion),
    // cabinet логирует устаревшие сборки warning-ом (strict gate — DR6).
    ipcMain.handle('membrana:studio-shell:getAppVersion', () => app.getVersion());

    // Кнопка «Вставить из буфера» (окно связки): узкий канал вместо расширения прав navigator.clipboard.
    ipcMain.handle(READ_CLIPBOARD_TEXT_CHANNEL, () => clipClipboardText(clipboard.readText()));

    // b4 studio-firebat-user-pairing: канал safeStorage — провод до ADR-0028, включение позже.
    registerSecureStorageIpc();

    // Дежурство прибора: «Запускать Студию при входе в Windows» — состояние из ОС.
    registerLoginItemIpc();

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
