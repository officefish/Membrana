import { getCabinetApiBase } from '@/api/pairing';

const REALTIME_PATH = '/v1/nodes/realtime';

/** HTTP cabinet base → WebSocket URL for Node Realtime Gateway. */
export function getCabinetRealtimeWsUrl(): string {
  const httpBase = getCabinetApiBase();
  const url = new URL(httpBase);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = REALTIME_PATH;
  url.search = '';
  return url.toString();
}
