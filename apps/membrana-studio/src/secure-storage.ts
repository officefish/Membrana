/**
 * Провод secureStorage Studio (b4 studio-firebat-user-pairing; форма — Веснин,
 * клиентский порт — b2). Канал IPC к electron.safeStorage СТРОИТСЯ, но включение
 * шифрования — за ADR-0028 (@stage ADR-0028): нет миграции существующих ключей и
 * политики ротации mediaToken. Мост объявляет `available` честно по факту платформы;
 * клиентский адаптер (pairing-credentials-store) до ADR-0028 мост не зовёт.
 *
 * Словарь — как у порта b2: get/set/del поверх одного ключа-хранилища; шифртекст
 * лежит файлом в userData, ключом владеет ОС (DPAPI на Windows узла).
 */
import { app, ipcMain, safeStorage } from 'electron';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

const SS = 'membrana:secure-storage';

/** Имя файла шифртекста в userData — одно, по классу PAIRING_STORAGE_KEY клиента. */
export const SECURE_STORE_FILE = 'pairing-credentials.enc';

export function secureStorePath(userDataDir: string): string {
  return join(userDataDir, SECURE_STORE_FILE);
}

/** Доступность честная: платформа умеет шифровать, а не «мост существует». */
export function isSecureStorageAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

/** Регистрация каналов — зовётся из main при старте приложения. */
export function registerSecureStorageIpc(): void {
  ipcMain.handle(`${SS}:available`, () => isSecureStorageAvailable());

  ipcMain.handle(`${SS}:get`, async (): Promise<string | null> => {
    if (!isSecureStorageAvailable()) return null;
    try {
      const blob = await fs.readFile(secureStorePath(app.getPath('userData')));
      return safeStorage.decryptString(blob);
    } catch {
      return null; // нет файла или расшифровка не удалась — для клиента это «пусто», не крах
    }
  });

  ipcMain.handle(`${SS}:set`, async (_e, raw: unknown): Promise<boolean> => {
    if (typeof raw !== 'string' || !isSecureStorageAvailable()) return false;
    const blob = safeStorage.encryptString(raw);
    await fs.writeFile(secureStorePath(app.getPath('userData')), blob);
    return true;
  });

  ipcMain.handle(`${SS}:del`, async (): Promise<void> => {
    await fs.rm(secureStorePath(app.getPath('userData')), { force: true });
  });
}
