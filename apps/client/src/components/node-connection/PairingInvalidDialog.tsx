import React from 'react';

import type { PairingInvalidReason } from '../../lib/nodeConnectionMode';
import { useNodeConnectionStore } from '../../stores/nodeConnectionStore';

function reasonMessage(reason: PairingInvalidReason): string {
  switch (reason) {
    case 'revoked':
      return 'Ключ доступа отозван в кабинете. Связь с мембраной разорвана.';
    case 'expired':
      return 'Срок действия ключа доступа истёк. Связь с мембраной разорвана.';
    case 'session_expired':
      return 'Сессия связи с кабинетом истекла. Подключитесь снова по новому ключу.';
  }
}

export const PairingInvalidDialog: React.FC = () => {
  const showPairingInvalidDialog = useNodeConnectionStore((s) => s.showPairingInvalidDialog);
  const pairingInvalidReason = useNodeConnectionStore((s) => s.pairingInvalidReason);
  const dismissPairingInvalidDialog = useNodeConnectionStore((s) => s.dismissPairingInvalidDialog);

  if (!showPairingInvalidDialog || !pairingInvalidReason) return null;

  return (
    <dialog className="modal modal-open" open aria-labelledby="pairing-invalid-title">
      <div className="modal-box max-w-md">
        <h3 id="pairing-invalid-title" className="text-lg font-bold">
          Связь прервана
        </h3>
        <p className="mt-2 text-sm text-base-content/70">{reasonMessage(pairingInvalidReason)}</p>
        <div className="modal-action mt-4">
          <button type="button" className="btn btn-primary" onClick={() => dismissPairingInvalidDialog()}>
            Подключить снова
          </button>
        </div>
      </div>
    </dialog>
  );
};
