import { canAccess, ROLE_LABELS, type PanelRole } from '@/lib/roles';
import { SECTION_ROUTES, type PanelSection } from '@/lib/sections';

/**
 * Карточка раздела (OP3): бейдж уровня словом (не только цветом — DESIGN.md),
 * замок на недоступном. Реализованные разделы (SECTION_ROUTES) — ссылки,
 * остальные — заглушки до своих задач.
 */
export function SectionCard({ section, role }: { section: PanelSection; role: PanelRole }) {
  const unlocked = canAccess(role, section.minRole);
  const route = SECTION_ROUTES[section.id];
  const clickable = unlocked && route != null;

  const body = (
    <div className="card-body p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="card-title text-base">{section.title}</h3>
        <span className="badge badge-outline badge-sm shrink-0">
          {unlocked ? ROLE_LABELS[section.minRole] : `🔒 ${ROLE_LABELS[section.minRole]}`}
        </span>
      </div>
      <p className="text-sm text-base-content/70">{section.description}</p>
      {unlocked && !route && (
        <p className="text-xs text-base-content/50">Раздел в разработке — появится после каркаса.</p>
      )}
      {clickable && <p className="text-xs text-primary">Открыть раздел →</p>}
    </div>
  );

  const className = `card bg-base-200 border border-base-content/10 ${unlocked ? '' : 'opacity-60'}`;
  const ariaLabel = `Раздел «${section.title}», уровень: ${ROLE_LABELS[section.minRole]}${unlocked ? '' : ', недоступен'}`;

  if (clickable) {
    return (
      <a
        href={route}
        className={`${className} transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}
        aria-label={ariaLabel}
      >
        {body}
      </a>
    );
  }
  return (
    <article className={className} aria-label={ariaLabel}>
      {body}
    </article>
  );
}
