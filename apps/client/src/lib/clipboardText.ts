/**
 * Чтение буфера обмена для кнопки «Вставить из буфера» (окно связки, слово владельца 20.11).
 *
 * Студия — узкий канал оболочки `studioShell.readClipboardText` (main `clipboard.readText()`): обработчик
 * разрешений Студии пускает только `media`, `navigator.clipboard` там отклоняется. Браузер —
 * `navigator.clipboard.readText()`; отказ (нет прав, не HTTPS, нет API) → `ClipboardReadError` с фразой
 * для человека, без технических имён.
 */

export const CLIPBOARD_DENIED_MESSAGE = 'Не удалось прочитать буфер обмена — вставьте ключ сочетанием Ctrl+V.';

export class ClipboardReadError extends Error {
  constructor(message = CLIPBOARD_DENIED_MESSAGE) {
    super(message);
    this.name = 'ClipboardReadError';
  }
}

export async function readClipboardText(): Promise<string> {
  if (typeof window === 'undefined') throw new ClipboardReadError();
  const shellRead = window.electronAPI?.studioShell?.readClipboardText;
  try {
    if (shellRead) return await shellRead();
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) return await navigator.clipboard.readText();
  } catch {
    throw new ClipboardReadError();
  }
  throw new ClipboardReadError();
}

/**
 * Ключ доступа — base64url без пробелов (кабинет, `access-key.util.ts`): пробелы, табуляции и переводы
 * строк, прилипшие при копировании из письма или блокнота, вырезаются целиком, не только по краям.
 */
export function normalizeAccessKey(raw: string): string {
  return raw.replace(/\s+/gu, '');
}
