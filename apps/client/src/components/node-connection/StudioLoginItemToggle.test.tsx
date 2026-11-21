/**
 * Зубы переключателя «Запускать Студию при входе в Windows» (дежурство, 21.11). Порчи: показать
 * переключатель в браузере → красный; взять состояние из запроса, а не из ответа ОС → красный
 * (Windows не приняла — а переключатель «включён»); в разработке разрешить щёлкать → красный.
 *
 * @vitest-environment jsdom
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StudioLoginItemToggle } from './StudioLoginItemToggle';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Shell = NonNullable<NonNullable<Window['electronAPI']>['studioShell']>;

function withShell(shell: Partial<Shell> | undefined) {
  (window as { electronAPI?: unknown }).electronAPI = shell ? { studioShell: { notifyCaptureAcquired: () => undefined, ...shell } } : undefined;
}

async function mount() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<StudioLoginItemToggle />));
  return { host, done: () => act(() => root.unmount()) };
}

afterEach(() => withShell(undefined));

describe('StudioLoginItemToggle', () => {
  it('браузер / старая сборка без канала — переключателя нет', async () => {
    withShell(undefined);
    const a = await mount();
    expect(a.host.innerHTML).toBe('');
    a.done();
    withShell({ getAppVersion: async () => '0.2.0' });
    const b = await mount();
    expect(b.host.innerHTML).toBe('');
    b.done();
  });

  it('состояние — из ОС; после записи показан ответ ОС, а не запрос; несогласие — role=alert', async () => {
    const setOpenAtLogin = vi.fn(async () => ({ supported: true, openAtLogin: false }));
    withShell({ getOpenAtLogin: async () => ({ supported: true, openAtLogin: false }), setOpenAtLogin });
    const { host, done } = await mount();
    const box = host.querySelector<HTMLInputElement>('[data-testid="studio-open-at-login"]')!;
    expect(box.checked).toBe(false);
    expect(box.disabled).toBe(false);
    await act(async () => box.click());
    expect(setOpenAtLogin).toHaveBeenCalledWith(true);
    expect(box.checked).toBe(false);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Windows не приняла');
    done();
  });

  it('разработка (supported=false) — переключатель выключен и неактивен, с объяснением', async () => {
    withShell({ getOpenAtLogin: async () => ({ supported: false, openAtLogin: false }), setOpenAtLogin: vi.fn() });
    const { host, done } = await mount();
    const box = host.querySelector<HTMLInputElement>('[data-testid="studio-open-at-login"]')!;
    expect(box.disabled).toBe(true);
    expect(host.textContent).toContain('Недоступно в режиме разработки');
    done();
  });
});
