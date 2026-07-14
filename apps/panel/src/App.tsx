import { PANEL_TITLE } from '@/lib/appMeta';

/**
 * OP1 — каркас-заглушка. Настоящее welcome-окно (язык ALLY_PRIMER, DESIGN.md,
 * состояния login/error/loading) — OP3; разделы и уровни доступа — OP2/OP3.
 */
export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <section className="text-center">
        <h1 className="text-2xl font-semibold text-base-content">{PANEL_TITLE}</h1>
        <p className="mt-2 text-base-content/70">
          Каркас операторской витрины office (эпик #438, фаза OP1).
        </p>
      </section>
    </main>
  );
}
