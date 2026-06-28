import type { ServerFirstBadgeDescriptor } from './server-first-badges.js';
import {
  resolveServerFirstBadgeDescriptors,
  type ServerFirstBadgePerspective,
} from './server-first-badges.js';
import type { ServerFirstFlags } from './server-first-flags.js';

export interface BoardServerFirstBadgesProps {
  readonly flags: ServerFirstFlags | null;
  readonly perspective?: ServerFirstBadgePerspective;
}

function BadgeItem({ badge }: { readonly badge: ServerFirstBadgeDescriptor }) {
  return (
    <span className={badge.className} title={badge.title}>
      {badge.label}
    </span>
  );
}

/** Server-first badges: edit lease + capture follower (SF5). */
export function BoardServerFirstBadges({
  flags,
  perspective = 'field',
}: BoardServerFirstBadgesProps) {
  if (flags === null) {
    return null;
  }

  const badges = resolveServerFirstBadgeDescriptors(flags, perspective);
  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5" role="status" aria-live="polite">
      {badges.map((badge) => (
        <BadgeItem key={badge.key} badge={badge} />
      ))}
    </div>
  );
}
