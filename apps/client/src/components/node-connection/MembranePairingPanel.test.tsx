/**
 * Зубы окна связки (слово владельца 20.11: в поле «Ключ доступа» не вставлялся ключ).
 * Красные на стволе f01523fd: `lib/clipboardText` нет — import падает; кнопки «Вставить» в поле нет;
 * ключ уходил в кабинет как набран — с пробелами и переводами строк из буфера.
 *
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CLIPBOARD_DENIED_MESSAGE, ClipboardReadError, normalizeAccessKey, readClipboardText } from '../../lib/clipboardText';
import { useNodeConnectionStore } from '../../stores/nodeConnectionStore';
import { MembranePairingPanel } from './MembranePairingPanel';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  container?.remove();
  container = null;
  delete (window as { electronAPI?: unknown }).electronAPI;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mount() {
  useNodeConnectionStore.setState({ showPairingPanel: true });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(<MembranePairingPanel />));
  return container;
}

async function clickPaste(el: HTMLElement) {
  const button = el.querySelector('[data-paste-access-key]') as HTMLButtonElement;
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {
    await Promise.resolve();
  });
}

const keyInput = (el: HTMLElement) => el.querySelector('input.font-mono') as HTMLInputElement;

describe('normalizeAccessKey / readClipboardText', () => {
  it('пробелы, табуляции и переводы строк вырезаются целиком', () => {
    expect(normalizeAccessKey('  abc_DEF-123\r\n')).toBe('abc_DEF-123');
    expect(normalizeAccessKey('abc\n def\tghi')).toBe('abcdefghi');
    expect(normalizeAccessKey(' \n ')).toBe('');
  });

  it('Студия: канал оболочки важнее navigator.clipboard; браузер без API или с отказом → ClipboardReadError', async () => {
    const shell = vi.fn(async () => 'from-shell');
    const nav = vi.fn(async () => 'from-nav');
    vi.stubGlobal('navigator', { clipboard: { readText: nav } });
    (window as { electronAPI?: unknown }).electronAPI = { studioShell: { notifyCaptureAcquired: () => undefined, readClipboardText: shell } };
    expect(await readClipboardText()).toBe('from-shell');
    expect(nav).not.toHaveBeenCalled();

    delete (window as { electronAPI?: unknown }).electronAPI;
    expect(await readClipboardText()).toBe('from-nav');

    vi.stubGlobal('navigator', { clipboard: { readText: async () => Promise.reject(new DOMException('denied', 'NotAllowedError')) } });
    await expect(readClipboardText()).rejects.toBeInstanceOf(ClipboardReadError);
    vi.stubGlobal('navigator', {});
    await expect(readClipboardText()).rejects.toThrow(CLIPBOARD_DENIED_MESSAGE);
  });
});

describe('MembranePairingPanel — кнопка «Вставить» в поле ключа', () => {
  it('кнопка внутри поля, подписана для чтения с экрана; клик → ключ из буфера без пробелов', async () => {
    (window as { electronAPI?: unknown }).electronAPI = { studioShell: { notifyCaptureAcquired: () => undefined, readClipboardText: async () => '  key-ABC_123\r\n' } };
    const el = await mount();
    const button = el.querySelector('[data-paste-access-key]')!;
    expect(button.getAttribute('aria-label')).toBe('Вставить ключ из буфера обмена');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.parentElement!.contains(keyInput(el))).toBe(true);
    await clickPaste(el);
    expect(keyInput(el).value).toBe('key-ABC_123');
  });

  it('отказ буфера → понятная фраза в окне, поле не тронуто; пустой буфер — своя фраза', async () => {
    vi.stubGlobal('navigator', { clipboard: { readText: async () => Promise.reject(new Error('denied')) } });
    const el = await mount();
    await clickPaste(el);
    expect(el.textContent).toContain(CLIPBOARD_DENIED_MESSAGE);
    expect(keyInput(el).value).toBe('');

    vi.stubGlobal('navigator', { clipboard: { readText: async () => ' \n' } });
    await clickPaste(el);
    expect(el.textContent).toContain('Буфер обмена пуст');
  });

  it('«Подключить» шлёт ключ без пробелов и переводов строк', async () => {
    const fetchSpy = vi.fn(async () => ({ ok: false, status: 401, statusText: 'x', text: async () => 'bad', json: async () => ({ message: 'bad' }) }));
    vi.stubGlobal('fetch', fetchSpy);
    const el = await mount();
    const input = keyInput(el);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, ' key-XYZ\n');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const form = el.querySelector('form.flex') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const init = (fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(String(init.body))).toMatchObject({ accessKey: 'key-XYZ' });
  });
});
