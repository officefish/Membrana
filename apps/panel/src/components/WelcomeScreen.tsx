import { useState, type FormEvent } from 'react';

import { usePanelAuth } from '@/context/PanelAuthContext';
import { githubLoginHref } from '@/lib/authApi';
import { PANEL_SECTIONS } from '@/lib/sections';
import { SectionCard } from './SectionCard';

/**
 * Welcome-окно (OP3, @PanelPublic-зона): видно всем без входа. Язык —
 * человеческий, по ALLY_PRIMER; один акцент на экран (DESIGN.md) — заголовок;
 * вход вторичен. Состояния error/загрузки — с первого коммита.
 */
export function WelcomeScreen() {
  const { error, loginWithInvite } = usePanelAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    try {
      await loginWithInvite(code.trim());
    } catch {
      /* текст ошибки уже в контексте */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-semibold text-primary">Membrana — панель</h1>
        <p className="mx-auto mt-3 max-w-xl text-base-content/70">
          Membrana — сеть недорогих «ушей», которая по звуку замечает малые дроны в нижнем
          небе. Это окно — рабочая витрина проекта: здесь видно, как система себя чувствует.
        </p>
      </header>

      <section aria-label="Разделы панели" className="grid gap-3 sm:grid-cols-2">
        {PANEL_SECTIONS.map((s) => (
          <SectionCard key={s.id} section={s} role="public" />
        ))}
      </section>

      <section aria-label="Вход" className="card mx-auto w-full max-w-md bg-base-200">
        <div className="card-body gap-4 p-6">
          <h2 className="card-title text-lg">Вход</h2>

          <form onSubmit={onSubmit} className="flex flex-col gap-2">
            <label className="label p-0" htmlFor="invite-code">
              <span className="label-text">Код приглашения (для союзников)</span>
            </label>
            <div className="join w-full">
              <input
                id="invite-code"
                className="input input-bordered join-item w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                placeholder="вставьте код"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
              />
              <button
                type="submit"
                className="btn btn-primary join-item"
                disabled={!code.trim() || submitting}
                aria-label="Войти по коду приглашения"
              >
                {submitting ? <span className="loading loading-spinner loading-sm" /> : 'Войти'}
              </button>
            </div>
          </form>

          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}

          <div className="divider my-0 text-xs text-base-content/50">или</div>

          <a
            className="btn btn-outline"
            href={githubLoginHref()}
            aria-label="Войти через GitHub (оператор или владелец)"
          >
            Войти через GitHub — для команды
          </a>
        </div>
      </section>
    </main>
  );
}
