import { useState, type ComponentType } from 'react';

import { usePanelAuth } from '@/context/PanelAuthContext';
import { canAccessSection, ROLE_LABELS, type PanelRole } from '@/lib/roles';
import { PANEL_SECTIONS, type PanelSection } from '@/lib/sections';
import { DriftAnchorsBoard } from './DriftAnchorsBoard';
import { SectionCard } from './SectionCard';
import { DetectorCompareSection } from './detector-compare/DetectorCompareSection';

/**
 * Shell авторизованного пользователя (OP3 + #454): навбар с ролью словом +
 * выход; сетка разделов; раздел с контентом открывается по клику (state, не
 * router — одна страница, кнопка «назад»). Разделы без контента — заглушки.
 */

/** Борды-потребители каркаса. Нет записи — раздел ещё заглушка. */
const SECTION_BOARDS: Partial<Record<string, ComponentType>> = {
  'drift-anchors': DriftAnchorsBoard,
  'detector-compare': DetectorCompareSection,
};

/** Широкие борды: таблице сравнения тесно в max-w-3xl. */
const WIDE_SECTIONS = new Set(['detector-compare']);

export function SectionShell() {
  const { identity, logout } = usePanelAuth();
  const [openId, setOpenId] = useState<string | null>(null);

  const open = openId ? PANEL_SECTIONS.find((s) => s.id === openId) : undefined;
  const OpenBoard = open ? SECTION_BOARDS[open.id] : undefined;

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

      <main className={`mx-auto px-4 py-8 ${open && WIDE_SECTIONS.has(open.id) ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {open && OpenBoard ? (
          <section aria-label={`Раздел «${open.title}»`} className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn btn-ghost btn-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => setOpenId(null)}
                aria-label="Назад к разделам"
              >
                ← Разделы
              </button>
              <h2 className="text-lg font-semibold">{open.title}</h2>
            </div>
            <OpenBoard />
          </section>
        ) : (
          <section aria-label="Разделы панели" className="grid gap-3 sm:grid-cols-2">
            {PANEL_SECTIONS.map((s) => (
              <SectionCard
                key={s.id}
                section={s}
                role={identity.role}
                grants={identity.grants}
                onOpen={hasBoard(s, identity.role, identity.grants) ? () => setOpenId(s.id) : undefined}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function hasBoard(section: PanelSection, role: PanelRole, grants: readonly string[]): boolean {
  // PU2 (#463): единый предикат — роль ≥ уровня ИЛИ партнёрский грант.
  return Boolean(SECTION_BOARDS[section.id]) && canAccessSection(role, grants, section.minRole, section.id);
}
