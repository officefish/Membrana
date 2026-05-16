import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { HarmonicDetectorLabView } from './HarmonicDetectorLabView';
import { useHarmonicThreshold } from './useHarmonicThreshold';

interface Props {
  readonly moduleId: string;
  readonly onClose: () => void;
}

export function HarmonicDetectorFullscreen({ moduleId, onClose }: Props) {
  const { setConfidenceThreshold } = useHarmonicThreshold(moduleId);

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
      aria-label="Harmonic Drone Lab — полноэкранный режим"
    >
      <header className="shrink-0 border-b border-base-300 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-base-content/50 font-mono">
            DSP · FFT 2048 · 48 kHz
          </p>
          <h2 className="text-xl font-bold text-success">Harmonic Drone Lab</h2>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Закрыть
        </button>
      </header>
      <main className="flex-1 min-h-0 overflow-y-auto p-4 max-w-lg mx-auto w-full">
        <HarmonicDetectorLabView onThresholdChange={setConfidenceThreshold} />
      </main>
      <footer className="shrink-0 border-t border-base-300 px-4 py-2 text-center text-[10px] font-mono text-base-content/50">
        Синхронизировано с модулем «Микрофон» и датчиком в шапке · Esc — выход
      </footer>
    </div>,
    document.body,
  );
}
