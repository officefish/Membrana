import { writeElectronShellLog } from '@/lib/electronShellLogPort';

import type { ConnectionFailure } from './classify';
import { formatFailureJournalLine } from './reasonTexts';

/**
 * Журнал отказа соединения (#2540): одна строка на отказ, с ISO-меткой и классом.
 *
 * В Studio — в журнал оболочки (`{userData}/logs/shell-YYYY-MM-DD.log`, electron-log), чтобы
 * транзиент можно было сопоставить с логами кабинета по времени; в браузере порт — no-op, и
 * строка уходит в консоль. Текст — из той же таблицы, что и окно: двух правд нет.
 */
export function journalConnectionFailure(failure: ConnectionFailure): void {
  const line = formatFailureJournalLine(failure);
  writeElectronShellLog('warn', line);
  console.warn(line);
}
