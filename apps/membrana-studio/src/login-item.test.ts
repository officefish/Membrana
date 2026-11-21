/**
 * Зубы «Запускать Студию при входе в Windows» (дыра №1 карты дежурства 21.11). Красные на стволе
 * d6752fea: модуля нет, в `main.ts` нет `setLoginItemSettings`. Порчи: отдавать «поддерживается»
 * в разработке → красный (в реестр ушёл бы голый electron.exe); каналы preload и main разошлись →
 * красный; ответ на запись — эхо запроса вместо перечитанного состояния ОС → красный.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ app: {}, ipcMain: { handle: vi.fn() } }));
vi.mock('./logging/shell-log', () => ({ writeShellLog: vi.fn() }));

const { LOGIN_ITEM_GET_CHANNEL, LOGIN_ITEM_SET_CHANNEL, loginItemState } = await import('./login-item');

const HERE = dirname(fileURLToPath(import.meta.url));
const src = (f: string) => readFileSync(join(HERE, f), 'utf8');

describe('автозапуск Студии при входе', () => {
  it('собранная Студия — состояние ОС как есть; разработка — «недоступно» и выключено', () => {
    expect(loginItemState(true, true)).toEqual({ supported: true, openAtLogin: true });
    expect(loginItemState(true, false)).toEqual({ supported: true, openAtLogin: false });
    expect(loginItemState(false, true)).toEqual({ supported: false, openAtLogin: false });
  });

  it('каналы preload совпадают с каналами main', () => {
    const preload = src('preload.ts');
    expect(preload).toContain(`'${LOGIN_ITEM_GET_CHANNEL}'`);
    expect(preload).toContain(`'${LOGIN_ITEM_SET_CHANNEL}'`);
  });

  it('запись — через setLoginItemSettings, ответ — перечитанное состояние ОС; main регистрирует каналы', () => {
    const mod = src('login-item.ts');
    expect(mod).toMatch(/app\.setLoginItemSettings\(\{ openAtLogin: enabled === true \}\);\s*const state = readState\(\);/u);
    expect(mod).toMatch(/app\.getLoginItemSettings\(\)\.openAtLogin/u);
    expect(src('main.ts')).toMatch(/registerLoginItemIpc\(\);/u);
  });
});
