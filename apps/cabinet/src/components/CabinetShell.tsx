import { useState } from 'react';
import type { AuthUser } from '@/api/auth';
import { MembranePage } from '@/pages/MembranePage';
import { NodesPage } from '@/pages/NodesPage';
import { KeysPage } from '@/pages/KeysPage';
import { JournalPage } from '@/pages/JournalPage';
import { SampleLibraryPage } from '@/pages/SampleLibraryPage';
import { DeviceBoardPage } from '@/pages/DeviceBoardPage';

interface CabinetShellProps {
  user: AuthUser;
  onLogout: () => void;
}

type SectionId = 'membrane' | 'nodes-keys' | 'nodes' | 'keys' | 'library' | 'journal' | 'device-board';

/**
 * По умолчанию — два раздела «Узлы» и «Ключи».
 * Объединённый раздел только при `VITE_CABINET_NODES_KEYS_COMBINED=true` (legacy QA).
 */
const NODES_KEYS_COMBINED = import.meta.env.VITE_CABINET_NODES_KEYS_COMBINED === 'true';

const NAV_ITEMS: { id: SectionId; label: string; enabled: boolean; hint?: string }[] = [
  { id: 'membrane', label: 'Мембрана', enabled: true },
  ...(NODES_KEYS_COMBINED
    ? ([{ id: 'nodes-keys', label: 'Узлы и ключи', enabled: true }] as const)
    : ([
        { id: 'nodes', label: 'Узлы', enabled: true },
        { id: 'keys', label: 'Ключи', enabled: true },
      ] as const)),
  { id: 'library', label: 'Библиотека сэмплов', enabled: true },
  { id: 'journal', label: 'Журнал', enabled: true },
  { id: 'device-board', label: 'Device board', enabled: true },
];

const DEFAULT_SECTION: SectionId = 'membrane';

function SectionContent({
  section,
  onNavigate,
  onOpenDeviceBoard,
  keysInitialNodeId,
}: {
  section: SectionId;
  onNavigate: (section: SectionId, options?: { keysNodeId?: string }) => void;
  onOpenDeviceBoard: () => void;
  keysInitialNodeId: string | null;
}) {
  switch (section) {
    case 'membrane':
      return <MembranePage />;
    case 'nodes-keys':
      return (
        <div className="space-y-8">
          <NodesPage
            onOpenJournal={() => onNavigate('journal')}
            onOpenDeviceBoard={onOpenDeviceBoard}
            onOpenKeys={(nodeId) => onNavigate('keys', { keysNodeId: nodeId })}
          />
          <div className="divider" />
          <KeysPage initialNodeId={keysInitialNodeId} />
        </div>
      );
    case 'nodes':
      return (
        <NodesPage
          onOpenJournal={() => onNavigate('journal')}
          onOpenDeviceBoard={onOpenDeviceBoard}
          onOpenKeys={(nodeId) => onNavigate('keys', { keysNodeId: nodeId })}
        />
      );
    case 'keys':
      return <KeysPage initialNodeId={keysInitialNodeId} />;
    case 'library':
      return <SampleLibraryPage />;
    case 'journal':
      return <JournalPage />;
    case 'device-board':
      return (
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">Device board</h1>
          <p className="max-w-2xl text-sm text-base-content/70">
            Редактирование сценария устройства в облаке. Изменения синхронизируются с полевым клиентом по deviceId
            (last-write-wins).
          </p>
          <button type="button" className="btn btn-primary w-fit" onClick={onOpenDeviceBoard}>
            Открыть редактор
          </button>
        </div>
      );
    default:
      return null;
  }
}

export function CabinetShell({ user, onLogout }: CabinetShellProps) {
  const [section, setSection] = useState<SectionId>(DEFAULT_SECTION);
  const [deviceBoardOpen, setDeviceBoardOpen] = useState(false);
  const [keysInitialNodeId, setKeysInitialNodeId] = useState<string | null>(null);

  const handleNavigate = (next: SectionId, options?: { keysNodeId?: string }) => {
    if (options?.keysNodeId) {
      setKeysInitialNodeId(options.keysNodeId);
    }
    setSection(next);
  };

  if (deviceBoardOpen) {
    return <DeviceBoardPage onBack={() => setDeviceBoardOpen(false)} />;
  }

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
              onClick={() => item.enabled && handleNavigate(item.id)}
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
        <SectionContent
          section={section}
          onNavigate={handleNavigate}
          onOpenDeviceBoard={() => setDeviceBoardOpen(true)}
          keysInitialNodeId={keysInitialNodeId}
        />
      </main>
    </div>
  );
}
