import { useEffect, useState } from 'react';
import { usePanelAuth } from '@/context/PanelAuthContext';
import { canAccess, ROLE_LABELS } from '@/lib/roles';
import { PANEL_SECTIONS, SECTION_ROUTES } from '@/lib/sections';
import { SectionCard } from './SectionCard';
import { DetectorCompareSection } from './detector-compare/DetectorCompareSection';

/** Минимальный hash-роутинг: без router-зависимости (панель = ноль новых deps). */
function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

/**
 * Shell авторизованного пользователя (OP3): навбар с ролью словом + выход,
 * сетка разделов; реализованные разделы открываются по hash-роуту.
 */
export function SectionShell() {
  const { identity, logout } = usePanelAuth();
  const hash = useHashRoute();

  const compareSection = PANEL_SECTIONS.find((s) => s.id === 'detector-compare');
  const showCompare =
    hash === SECTION_ROUTES['detector-compare'] &&
    compareSection != null &&
    canAccess(identity.role, compareSection.minRole);

  return (
    <div className="min-h-screen">
      <nav className="navbar border-b border-base-content/10 bg-base-200 px-4" aria-label="Панель">
        <div className="flex flex-1 items-center gap-3">
          <a href="#" className="text-lg font-semibold">
            Membrana — панель
          </a>
          {showCompare && <span className="text-sm text-base-content/60">/ детекторы</span>}
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

      <main className={`mx-auto px-4 py-8 ${showCompare ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {showCompare ? (
          <>
            <a href="#" className="btn btn-ghost btn-sm mb-4" aria-label="Назад к разделам">
              ← К разделам
            </a>
            <DetectorCompareSection />
          </>
        ) : (
          <section aria-label="Разделы панели" className="grid gap-3 sm:grid-cols-2">
            {PANEL_SECTIONS.map((s) => (
              <SectionCard key={s.id} section={s} role={identity.role} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
