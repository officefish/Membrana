import React from 'react';

export interface TrendsCollapsibleSectionProps {
  readonly title: string;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly children: React.ReactNode;
  readonly subtitle?: string;
}

export const TrendsCollapsibleSection: React.FC<TrendsCollapsibleSectionProps> = ({
  title,
  expanded,
  onToggle,
  children,
  subtitle,
}) => (
  <section className="flex flex-col gap-2">
    <button
      type="button"
      className="btn btn-ghost btn-xs min-h-8 w-full justify-start gap-2 px-1 font-normal"
      aria-expanded={expanded}
      onClick={onToggle}
    >
      <span className="text-[10px] text-base-content/50 shrink-0" aria-hidden>
        {expanded ? '▼' : '▶'}
      </span>
      <span className="text-xs font-medium text-base-content/80">{title}</span>
      {subtitle ? (
        <span className="text-[11px] text-base-content/50 truncate">{subtitle}</span>
      ) : null}
    </button>
    {expanded ? children : null}
  </section>
);
