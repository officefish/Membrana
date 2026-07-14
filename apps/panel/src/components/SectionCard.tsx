import { canAccess, ROLE_LABELS, type PanelRole } from '@/lib/roles';
import type { PanelSection } from '@/lib/sections';

/**
 * Карточка раздела (OP3 + #454): бейдж уровня словом (не только цветом —
 * DESIGN.md), замок на недоступном. Раздел с контентом открывается кнопкой;
 * без контента — честная пометка «в разработке».
 */
export function SectionCard({
  section,
  role,
  onOpen,
}: {
  section: PanelSection;
  role: PanelRole;
  onOpen?: () => void;
}) {
  const unlocked = canAccess(role, section.minRole);
  return (
    <article
      className={`card bg-base-200 border border-base-content/10 ${unlocked ? '' : 'opacity-60'}`}
      aria-label={`Раздел «${section.title}», уровень: ${ROLE_LABELS[section.minRole]}${unlocked ? '' : ', недоступен'}`}
    >
      <div className="card-body p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="card-title text-base">{section.title}</h3>
          <span className="badge badge-outline badge-sm shrink-0">
            {unlocked ? ROLE_LABELS[section.minRole] : `🔒 ${ROLE_LABELS[section.minRole]}`}
          </span>
        </div>
        <p className="text-sm text-base-content/70">{section.description}</p>
        {unlocked && onOpen && (
          <div className="card-actions justify-end">
            <button
              type="button"
              className="btn btn-primary btn-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              onClick={onOpen}
              aria-label={`Открыть раздел «${section.title}»`}
            >
              Открыть
            </button>
          </div>
        )}
        {unlocked && !onOpen && (
          <p className="text-xs text-base-content/50">Раздел в разработке — появится после каркаса.</p>
        )}
      </div>
    </article>
  );
}
