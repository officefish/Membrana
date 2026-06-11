import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { TrendsFftLabView } from './TrendsFftLabView';

export interface TrendsFftFullscreenProps {
  readonly moduleId: string;
  readonly onClose: () => void;
}

export function TrendsFftFullscreen({ moduleId, onClose }: TrendsFftFullscreenProps) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-base-100 text-base-content"
      role="dialog"
      aria-modal="true"
      aria-label="Анализатор тенденций FFT — полноэкранный режим"
    >
      <header className="shrink-0 border-b border-base-300 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-base-content/50 font-mono">
            Trends FFT · классификация сцен
          </p>
          <h2 className="text-xl font-bold text-primary">Анализатор тенденций FFT</h2>
        </div>
        <button type="button" className="btn btn-ghost btn-sm min-h-10" onClick={onClose}>
          Закрыть
        </button>
      </header>
      <main className="flex flex-1 min-h-0 flex-col overflow-hidden p-4 max-w-5xl mx-auto w-full">
        <TrendsFftLabView moduleId={moduleId} layout="fullscreen" />
      </main>
      <footer className="shrink-0 border-t border-base-300 px-4 py-2 text-center text-[10px] font-mono text-base-content/50">
        Синхронизировано с модулем «Микрофон» · Esc — выход
      </footer>
    </div>,
    document.body,
  );
}
