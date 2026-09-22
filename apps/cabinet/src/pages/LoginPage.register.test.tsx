import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthApiError } from '../api/auth';
import { LoginPage } from './LoginPage';

const login = vi.fn();
const register = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login, register }),
}));

function openRegistration(): HTMLButtonElement {
  fireEvent.click(screen.getByRole('button', { name: 'Создать учётную запись' }));
  return screen.getByRole('button', { name: 'Создать учётную запись' });
}

function fillRegistration(): void {
  fireEvent.change(screen.getByLabelText('Логин'), { target: { value: '  owner  ' } });
  fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: ' secret123 ' } });
  fireEvent.change(screen.getByLabelText('Код приглашения'), {
    target: { value: '  invite-code  ' },
  });
}

beforeEach(() => {
  login.mockReset();
  register.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('LoginPage — регистрация по коду', () => {
  it('не отправляет пустые после trim поля', async () => {
    render(<LoginPage />);
    const submit = openRegistration();

    fireEvent.change(screen.getByLabelText('Логин'), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText('Код приглашения'), { target: { value: '   ' } });
    fireEvent.click(submit);

    expect((await screen.findByRole('alert')).textContent).toBe('Заполните все поля.');
    expect(register).not.toHaveBeenCalled();
  });

  it('блокирует кнопку и повторную отправку, пока запрос выполняется', () => {
    register.mockReturnValue(new Promise<void>(() => undefined));
    render(<LoginPage />);
    const submit = openRegistration();
    fillRegistration();
    const form = submit.closest('form');
    if (!form) throw new Error('registration form not found');

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(submit.disabled).toBe(true);
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('owner', ' secret123 ', 'invite-code');
  });

  it('показывает одну фразу для любого отказа 403', async () => {
    register.mockRejectedValue(new AuthApiError(403, 'Registration was not accepted'));
    render(<LoginPage />);
    const submit = openRegistration();
    fillRegistration();
    fireEvent.click(submit);

    expect((await screen.findByRole('alert')).textContent).toBe('Регистрация не принята.');
  });

  it('после 429 блокирует новую попытку на 600 секунд', async () => {
    vi.useFakeTimers();
    register.mockRejectedValue(
      new AuthApiError(429, 'Слишком много попыток. Подождите 10 минут.'),
    );
    render(<LoginPage />);
    const submit = openRegistration();
    fillRegistration();

    await act(async () => {
      fireEvent.click(submit);
      await Promise.resolve();
    });
    expect(screen.getByRole('alert').textContent).toBe(
      'Слишком много попыток. Подождите 10 минут.',
    );
    expect(submit.disabled).toBe(true);

    act(() => {
      vi.advanceTimersByTime(599_999);
    });
    expect(submit.disabled).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(submit.disabled).toBe(false);
  });
});
