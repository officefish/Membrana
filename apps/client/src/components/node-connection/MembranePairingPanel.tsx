import React, { useState } from 'react';

import { pairResponseToCredentials } from '../../api/pairingCredentials';
import { pairWithAccessKey } from '../../api/pairing';
import { reconfigureMediaLibraryFromConnection } from '../../lib/mediaLibraryHubBridge';
import { useNodeConnectionStore } from '../../stores/nodeConnectionStore';

export const MembranePairingPanel: React.FC = () => {
  const showPairingPanel = useNodeConnectionStore((s) => s.showPairingPanel);
  const closePairingPanel = useNodeConnectionStore((s) => s.closePairingPanel);
  const applyPairing = useNodeConnectionStore((s) => s.applyPairing);
  const openModePicker = useNodeConnectionStore((s) => s.openModePicker);
  const reportConnectionError = useNodeConnectionStore((s) => s.reportConnectionError);

  const [accessKey, setAccessKey] = useState('');
  const [clientLabel, setClientLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!showPairingPanel) return null;

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await pairWithAccessKey(accessKey, clientLabel || undefined);
      const credentials = pairResponseToCredentials(result);
      applyPairing(credentials);
      void reconfigureMediaLibraryFromConnection('paired', credentials);
      setAccessKey('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pairing failed';
      if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')) {
        reportConnectionError(message);
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog className="modal modal-open" open aria-labelledby="pairing-title">
      <div className="modal-box max-w-lg">
        <h3 id="pairing-title" className="text-lg font-bold">
          Связь с мембраной
        </h3>
        <p className="mt-2 text-sm text-base-content/70">
          Вставьте ключ доступа из кабинета (cabinet.membrana.space → Узлы → создать ключ).
        </p>
        <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => void onSubmit(e)}>
          <label className="form-control w-full">
            <span className="label-text text-xs">Ключ доступа</span>
            <input
              className="input input-bordered input-sm w-full font-mono"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="Вставьте ключ…"
              required
              autoComplete="off"
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text text-xs">Метка клиента (необязательно)</span>
            <input
              className="input input-bordered input-sm w-full"
              value={clientLabel}
              onChange={(e) => setClientLabel(e.target.value)}
              placeholder="Полевой ПК №1"
            />
          </label>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <div className="modal-action mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openModePicker()}>
              Назад
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => closePairingPanel()}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !accessKey.trim()}>
              {busy ? 'Подключение…' : 'Подключить'}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={() => closePairingPanel()}>
          закрыть
        </button>
      </form>
    </dialog>
  );
};
