/**
 * Окно подтверждения ПРИВЯЗКИ «применить ко всем» (#2308, вердикт M1: включение — с явным
 * подтверждением). Не `window.confirm`: у системного окна один вопрос и ноль фактов, а здесь
 * человек обязан прочитать, что галочка — привязка, а не снимок: она распространится и на
 * будущие приборы, а собственные настройки приборов не сотрутся и вернутся при снятии.
 *
 * Клавиатура: Escape — отмена, фокус на «Отмена» при открытии (опасное действие не под Enter).
 */
import { useEffect, useRef, type ReactNode } from 'react';

export interface BindingConfirmDialogProps {
  readonly open: boolean;
  readonly deviceCount: number;
  readonly policyText: string;
  readonly busy?: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function BindingConfirmDialog({
  open,
  deviceCount,
  policyText,
  busy = false,
  onCancel,
  onConfirm,
}: BindingConfirmDialogProps): ReactNode {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="binding-confirm-title"
        className="flex w-full max-w-lg flex-col gap-3 rounded-lg bg-base-100 p-5 shadow-xl"
      >
        <h3 id="binding-confirm-title" className="text-lg font-semibold">
          Применить политику мембраны ко всем приборам?
        </h3>
        <p className="text-sm">
          Пока галочка стоит, режим «{policyText}» задаёт мембрана для{' '}
          <strong>всех приборов, включая те, что будут привязаны позже</strong>.
        </p>
        <p className="text-sm text-base-content/70">
          Собственные настройки приборов ({deviceCount}) не стираются: они вернутся, когда галочку снимут.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button ref={cancelRef} type="button" className="btn btn-sm" onClick={onCancel} disabled={busy}>
            Отмена
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onConfirm} disabled={busy}>
            {busy ? 'Применяем…' : 'Применить ко всем'}
          </button>
        </div>
      </div>
    </div>
  );
}
