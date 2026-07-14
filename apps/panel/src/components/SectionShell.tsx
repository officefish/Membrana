import { usePanelAuth } from '@/context/PanelAuthContext';
import { ROLE_LABELS } from '@/lib/roles';
import { PANEL_SECTIONS } from '@/lib/sections';
import { SectionCard } from './SectionCard';

/**
 * Shell авторизованного пользователя (OP3): навбар с ролью словом + выход,
 * сетка разделов-заглушек по уровню. Содержимое разделов — фазы после эпика.
 */
export function SectionShell() {
  const { identity, logout } = usePanelAuth();

  return (
    <div className="min-h-screen">
      <nav className="navbar border-b border-base-content/10 bg-base-200 px-4" aria-label="Панель">
        <div className="flex-1">
          <span className="text-lg font-semibold">Membrana — панель</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-primary badge-outline" aria-label={`Ваш уровень: ${ROLE_LABELS[identity.role]}`}>
            {ROLE_LABELS[identity.role]}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            onClick={() => void logout()}
            aria-label="Выйти из панели"
          >
            Выйти
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <section aria-label="Разделы панели" className="grid gap-3 sm:grid-cols-2">
          {PANEL_SECTIONS.map((s) => (
            <SectionCard key={s.id} section={s} role={identity.role} />
          ))}
        </section>
      </main>
    </div>
  );
}
