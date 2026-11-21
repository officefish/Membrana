import React, { useEffect, useState } from 'react';

import type { StudioLoginItemState } from '../../lib/electronMediaLibraryPort';

/**
 * Переключатель «Запускать Студию при входе в Windows» (дежурство прибора, дыра №1 карты 21.11).
 * Состояние — из ОС через оболочку Студии, не из памяти клиента: после записи показывается
 * перечитанное состояние. В браузере и в старой сборке без канала переключателя нет вовсе.
 */
export const StudioLoginItemToggle: React.FC = () => {
  const port = typeof window === 'undefined' ? undefined : window.electronAPI?.studioShell;
  const [state, setState] = useState<StudioLoginItemState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!port?.getOpenAtLogin) return;
    port
      .getOpenAtLogin()
      .then(setState)
      .catch(() => setError('Не удалось прочитать автозагрузку Windows.'));
  }, [port]);

  if (!port?.getOpenAtLogin || !port.setOpenAtLogin) return null;

  const toggle = async (enabled: boolean): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const next = await port.setOpenAtLogin!(enabled);
      setState(next);
      if (next.openAtLogin !== enabled) setError('Windows не приняла настройку автозагрузки.');
    } catch {
      setError('Не удалось изменить автозагрузку Windows.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-base-content/10 p-3 text-sm">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span>Запускать Студию при входе в Windows</span>
        <input
          type="checkbox"
          className="toggle toggle-sm"
          checked={state?.openAtLogin ?? false}
          disabled={busy || state === null || !state.supported}
          onChange={(e) => void toggle(e.target.checked)}
          data-testid="studio-open-at-login"
        />
      </label>
      {state && !state.supported ? (
        <p className="mt-1 text-xs text-base-content/60">Недоступно в режиме разработки — только в установленной Студии.</p>
      ) : (
        <p className="mt-1 text-xs text-base-content/60">
          Для дежурства без человека: вместе с автовходом Windows Студия поднимется сама после перезагрузки.
        </p>
      )}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
};
