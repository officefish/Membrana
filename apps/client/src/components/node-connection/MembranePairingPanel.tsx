import React, { useState } from 'react';

import { pairResponseToCredentials } from '../../api/pairingCredentials';
import { pairWithAccessKey } from '../../api/pairing';
import { normalizeAccessKey, readClipboardText } from '../../lib/clipboardText';
import { classifyConnectionFailure } from '../../lib/connection-fallback/classify';
import { reconfigureMediaLibraryFromConnection } from '../../lib/mediaLibraryHubBridge';
import { useNodeConnectionStore } from '../../stores/nodeConnectionStore';
import { NodeRebindStepsNote } from './NodeRebindStepsNote';

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

  const key = normalizeAccessKey(accessKey);

  /** Кнопка внутри поля: буфер → поле (без пробелов и переводов строк); отказ — фраза в окне. */
  const onPasteFromClipboard = async (): Promise<void> => {
    setError(null);
    try {
      const text = normalizeAccessKey(await readClipboardText());
      if (!text) {
        setError('Буфер обмена пуст — скопируйте ключ в кабинете ещё раз.');
        return;
      }
      setAccessKey(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось прочитать буфер обмена.');
    }
  };

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await pairWithAccessKey(key, clientLabel || undefined);
      const credentials = pairResponseToCredentials(result);
      applyPairing(credentials);
      void reconfigureMediaLibraryFromConnection('paired', credentials);
      setAccessKey('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pairing failed';
      if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')) {
        // #2540: тот же классификатор и та же воронка стора, что у опроса кабинета.
        reportConnectionError(classifyConnectionFailure(err, 'pairing'));
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
        {/* #2461: ключ доступа перевязывает ТОЛЬКО Студию. Второе действие названо здесь же,
            иначе человек уходит с уверенностью, что прибор перевязан, а пробы не уезжают никуда. */}
        <NodeRebindStepsNote />
        <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => void onSubmit(e)}>
          <label className="form-control w-full">
            <span className="label-text text-xs">Ключ доступа</span>
            <div className="relative">
              <input
                className="input input-bordered input-sm w-full pr-24 font-mono"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="Вставьте ключ…"
                required
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="btn btn-ghost btn-xs absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => void onPasteFromClipboard()}
                disabled={busy}
                aria-label="Вставить ключ из буфера обмена"
                data-paste-access-key
              >
                Вставить
              </button>
            </div>
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
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !key}>
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
