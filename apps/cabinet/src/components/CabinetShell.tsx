import type { AuthUser } from '@/api/auth';

interface CabinetShellProps {
  user: AuthUser;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { id: 'membrane', label: 'Мембрана', hint: 'MP2' },
  { id: 'nodes', label: 'Узлы и ключи', hint: 'MP2' },
  { id: 'journal', label: 'Журнал', hint: 'MP5' },
] as const;

export function CabinetShell({ user, onLogout }: CabinetShellProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r border-base-content/10 bg-base-200 p-4">
        <div className="mb-8">
          <p className="text-lg font-semibold">Membrana</p>
          <p className="text-xs text-base-content/60">cabinet.membrana.space</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Разделы кабинета">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="btn btn-ghost justify-start opacity-60"
              disabled
              title={`Скоро (${item.hint})`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t border-base-content/10 pt-4">
          <p className="truncate text-sm font-medium">{user.login}</p>
          <button type="button" className="btn btn-ghost btn-sm mt-2 px-0" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">Добро пожаловать</h1>
          <p className="mt-2 max-w-xl text-base-content/70">
            MP1: авторизация и оболочка кабинета. Мембрана, узлы с ключами TTL и облачный журнал —
            в следующих фазах эпика #67.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {NAV_ITEMS.map((item) => (
            <article key={item.id} className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title text-base">{item.label}</h2>
                <p className="text-sm text-base-content/60">Фаза {item.hint}</p>
                <span className="badge badge-outline badge-sm w-fit">скоро</span>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
