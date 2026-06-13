import React from 'react';
import packageJson from '../../package.json';

import { NodeConnectionFooterIndicator } from './node-connection/NodeConnectionFooterIndicator';
import { StorageRuntimeIndicator } from './StorageRuntimeIndicator';

export const AppFooter: React.FC = () => {
  const v = packageJson.version ?? '0.0.0';
  const year = new Date().getFullYear();

  return (
    <footer className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-x-2 overflow-hidden">
          <p className="truncate text-[11px] text-base-content/50">
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
            className="link link-hover shrink-0 text-[11px] text-base-content/60"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <NodeConnectionFooterIndicator compact />
          <StorageRuntimeIndicator compact />
        </div>
      </div>
    </footer>
  );
};
