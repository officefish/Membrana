import { useState } from 'react';
import type { AuthUser } from '@/api/auth';
import { MembranePage } from '@/pages/MembranePage';
import { NodesPage } from '@/pages/NodesPage';
import { JournalPage } from '@/pages/JournalPage';
import { SampleLibraryPage } from '@/pages/SampleLibraryPage';

interface CabinetShellProps {
  user: AuthUser;
  onLogout: () => void;
}

type SectionId = 'membrane' | 'nodes' | 'library' | 'journal';

const NAV_ITEMS: { id: SectionId; label: string; enabled: boolean; hint?: string }[] = [
  { id: 'membrane', label: 'Мембрана', enabled: true },
  { id: 'nodes', label: 'Узлы и ключи', enabled: true },
  { id: 'library', label: 'Библиотека сэмплов', enabled: true },
  { id: 'journal', label: 'Журнал', enabled: true },
];

function SectionContent({ section }: { section: SectionId }) {
  switch (section) {
    case 'membrane':
      return <MembranePage />;
    case 'nodes':
      return <NodesPage />;
    case 'library':
      return <SampleLibraryPage />;
    case 'journal':
      return <JournalPage />;
    default:
      return null;
  }
}

export function CabinetShell({ user, onLogout }: CabinetShellProps) {
  const [section, setSection] = useState<SectionId>('membrane');

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
              className={`btn btn-ghost justify-start ${section === item.id ? 'btn-active' : ''} ${!item.enabled ? 'opacity-60' : ''}`}
              disabled={!item.enabled}
              title={item.hint ? `Скоро (${item.hint})` : undefined}
              onClick={() => item.enabled && setSection(item.id)}
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

      <main className="flex min-h-0 flex-1 flex-col p-8">
        <SectionContent section={section} />
      </main>
    </div>
  );
}
