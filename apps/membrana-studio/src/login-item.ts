import { app, ipcMain } from 'electron';

import { writeShellLog } from './logging/shell-log';

/**
 * «Запускать Студию при входе в Windows» (дежурство прибора, дыра №1 карты node-permanent-duty 21.11).
 *
 * Состояние читается из ОС (`app.getLoginItemSettings`), а не из своего файла: владелец мог снять
 * автозагрузку в «Диспетчере задач», и переключатель обязан это показать. Ответ на запись — тоже
 * перечитанное состояние ОС, а не эхо запроса.
 *
 * В разработке (`!app.isPackaged`) автозагрузка не ставится: она прописала бы в реестр голый
 * `electron.exe` без приложения. Переключатель тогда честно говорит «недоступно».
 */
export const LOGIN_ITEM_GET_CHANNEL = 'membrana:studio-shell:getOpenAtLogin';
export const LOGIN_ITEM_SET_CHANNEL = 'membrana:studio-shell:setOpenAtLogin';

export interface LoginItemState {
  readonly supported: boolean;
  readonly openAtLogin: boolean;
}

export function loginItemState(isPackaged: boolean, openAtLogin: boolean): LoginItemState {
  return isPackaged ? { supported: true, openAtLogin } : { supported: false, openAtLogin: false };
}

function readState(): LoginItemState {
  return loginItemState(app.isPackaged, app.getLoginItemSettings().openAtLogin);
}

export function registerLoginItemIpc(): void {
  ipcMain.handle(LOGIN_ITEM_GET_CHANNEL, () => readState());
  ipcMain.handle(LOGIN_ITEM_SET_CHANNEL, (_e, enabled: unknown) => {
    if (!app.isPackaged) return readState();
    app.setLoginItemSettings({ openAtLogin: enabled === true });
    const state = readState();
    writeShellLog('info', 'main', 'login item set', { requested: enabled === true, openAtLogin: state.openAtLogin });
    return state;
  });
}
