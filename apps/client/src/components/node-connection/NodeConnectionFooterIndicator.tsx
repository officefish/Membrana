import React, { useEffect, useState } from 'react';

import { pingMediaApi } from '../../api/pairing';
import { shortId } from '../../lib/pairingDisplay';
import { getNodeRealtimeClient, type NodeRealtimeClientState } from '@/lib/nodeRealtimeClient';
import { useNodeConnectionStore } from '../../stores/nodeConnectionStore';

export interface NodeConnectionFooterIndicatorProps {
  compact?: boolean;
}

export const NodeConnectionFooterIndicator: React.FC<NodeConnectionFooterIndicatorProps> = ({
  compact = false,
}) => {
  const mode = useNodeConnectionStore((s) => s.mode);
  const pairing = useNodeConnectionStore((s) => s.pairing);
  const openConnectionSettings = useNodeConnectionStore((s) => s.openConnectionSettings);
  const openModePicker = useNodeConnectionStore((s) => s.openModePicker);
  const [linkOk, setLinkOk] = useState<boolean | null>(null);
  const [wsState, setWsState] = useState<NodeRealtimeClientState>('disconnected');

  useEffect(() => {
    if (mode !== 'paired') {
      setWsState('disconnected');
      return;
    }
    const client = getNodeRealtimeClient();
    setWsState(client.getState());
    return client.subscribeState(setWsState);
  }, [mode, pairing?.deviceId]);

  useEffect(() => {
    if (mode !== 'paired' || !pairing) {
      setLinkOk(null);
      return;
    }

    let cancelled = false;

    const checkMedia = async (): Promise<void> => {
      const mediaOk = await pingMediaApi(pairing.mediaApiUrl, pairing.mediaToken, pairing.deviceId);
      if (!cancelled) setLinkOk(mediaOk);
    };

    void checkMedia();
    const timer = window.setInterval(() => void checkMedia(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mode, pairing]);

  if (mode === null) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-xs h-6 min-h-6 px-2 text-[10px]"
        onClick={() => openModePicker()}
      >
        выбрать режим
      </button>
    );
  }

  if (mode === 'autonomous') {
    if (compact) {
      return (
        <span
          className="shrink-0 rounded bg-warning/15 px-1.5 py-0.5 text-[9px] font-medium text-warning"
          title="Узел работает автономно — данные только локально"
        >
          автономно
        </span>
      );
    }
    return (
      <div className="alert alert-warning py-1 px-2 text-[10px] leading-snug" role="status">
        <span>Узел работает автономно — данные только локально, кабинет не используется.</span>
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => openModePicker()}>
          сменить
        </button>
      </div>
    );
  }

  const label = pairing?.nodeLabel ?? 'связан';
  const status = linkOk === null ? '…' : linkOk ? 'online' : 'offline';
  const wsLabel =
    wsState === 'connected' ? 'ws' : wsState === 'reconnecting' ? 'ws…' : 'rest';
  // NB1: deviceId сопряжения виден постоянно (короткий в строке, полный в title) —
  // чтобы «с каким устройством связан узел» не требовало открывать модалку.
  const deviceShort = pairing ? shortId(pairing.deviceId) : null;
  const titleFull = `Связан с мембраной · ${label} · ${status} · ${wsLabel}${
    pairing ? ` · device ${pairing.deviceId}` : ''
  }`;

  if (compact) {
    return (
      <button
        type="button"
        className={`shrink-0 text-[9px] tabular-nums underline-offset-2 hover:underline ${
          linkOk === false ? 'text-warning' : 'text-base-content/45'
        }`}
        title={titleFull}
        onClick={() => openConnectionSettings()}
      >
        {linkOk === false ? 'связь?' : 'связан'}
        {deviceShort ? <span className="font-mono"> {deviceShort}</span> : null}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-[10px] text-base-content/55" role="status" title={titleFull}>
      <span>
        Связан: {label}
        {deviceShort ? (
          <>
            {' · '}
            <span className="font-mono text-primary/80">{deviceShort}</span>
          </>
        ) : null}
        {' · '}
        {status} · {wsLabel}
      </span>
      <button type="button" className="btn btn-ghost btn-xs" onClick={() => openConnectionSettings()}>
        связь
      </button>
    </div>
  );
};
