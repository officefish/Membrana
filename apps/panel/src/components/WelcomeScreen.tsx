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
  const { error, loginWithInvite, registerPartner } = usePanelAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoName, setPromoName] = useState('');
  const [registering, setRegistering] = useState(false);

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

  /** PU2 (#463): регистрация партнёра по промокоду — код + имя. */
  async function onRegister(e: FormEvent) {
    e.preventDefault();
    if (!promoCode.trim() || !promoName.trim() || registering) return;
    setRegistering(true);
    try {
      await registerPartner(promoCode.trim(), promoName.trim());
    } catch {
      /* текст ошибки уже в контексте */
    } finally {
      setRegistering(false);
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

          <div className="divider my-0 text-xs text-base-content/50">или</div>

          <form onSubmit={onRegister} className="flex flex-col gap-2">
            <label className="label p-0" htmlFor="promo-code">
              <span className="label-text">Регистрация по промокоду (для партнёров)</span>
            </label>
            <input
              id="promo-code"
              className="input input-bordered w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              placeholder="промокод"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              autoComplete="off"
            />
            <label className="sr-only" htmlFor="promo-name">
              Как вас называть
            </label>
            <div className="join w-full">
              <input
                id="promo-name"
                className="input input-bordered join-item w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                placeholder="как вас называть"
                value={promoName}
                onChange={(e) => setPromoName(e.target.value)}
                autoComplete="name"
                maxLength={64}
              />
              <button
                type="submit"
                className="btn btn-primary join-item"
                disabled={!promoCode.trim() || !promoName.trim() || registering}
                aria-label="Зарегистрироваться по промокоду"
              >
                {registering ? <span className="loading loading-spinner loading-sm" /> : 'Регистрация'}
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
