/**
 * Меню правки Студии: контекстное меню по правой кнопке и канал чтения буфера для кнопки «Вставить».
 *
 * КОРЕНЬ (слово владельца 20.11, поле «Ключ доступа»): Electron НЕ даёт контекстного меню по
 * умолчанию — правая кнопка в поле ввода Студии не показывала ничего, пункта «Вставить» не было.
 * Меню собирается здесь на `webContents.on('context-menu')` только из ролей (cut/copy/paste/selectAll):
 * действия выполняет сам Chromium, своих обработчиков буфера нет.
 *
 * Кнопка «Вставить из буфера» в окне связки читает буфер через узкий канал `readClipboardText`
 * (preload → main `clipboard.readText()`), а не через `navigator.clipboard`: обработчик разрешений
 * Студии пускает только `media`, и расширять его ради одной кнопки не нужно.
 */
import type { ContextMenuParams, MenuItemConstructorOptions } from 'electron';

/** Канал чтения буфера (invoke). */
export const READ_CLIPBOARD_TEXT_CHANNEL = 'membrana:studio-shell:readClipboardText';

/** Потолок текста из буфера: ключ — десятки символов; мегабайты из буфера в окно не тащим. */
export const CLIPBOARD_TEXT_MAX_CHARS = 4096;

type EditParams = Pick<ContextMenuParams, 'isEditable' | 'selectionText' | 'editFlags'>;

/**
 * Пункты меню по месту клика. Поле ввода — вырезать/копировать/вставить/выделить всё (доступность —
 * по `editFlags` Chromium); выделенный текст вне поля — только копировать; иначе меню нет (`[]`).
 */
export function editContextMenuTemplate(params: EditParams): MenuItemConstructorOptions[] {
  const flags = params.editFlags;
  if (params.isEditable) {
    return [
      { role: 'cut', label: 'Вырезать', enabled: flags.canCut },
      { role: 'copy', label: 'Копировать', enabled: flags.canCopy },
      { role: 'paste', label: 'Вставить', enabled: flags.canPaste },
      { type: 'separator' },
      { role: 'selectAll', label: 'Выделить всё', enabled: flags.canSelectAll },
    ];
  }
  if (params.selectionText.trim().length > 0) {
    return [{ role: 'copy', label: 'Копировать', enabled: flags.canCopy }];
  }
  return [];
}

/** Текст буфера для отрисовщика — обрезан по потолку. */
export function clipClipboardText(text: string): string {
  return text.length > CLIPBOARD_TEXT_MAX_CHARS ? text.slice(0, CLIPBOARD_TEXT_MAX_CHARS) : text;
}
