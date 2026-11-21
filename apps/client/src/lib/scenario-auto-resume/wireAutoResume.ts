/**
 * Проводка возобновления сценария (ADR-0033) на настоящих носителях клиента: единый runtime
 * контроллера, realtime-клиент, `/quota` сервера записей, стор захвата. Логика — в
 * `autoResumeOnStart.ts` / `decide.ts` (зубы там); здесь только связи.
 */
import { resolveMediaApiBase } from '@/api/pairing';
import { getDeviceBoardRuntimeController } from '@/lib/deviceBoardRuntimeController';
import { writeElectronShellLog } from '@/lib/electronShellLogPort';
import { getNodeRealtimeClient } from '@/lib/nodeRealtimeClient';
import { readPersistedPairedCredentials } from '@/lib/resolveMediaLibraryBackend';
import { useServerFirstStore } from '@/stores/serverFirstStore';

import { runAutoResumeOnStart, type AutoResumeOutcome } from './autoResumeOnStart';
import type { CaptureAtStart } from './decide';
import { createRunMarkTracker, readLastKnownFlag, readRunMark, writeLastKnownFlag } from './runMark';

const START_CONFIRM_TIMEOUT_MS = 5_000;

let trackerInstalled = false;
let ranThisSession = false;
let lastOutcome: AutoResumeOutcome | null = null;
const outcomeListeners = new Set<(o: AutoResumeOutcome) => void>();

/** Отметка «шёл» следит за единым runtime с первого сопряжённого кадра (один раз на процесс). */
export function installRunMarkTracker(): void {
  if (trackerInstalled) return;
  trackerInstalled = true;
  const controller = getDeviceBoardRuntimeController();
  const track = createRunMarkTracker(() => getNodeRealtimeClient().getDeviceId() ?? readPersistedPairedCredentials()?.deviceId ?? null);
  controller.subscribe(track);
}

async function fetchFlag(): Promise<boolean | null> {
  const creds = readPersistedPairedCredentials();
  if (!creds) return null;
  const res = await fetch(`${resolveMediaApiBase(creds.mediaApiUrl)}/v1/devices/${encodeURIComponent(creds.deviceId)}/quota`, {
    headers: { 'X-Membrana-Token': creds.mediaToken, 'X-Membrana-Device-Id': creds.deviceId },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { scenarioAutoResume?: unknown };
  return body.scenarioAutoResume === true;
}

function waitConnected(timeoutMs: number): Promise<boolean> {
  const client = getNodeRealtimeClient();
  if (client.getState() === 'connected') return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, timeoutMs);
    const unsubscribe = client.subscribeState((state) => {
      if (state !== 'connected') return;
      window.clearTimeout(timer);
      unsubscribe();
      resolve(true);
    });
  });
}

/** После рестарта узел снимка захвата не получает (21.11): пустой стор — «неизвестно», не «нет». */
function captureAtStart(): CaptureAtStart {
  const capture = useServerFirstStore.getState().capture;
  if (capture === null) return 'unknown';
  return capture.mode === 'hard' ? 'hard' : 'soft';
}

async function startAndConfirm(): Promise<boolean> {
  const controller = getDeviceBoardRuntimeController();
  await controller.start();
  if (controller.getState().isRunning) return true;
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, START_CONFIRM_TIMEOUT_MS);
    const unsubscribe = controller.subscribe((state) => {
      if (!state.isRunning) return;
      window.clearTimeout(timer);
      unsubscribe();
      resolve(true);
    });
  });
}

/** Один прогон возобновления на запуск приложения; повторные вызовы — без действия. */
export function runScenarioAutoResumeOnce(): void {
  if (ranThisSession) return;
  ranThisSession = true;
  const creds = readPersistedPairedCredentials();
  void runAutoResumeOnStart({
    deviceId: creds?.deviceId ?? null,
    paired: creds !== null,
    readRunMark,
    fetchFlag,
    readLastKnownFlag,
    writeLastKnownFlag,
    waitConnected,
    captureAtStart,
    start: startAndConfirm,
  }).then((outcome) => {
    lastOutcome = outcome;
    if (outcome.kind === 'started') writeElectronShellLog('info', '[auto-resume] scenario resumed on start');
    else if (outcome.kind === 'failed' || !outcome.silent) writeElectronShellLog('warn', `[auto-resume] ${outcome.text}`);
    for (const listener of outcomeListeners) listener(outcome);
  });
}

export function subscribeAutoResumeOutcome(listener: (o: AutoResumeOutcome) => void): () => void {
  outcomeListeners.add(listener);
  if (lastOutcome) listener(lastOutcome);
  return () => {
    outcomeListeners.delete(listener);
  };
}
