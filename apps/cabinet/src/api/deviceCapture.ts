import { getApiBase } from './auth';

/**
 * CT3 (tariff v2, канон DEVICE_BOARD_SERVER_FIRST.md v2.0 §3):
 * явный захват устройства кабинетом — REST acquire/release.
 */

export type DeviceCaptureMode = 'soft' | 'hard';

export interface DeviceCaptureView {
  deviceId: string;
  mode: DeviceCaptureMode;
  sessionId: string;
  acquiredAt: string;
  expiresAt: string;
  /** CX3: объявленный узлом список сценариев (если узел уже объявил). */
  scenarios?: readonly { readonly id: string; readonly title: string }[];
  /** CX3: выбранный сценарий (элемент scenarios; null при пустом списке). */
  selectedScenarioId?: string | null;
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = sessionStorage.getItem('membrana.cabinet.sessionToken');
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${getApiBase()}${path}`, { ...init, headers });
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (typeof body.message === 'string') return body.message;
  } catch {
    /* ignore */
  }
  return res.statusText || 'Request failed';
}

/**
 * CX2: снапшот активных захватов мембраны — авторитетный bootstrap состояния
 * (кабинет не хранит захваты между размонтированиями разделов).
 */
export async function fetchCaptures(): Promise<{ captures: DeviceCaptureView[] }> {
  const res = await authFetch('/v1/captures');
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { captures: DeviceCaptureView[] };
}

/** Захватить устройство узла (двухшаговая модель: сначала захват, потом run/stop). */
export async function captureDevice(
  nodeId: string,
  mode: DeviceCaptureMode,
): Promise<{ capture: DeviceCaptureView }> {
  const res = await authFetch(`/v1/nodes/${nodeId}/capture`, {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { capture: DeviceCaptureView };
}

/** Отпустить захват. НЕ останавливает играющий сценарий (канон §3). */
export async function releaseDevice(nodeId: string): Promise<{ released: true }> {
  const res = await authFetch(`/v1/nodes/${nodeId}/capture`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { released: true };
}
