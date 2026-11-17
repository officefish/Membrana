import React from 'react';

import {
  CONNECTION_FALLBACK_LEAD,
  CONNECTION_FALLBACK_TITLE,
  describeConnectionFailure,
} from '@/lib/connection-fallback/reasonTexts';
import { tryUpgradeMediaLibraryToRemote } from '@/lib/mediaLibraryHubBridge';
import { useNodeConnectionStore } from '../../stores/nodeConnectionStore';

/**
 * Окно «Сервер недоступен». Слова — ТОЛЬКО из `connection-fallback/reasonTexts.ts` (#2540):
 * класс отказа словами, что делать человеку, приглушённо — время и сырая деталь (развилка 4,
 * умолчание владельца). Кнопки и поведение — как до спринта.
 */
export const ConnectionFallbackDialog: React.FC = () => {
  const showFallbackDialog = useNodeConnectionStore((s) => s.showFallbackDialog);
  const lastConnectionFailure = useNodeConnectionStore((s) => s.lastConnectionFailure);
  const mode = useNodeConnectionStore((s) => s.mode);
  const pairing = useNodeConnectionStore((s) => s.pairing);
  const stayLinkedDespiteError = useNodeConnectionStore((s) => s.stayLinkedDespiteError);
  const acceptAutonomousFallback = useNodeConnectionStore((s) => s.acceptAutonomousFallback);

  if (!showFallbackDialog) return null;

  const described = lastConnectionFailure ? describeConnectionFailure(lastConnectionFailure) : null;

  const onStayLinked = (): void => {
    // CX5: остаёмся на связи при недоступном сервере — шапка предупреждает
    // о деградации, пока связь не восстановится (иначе «всё молчит» без причины).
    stayLinkedDespiteError();
    if (mode === 'paired' && pairing) {
      void tryUpgradeMediaLibraryToRemote(mode, pairing);
    }
  };

  return (
    <dialog className="modal modal-open" open aria-labelledby="fallback-title">
      <div className="modal-box max-w-md">
        <h3 id="fallback-title" className="text-lg font-bold">
          {CONNECTION_FALLBACK_TITLE}
        </h3>
        {described ? (
          <>
            <p className="mt-2 text-sm text-base-content/90" data-testid="connection-failure-what">
              {described.what}
            </p>
            <p className="mt-1 text-sm text-base-content/70" data-testid="connection-failure-todo">
              {described.todo}
            </p>
            <p
              className="mt-2 text-xs text-base-content/50 font-mono break-all"
              data-testid="connection-failure-raw"
            >
              {described.raw}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-base-content/70">{CONNECTION_FALLBACK_LEAD}</p>
        )}
        <div className="modal-action mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn btn-ghost flex-1" onClick={onStayLinked}>
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
