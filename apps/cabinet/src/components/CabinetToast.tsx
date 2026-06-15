import type { CabinetToastState } from '@/lib/useCabinetToast';

interface CabinetToastProps {
  toast: CabinetToastState | null;
  onDismiss: () => void;
}

const VARIANT_CLASS: Record<CabinetToastState['variant'], string> = {
  error: 'alert-error',
  success: 'alert-success',
  info: 'alert-info',
};

export function CabinetToast({ toast, onDismiss }: CabinetToastProps) {
  if (!toast) return null;

  return (
    <div className="toast toast-end toast-top z-50 w-full max-w-md">
      <div className={`alert text-sm shadow-lg ${VARIANT_CLASS[toast.variant]}`} role="status">
        <div className="flex w-full flex-col gap-2">
          <span>{toast.message}</span>
          <div className="flex gap-2">
            {toast.retry ? (
              <button type="button" className="btn btn-xs btn-outline" onClick={toast.retry}>
                Повторить
              </button>
            ) : null}
            <button type="button" className="btn btn-xs btn-ghost" onClick={onDismiss}>
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
