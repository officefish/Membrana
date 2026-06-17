import { getApiBase } from '@/api/auth';

const REALTIME_PATH = '/v1/nodes/realtime';

/** Cabinet HTTP API base → WebSocket URL for Node Realtime Gateway. */
export function getCabinetRealtimeWsUrl(): string {
  const httpBase = getApiBase();
  const url = new URL(httpBase, window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = REALTIME_PATH;
  url.search = '';
  return url.toString();
}
