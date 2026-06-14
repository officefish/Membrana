import React from 'react';

import { useNodeConnectionStore } from '../../stores/nodeConnectionStore';

export const ConnectionFallbackDialog: React.FC = () => {
  const showFallbackDialog = useNodeConnectionStore((s) => s.showFallbackDialog);
  const lastConnectionError = useNodeConnectionStore((s) => s.lastConnectionError);
  const dismissFallbackDialog = useNodeConnectionStore((s) => s.dismissFallbackDialog);
  const acceptAutonomousFallback = useNodeConnectionStore((s) => s.acceptAutonomousFallback);

  if (!showFallbackDialog) return null;

  return (
    <dialog className="modal modal-open" open aria-labelledby="fallback-title">
      <div className="modal-box max-w-md">
        <h3 id="fallback-title" className="text-lg font-bold">
          Сервер недоступен
        </h3>
        <p className="mt-2 text-sm text-base-content/70">
          Не удалось связаться с кабинетом или media-server. Анализ можно продолжить в автономном
          режиме — данные останутся локально.
        </p>
        {lastConnectionError ? (
          <p className="mt-2 text-xs text-base-content/50 font-mono break-all">{lastConnectionError}</p>
        ) : null}
        <div className="modal-action mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn btn-ghost flex-1" onClick={() => dismissFallbackDialog()}>
            Остаться в связанном режиме
          </button>
          <button type="button" className="btn btn-warning flex-1" onClick={() => acceptAutonomousFallback()}>
            Перейти в автономный режим
          </button>
        </div>
      </div>
    </dialog>
  );
};
