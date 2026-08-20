/**
 * Зубы провода secureStorage (b4 studio-firebat-user-pairing): путь файла — один и в
 * userData; словарь каналов закрыт (available/get/set/del); чтение при недоступном
 * шифровании — «пусто», не крах. Electron в зубах не поднимается — модульная поверхность.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { getPath: () => 'C:/fake/userData' },
  ipcMain: { handle: vi.fn() },
  safeStorage: { isEncryptionAvailable: () => { throw new Error('no display'); } },
}));

const { SECURE_STORE_FILE, isSecureStorageAvailable, registerSecureStorageIpc, secureStorePath } = await import('./secure-storage');
const { ipcMain } = await import('electron');

describe('secure-storage', () => {
  it('файл шифртекста — один, в userData, имя из константы', () => {
    expect(secureStorePath('C:/u').endsWith(SECURE_STORE_FILE)).toBe(true);
    expect(secureStorePath('C:/u').replaceAll('\\', '/')).toContain('C:/u');
  });

  it('safeStorage бросает (нет дисплея/DPAPI) → доступность false, не исключение', () => {
    expect(isSecureStorageAvailable()).toBe(false);
  });

  it('словарь каналов закрыт: ровно available·get·set·del под membrana:secure-storage', () => {
    registerSecureStorageIpc();
    const channels = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string).sort();
    expect(channels).toEqual([
      'membrana:secure-storage:available',
      'membrana:secure-storage:del',
      'membrana:secure-storage:get',
      'membrana:secure-storage:set',
    ]);
  });
});
