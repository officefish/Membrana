import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AuthApiError, mapRegisterErrorStatus } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';

const REGISTRATION_BLOCK_MS = 600_000;

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retryBlockedUntil, setRetryBlockedUntil] = useState(0);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (retryBlockedUntil === 0) return;
    const remaining = retryBlockedUntil - Date.now();
    if (remaining <= 0) {
      setRetryBlockedUntil(0);
      return;
    }
    const timer = window.setTimeout(() => setRetryBlockedUntil(0), remaining);
    return () => window.clearTimeout(timer);
  }, [retryBlockedUntil]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (mode === 'register' && retryBlockedUntil > Date.now()) return;

    const normalizedLogin = loginName.trim();
    const normalizedCode = code.trim();
    if (
      mode === 'register' &&
      (normalizedLogin.length === 0 || password.length === 0 || normalizedCode.length === 0)
    ) {
      setError('Заполните все поля.');
      return;
    }

    setError(null);
    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register(normalizedLogin, password, normalizedCode);
      } else {
        await login(loginName, password);
      }
    } catch (err) {
      if (mode === 'register') {
        const status = err instanceof AuthApiError ? err.status : undefined;
        if (status === 429) {
          setRetryBlockedUntil(Date.now() + REGISTRATION_BLOCK_MS);
        }
        setError(
          status === undefined
            ? 'Не удалось выполнить регистрацию. Попробуйте ещё раз.'
            : mapRegisterErrorStatus(status),
        );
      } else {
        setError(err instanceof Error ? err.message : 'Ошибка входа');
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode((current) => (current === 'login' ? 'register' : 'login'));
    setError(null);
  };

  const registrationBlocked = mode === 'register' && retryBlockedUntil > Date.now();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-md bg-base-200 shadow-xl">
        <div className="card-body gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-base-content">Membrana</h1>
            <p className="text-sm text-base-content/70">Личный кабинет</p>
          </div>

          <form
            className="flex flex-col gap-4"
            noValidate={mode === 'register'}
            onSubmit={(e) => void onSubmit(e)}
          >
            <label className="form-control w-full">
              <span className="label-text mb-1">Логин</span>
              <input
                type="text"
                className="input input-bordered w-full"
                autoComplete="username"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                required
                minLength={3}
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-1">Пароль</span>
              <input
                type="password"
                className="input input-bordered w-full"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            {mode === 'register' ? (
              <label className="form-control w-full">
                <span className="label-text mb-1">Код приглашения</span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={128}
                />
              </label>
            ) : null}
            {error ? (
              <p className="text-sm text-error" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="btn btn-primary mt-2"
              disabled={submitting || registrationBlocked}
              aria-busy={submitting}
            >
              {submitting
                ? mode === 'register'
                  ? 'Создаём…'
                  : 'Вход…'
                : mode === 'register'
                  ? 'Создать учётную запись'
                  : 'Войти'}
            </button>
          </form>

          <button
            type="button"
            className="btn btn-ghost btn-sm self-start"
            disabled={submitting}
            onClick={switchMode}
          >
            {mode === 'register' ? 'У меня уже есть вход' : 'Создать учётную запись'}
          </button>

          {import.meta.env.DEV ? (
            <p className="text-xs text-base-content/50">
              Dev: demo / demo12345 после <code className="text-xs">yarn cabinet:seed</code>
            </p>
          ) : (
            <p className="text-xs text-base-content/50">
              Учётная запись открывается по коду приглашения. Код выдаёт владелец.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
