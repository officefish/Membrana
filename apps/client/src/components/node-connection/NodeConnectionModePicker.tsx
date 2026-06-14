import React from 'react';

import { useNodeConnectionStore } from '../../stores/nodeConnectionStore';

export const NodeConnectionModePicker: React.FC = () => {
  const showModePicker = useNodeConnectionStore((s) => s.showModePicker);
  const chooseAutonomous = useNodeConnectionStore((s) => s.chooseAutonomous);
  const openPairingPanel = useNodeConnectionStore((s) => s.openPairingPanel);
  const closeModePicker = useNodeConnectionStore((s) => s.closeModePicker);
  const mode = useNodeConnectionStore((s) => s.mode);

  if (!showModePicker) return null;

  return (
    <dialog className="modal modal-open" open aria-labelledby="node-mode-title">
      <div className="modal-box max-w-md">
        <h3 id="node-mode-title" className="text-lg font-bold">
          Режим узла
        </h3>
        <p className="mt-2 text-sm text-base-content/70">
          Полевой клиент может работать автономно (данные только локально) или связаться с мембраной
          в кабинете по ключу доступа.
        </p>
        <div className="modal-action mt-6 flex flex-col gap-2 sm:flex-row sm:justify-stretch">
          <button type="button" className="btn btn-primary flex-1" onClick={() => chooseAutonomous()}>
            Автономный узел
          </button>
          <button type="button" className="btn btn-outline flex-1" onClick={() => openPairingPanel()}>
            Связь с мембраной
          </button>
        </div>
        {mode !== null ? (
          <button type="button" className="btn btn-ghost btn-sm mt-3 w-full" onClick={() => closeModePicker()}>
            Закрыть
          </button>
        ) : null}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={() => closeModePicker()}>
          закрыть
        </button>
      </form>
    </dialog>
  );
};
