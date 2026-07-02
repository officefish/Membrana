import { useEffect, useRef, useState } from 'react';

import type { DeviceCaptureClientState } from '@membrana/device-board';

import {
  resolveCaptureTransitionToast,
  type CaptureToastDescriptor,
} from '@/lib/captureToasts';
import { useServerFirstStore } from '@/stores/serverFirstStore';

/**
 * CT5: активные уведомления о захвате/отпускании устройства (канон §7).
 * Toast закрывается вручную (не автоскрытие) — оператор должен заметить
 * смену контроля. aria-live=polite объявляет смену для screen-reader.
 */
export function CaptureAlertToasts() {
  const capture = useServerFirstStore((s) => s.capture);
  const lastCaptureRelease = useServerFirstStore((s) => s.lastCaptureRelease);
  const prevCaptureRef = useRef<DeviceCaptureClientState | null>(capture);
  const [toasts, setToasts] = useState<readonly CaptureToastDescriptor[]>([]);

  useEffect(() => {
    const prev = prevCaptureRef.current;
    prevCaptureRef.current = capture;
    const toast = resolveCaptureTransitionToast(prev, capture, lastCaptureRelease);
    if (toast === null) {
      return;
    }
    setToasts((current) => [...current.filter((t) => t.key !== toast.key), toast]);
  }, [capture, lastCaptureRelease]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast toast-end z-[60]" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.key}
          className={toast.tone === 'warning' ? 'alert alert-warning' : 'alert alert-info'}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            aria-label="Закрыть уведомление"
            onClick={() =>
              setToasts((current) => current.filter((t) => t.key !== toast.key))
            }
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
