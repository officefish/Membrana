import React from 'react';
import packageJson from '../../package.json';

import { StorageRuntimeIndicator } from './StorageRuntimeIndicator';

export const AppFooter: React.FC = () => {
  const v = packageJson.version ?? '0.0.0';
  const year = new Date().getFullYear();

  return (
    <footer className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-x-4 sm:gap-y-1">
      <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
          <p className="text-[11px] text-base-content/50">
            © Membrana, <span className="tabular-nums">{year}</span>
            <span aria-hidden="true" className="text-base-content/35">
              {' '}
              ·{' '}
            </span>
            программа пространственной разведки
            <span aria-hidden="true" className="text-base-content/35">
              {' '}
              ·{' '}
            </span>
            сборка <span className="tabular-nums">{v}</span>
          </p>
          <a
            href="https://github.com/officefish/Membrana"
            className="link link-hover text-[11px] text-base-content/60"
            rel="noopener noreferrer"
            target="_blank"
          >
            Репозиторий на GitHub
          </a>
        </div>
        <p className="max-w-prose text-[10px] text-base-content/40">
          Интерфейс анализа сигналов. Настройки и состояние модулей сохраняются в профиле среды (см.
          индикатор хранения внизу справа).
        </p>
      </div>
      <div className="flex justify-end sm:shrink-0">
        <StorageRuntimeIndicator compact />
      </div>
    </footer>
  );
};
