import React from 'react';

const ModuleDefaultGlyph: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6 shrink-0"
    aria-hidden
  >
    <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" />
    <path d="M9 4v16M15 4v16" />
  </svg>
);

export interface ModuleHeaderProps {
  /** Иконка модуля (JSX элемент) */
  icon?: React.ReactNode;
  /** Название модуля */
  title: string;
  /** Описание модуля */
  description?: string;
  /** Дополнительные CSS классы */
  className?: string;
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({
  icon = <ModuleDefaultGlyph />,
  title,
  description,
  className = '',
}) => {
  return (
    <header className={`text-center mb-6 md:mb-8 ${className}`}>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        <div className="relative isolate shrink-0">
          <div
            className="pointer-events-none absolute inset-0 scale-110 rounded-2xl bg-primary/35 blur-md"
            aria-hidden
          />
          <div className="relative flex items-center justify-center rounded-2xl border border-primary bg-primary p-3 text-primary-content shadow-sm">
            {icon}
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {title}
        </h2>
      </div>
      {description ? (
        <p className="mx-auto mt-3 max-w-2xl text-sm text-primary sm:text-base">{description}</p>
      ) : null}
    </header>
  );
};
