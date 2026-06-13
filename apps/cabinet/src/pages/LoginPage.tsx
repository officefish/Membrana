import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(loginName, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-md bg-base-200 shadow-xl">
        <div className="card-body gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-base-content">Membrana</h1>
            <p className="text-sm text-base-content/70">Личный кабинет</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            {error ? (
              <p className="text-sm text-error" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="btn btn-primary mt-2"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? 'Вход…' : 'Войти'}
            </button>
          </form>

          <p className="text-xs text-base-content/50">
            Dev: demo / demo12345 после <code className="text-xs">yarn cabinet:seed</code>
          </p>
        </div>
      </div>
    </div>
  );
}
