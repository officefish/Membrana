import React from 'react';

/** Линейный знак «пространственная разведка» — компактный SVG для шапки. */
export const SpatialIntelLogo: React.FC<{ className?: string; 'aria-hidden'?: boolean }> = ({
  className = 'h-9 w-9 shrink-0 text-base-content/85',
  'aria-hidden': ariaHidden = true,
}) => (
  <svg
    viewBox="0 0 44 48"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden={ariaHidden}
    role={ariaHidden ? undefined : 'img'}
    aria-label={ariaHidden ? undefined : 'Программа пространственной разведки'}
  >
    <g stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" strokeLinecap="round">
      {/* внешний контур: три вершины + «чаша» снизу */}
      <path d="M22 2 L38 14 L36 32 L22 46 L8 32 L6 14 Z" />
      {/* ось */}
      <path d="M22 2 L22 34" />
      {/* верхние скаты */}
      <path d="M6 14 L22 22 L38 14" />
      {/* нижние скаты к центру */}
      <path d="M8 32 L22 24 L36 32" />
      {/* поперечина середины */}
      <path d="M12 23 L32 23" />
    </g>
  </svg>
);
