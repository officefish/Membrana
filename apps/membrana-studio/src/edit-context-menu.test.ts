/**
 * Зубы меню правки Студии (20.11, поле «Ключ доступа» не давало вставить ключ мышью).
 * Красные на стволе f01523fd: модуля нет, `main.ts` не вешает `context-menu`, в preload нет канала буфера.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CLIPBOARD_TEXT_MAX_CHARS, READ_CLIPBOARD_TEXT_CHANNEL, clipClipboardText, editContextMenuTemplate } from './edit-context-menu';

const HERE = dirname(fileURLToPath(import.meta.url));
const ALL = { canUndo: true, canRedo: true, canCut: true, canCopy: true, canPaste: true, canDelete: true, canSelectAll: true, canEditRichly: false };

describe('контекстное меню правки', () => {
  it('поле ввода → вырезать/копировать/вставить/выделить всё ролями Chromium (своих обработчиков нет)', () => {
    const items = editContextMenuTemplate({ isEditable: true, selectionText: '', editFlags: ALL });
    expect(items.map((i) => i.role ?? i.type)).toEqual(['cut', 'copy', 'paste', 'separator', 'selectAll']);
    expect(items.find((i) => i.role === 'paste')).toMatchObject({ label: 'Вставить', enabled: true });
    expect(items.every((i) => i.click === undefined)).toBe(true);
  });

  it('доступность — по editFlags: пустой буфер → «Вставить» неактивно', () => {
    const items = editContextMenuTemplate({ isEditable: true, selectionText: '', editFlags: { ...ALL, canPaste: false } });
    expect(items.find((i) => i.role === 'paste')!.enabled).toBe(false);
  });

  it('выделение вне поля → только «Копировать»; пустое место → меню нет', () => {
    expect(editContextMenuTemplate({ isEditable: false, selectionText: 'текст', editFlags: ALL }).map((i) => i.role)).toEqual(['copy']);
    expect(editContextMenuTemplate({ isEditable: false, selectionText: '  ', editFlags: ALL })).toEqual([]);
  });

  it('буфер для кнопки обрезан потолком', () => {
    expect(clipClipboardText('key')).toBe('key');
    expect(clipClipboardText('x'.repeat(CLIPBOARD_TEXT_MAX_CHARS + 10))).toHaveLength(CLIPBOARD_TEXT_MAX_CHARS);
  });

  it('провод: main вешает context-menu и канал буфера; preload выставляет readClipboardText тем же каналом; права не расширены', () => {
    const main = readFileSync(join(HERE, 'main.ts'), 'utf8');
    expect(main).toMatch(/webContents\.on\('context-menu'/);
    expect(main).toMatch(/editContextMenuTemplate\(params\)/);
    expect(main).toMatch(/ipcMain\.handle\(READ_CLIPBOARD_TEXT_CHANNEL/);
    expect(main).toMatch(/callback\(permission === 'media'\)/);
    expect(main).toMatch(/setPermissionCheckHandler\(\(_wc, permission\) => permission === 'media'\)/);
    const preload = readFileSync(join(HERE, 'preload.ts'), 'utf8');
    expect(preload).toContain(`readClipboardText: () => invoke<string>('${READ_CLIPBOARD_TEXT_CHANNEL}')`);
  });
});
