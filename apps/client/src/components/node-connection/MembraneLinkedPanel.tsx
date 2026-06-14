import React from 'react';

import { formatExpiresAt, shortId } from '../../lib/pairingDisplay';
import { useNodeConnectionStore } from '../../stores/nodeConnectionStore';

export const MembraneLinkedPanel: React.FC = () => {
  const showLinkedPanel = useNodeConnectionStore((s) => s.showLinkedPanel);
  const pairing = useNodeConnectionStore((s) => s.pairing);
  const closeLinkedPanel = useNodeConnectionStore((s) => s.closeLinkedPanel);
  const openModePicker = useNodeConnectionStore((s) => s.openModePicker);
  const disconnectFromMembrane = useNodeConnectionStore((s) => s.disconnectFromMembrane);

  if (!showLinkedPanel || !pairing) return null;

  return (
    <dialog className="modal modal-open" open aria-labelledby="linked-title">
      <div className="modal-box max-w-lg">
        <h3 id="linked-title" className="text-lg font-bold">
          Связь с мембраной
        </h3>
        <p className="mt-2 text-sm text-base-content/70">
          Узел связан с кабинетом. Данные media-server привязаны к этой мембране.
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-base-content/60">Узел</dt>
            <dd className="font-medium text-right">{pairing.nodeLabel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-base-content/60">Мембрана</dt>
            <dd className="font-mono text-xs text-right" title={pairing.membraneId}>
              {shortId(pairing.membraneId)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-base-content/60">Device ID</dt>
            <dd className="font-mono text-xs text-right" title={pairing.deviceId}>
              {shortId(pairing.deviceId)}
            </dd>
          </div>
          {pairing.pairedKeyId ? (
            <div className="flex justify-between gap-4">
              <dt className="text-base-content/60">Ключ доступа</dt>
              <dd className="font-mono text-xs text-right" title={pairing.pairedKeyId}>
                {shortId(pairing.pairedKeyId)}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-base-content/60">Сессия до</dt>
            <dd className="text-xs text-right tabular-nums">{formatExpiresAt(pairing.expiresAt)}</dd>
          </div>
        </dl>

        <div className="modal-action mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" className="btn btn-error btn-sm flex-1" onClick={() => disconnectFromMembrane()}>
            Разорвать связь
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openModePicker()}>
            Режим узла
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => closeLinkedPanel()}>
            Закрыть
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={() => closeLinkedPanel()}>
          закрыть
        </button>
      </form>
    </dialog>
  );
};
