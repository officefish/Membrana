import { useCallback, useEffect, useRef, useState } from 'react';

export type CabinetToastVariant = 'error' | 'success' | 'info';

export interface CabinetToastState {
  message: string;
  variant: CabinetToastVariant;
  retry?: () => void;
}

export function useCabinetToast() {
  const [toast, setToast] = useState<CabinetToastState | null>(null);
  const timerRef = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const show = useCallback(
    (state: CabinetToastState, autoDismissMs?: number) => {
      dismiss();
      setToast(state);
      if (autoDismissMs && autoDismissMs > 0) {
        timerRef.current = window.setTimeout(() => {
          setToast(null);
          timerRef.current = null;
        }, autoDismissMs);
      }
    },
    [dismiss],
  );

  const showError = useCallback(
    (message: string, retry?: () => void) => {
      show({ message, variant: 'error', retry });
    },
    [show],
  );

  const showSuccess = useCallback(
    (message: string) => {
      show({ message, variant: 'success' }, 3000);
    },
    [show],
  );

  useEffect(() => dismiss, [dismiss]);

  return { toast, dismiss, showError, showSuccess };
}
