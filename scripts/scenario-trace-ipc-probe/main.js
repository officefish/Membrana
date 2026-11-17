/**
 * Главный процесс прибора. Повторяет приёмную сторону продуктового пути СБРОСА трейса:
 * канал `membrana:logging:flushScenarioTrace` слушается через `ipcMain.on` (как в
 * apps/membrana-studio/src/logging/register-ipc.ts:37), а обработчик делает то же, что
 * `writeScenarioTraceLatest` (apps/membrana-studio/src/logging/scenario-trace-fs.ts):
 * ДВА `writeFileSync` (latest + архив по runId), полный пересчёт строк и запись в shell-log.
 *
 * `handlerMode` разделяет цену: `noop` — только транспорт (структурное клонирование через
 * границу процессов), `single` — одна запись вместо двух, `full` — ровно продуктовое поведение.
 * `setBusy` держит очередь событий главного процесса занятой: у живой Студии сосед не праздный
 * (приём media + опрос узла), и `sendSync` ждёт именно очередь, а не запись.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('no-sandbox');

const LOGS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'membrana-trace-ipc-probe-'));

/** Копия writeScenarioTraceLatest; расхождение с оригиналом видно в diff одного файла. */
function writeScenarioTraceLatest(logsDir, text, runId) {
  fs.mkdirSync(logsDir, { recursive: true });
  const normalized = text.endsWith('\n') ? text : `${text}\n`;
  fs.writeFileSync(path.join(logsDir, 'device-board-trace-latest.txt'), normalized, 'utf8');
  if (runId) {
    fs.writeFileSync(path.join(logsDir, `device-board-trace-${runId}.txt`), normalized, 'utf8');
  }
  const lineCount = normalized.split('\n').filter((line) => line.length > 0).length;
  fs.appendFileSync(path.join(logsDir, 'shell.log'), `scenario trace flushed (${lineCount} lines)\n`, 'utf8');
}

let busyTimer = null;
function setBusy(blockMs, periodMs) {
  if (busyTimer !== null) {
    clearInterval(busyTimer);
    busyTimer = null;
  }
  if (blockMs <= 0) return;
  busyTimer = setInterval(() => {
    const until = Date.now() + blockMs;
    while (Date.now() < until) {
      /* занятый сосед: синхронная работа главного процесса */
    }
  }, periodMs);
}

let handlerMode = 'full';

ipcMain.on('membrana:logging:flushScenarioTrace', (event, text, runId) => {
  if (typeof text !== 'string' || text.length === 0) {
    event.returnValue = undefined;
    return;
  }
  if (handlerMode === 'noop') {
    event.returnValue = undefined;
    return;
  }
  const id = handlerMode === 'single' ? null : (typeof runId === 'string' && runId.length > 0 ? runId : null);
  writeScenarioTraceLatest(LOGS_DIR, text, id);
  event.returnValue = undefined;
});

ipcMain.handle('probe:setMode', (_event, mode) => {
  handlerMode = mode;
  return true;
});
ipcMain.handle('probe:setBusy', (_event, blockMs, periodMs) => {
  setBusy(blockMs, periodMs);
  return true;
});
ipcMain.handle('probe:report', (_event, rows) => {
  process.stdout.write(`###PROBE-RESULT###${JSON.stringify(rows)}\n`);
  setBusy(0, 0);
  setTimeout(() => app.exit(0), 50);
  return true;
});
ipcMain.handle('probe:fail', (_event, message) => {
  process.stdout.write(`###PROBE-ERROR###${String(message)}\n`);
  setTimeout(() => app.exit(1), 50);
  return true;
});

app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });
  void win.loadFile(path.join(__dirname, 'index.html'));
});
