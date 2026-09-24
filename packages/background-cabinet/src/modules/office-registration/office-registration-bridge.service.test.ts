import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  OFFICE_REGISTRATION_CONSUME_PATH,
  OFFICE_REGISTRATION_TIMEOUT_MS,
  OfficeRegistrationBridgeService,
  type RegistrationRefusalReason,
} from './index';
import type { CabinetConfigWithOffice } from '../../config/office-env.schema';

const CONFIG: CabinetConfigWithOffice = {
  office: { url: 'https://office.test///', token: 'shared-office-token' },
} as CabinetConfigWithOffice;

const NO_OFFICE_CONFIG: CabinetConfigWithOffice = { office: null } as CabinetConfigWithOffice;

const reasons: RegistrationRefusalReason[] = [
  'not_found',
  'revoked',
  'expired',
  'grant_mismatch',
  'exhausted',
];

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `HTTP ${status}`,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

function captureFetch(response: Response | (() => Promise<Response>)) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fake = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return typeof response === 'function' ? response() : response;
  });
  vi.stubGlobal('fetch', fake);
  return { calls, fake };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OfficeRegistrationBridgeService.redeemRegistrationCode', () => {
  it('200 -> ok; request uses trimmed base, JSON headers, token header and redeem mode', async () => {
    const { calls } = captureFetch(
      jsonResponse(200, { ok: true, redeemedAt: '2026-09-22T00:00:00Z' }),
    );
    const service = new OfficeRegistrationBridgeService(CONFIG);

    await expect(service.redeemRegistrationCode('CODE-1')).resolves.toEqual({
      kind: 'ok',
      payload: { ok: true, redeemedAt: '2026-09-22T00:00:00Z' },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(`https://office.test${OFFICE_REGISTRATION_CONSUME_PATH}`);
    expect(calls[0]!.init.method).toBe('POST');
    expect(calls[0]!.init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Membrana-Token': 'shared-office-token',
    });
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ code: 'CODE-1', mode: 'redeem' });
    expect(calls[0]!.init.signal).toBeInstanceOf(AbortSignal);
  });

  it('201 -> ok: любой 2xx — успех (прод 24.09: дверь отвечала 201, код сгорел впустую)', async () => {
    captureFetch(jsonResponse(201, { ok: true, redeemedAt: '2026-09-24T12:57:29Z' }));
    const service = new OfficeRegistrationBridgeService(CONFIG);
    await expect(service.redeemRegistrationCode('CODE-1')).resolves.toEqual({
      kind: 'ok',
      payload: { ok: true, redeemedAt: '2026-09-24T12:57:29Z' },
    });
  });

  it('204 -> ok даже без тела', async () => {
    captureFetch(jsonResponse(204, null));
    const service = new OfficeRegistrationBridgeService(CONFIG);
    await expect(service.redeemRegistrationCode('CODE-1')).resolves.toEqual({
      kind: 'ok',
      payload: null,
    });
  });

  it('300 -> office-unavailable: край 2xx не размыт', async () => {
    captureFetch(jsonResponse(300, {}));
    const service = new OfficeRegistrationBridgeService(CONFIG);
    await expect(service.redeemRegistrationCode('CODE-1')).resolves.toEqual({
      kind: 'office-unavailable',
      detail: 'office returned 300',
    });
  });

  it.each(reasons)('409 %s -> refused with the exact reason', async (reason) => {
    captureFetch(jsonResponse(409, { ok: false, reason }));
    const service = new OfficeRegistrationBridgeService(CONFIG);
    await expect(service.redeemRegistrationCode('CODE-1')).resolves.toEqual({
      kind: 'refused',
      reason,
    });
  });

  it('401 -> config-invalid', async () => {
    captureFetch(jsonResponse(401, { ok: false }));
    const service = new OfficeRegistrationBridgeService(CONFIG);
    await expect(service.redeemRegistrationCode('CODE-1')).resolves.toMatchObject({
      kind: 'config-invalid',
    });
  });

  it('network failure -> office-unavailable', async () => {
    captureFetch(async () => {
      throw new TypeError('fetch failed');
    });
    const service = new OfficeRegistrationBridgeService(CONFIG);
    await expect(service.redeemRegistrationCode('CODE-1')).resolves.toMatchObject({
      kind: 'office-unavailable',
      detail: expect.stringContaining('fetch failed'),
    });
  });

  it('timeout -> office-unavailable and keeps the 5000 ms contract', async () => {
    expect(OFFICE_REGISTRATION_TIMEOUT_MS).toBe(5_000);
    captureFetch(async () => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    });
    const service = new OfficeRegistrationBridgeService(CONFIG);
    await expect(service.redeemRegistrationCode('CODE-1')).resolves.toMatchObject({
      kind: 'office-unavailable',
      detail: expect.stringContaining('AbortError'),
    });
  });

  it('missing pair -> config-invalid without a network call', async () => {
    const { fake } = captureFetch(jsonResponse(200, { ok: true }));
    const service = new OfficeRegistrationBridgeService(NO_OFFICE_CONFIG);
    await expect(service.redeemRegistrationCode('CODE-1')).resolves.toMatchObject({
      kind: 'config-invalid',
    });
    expect(fake).not.toHaveBeenCalled();
  });
});

describe('OfficeRegistrationBridgeService.probeOfficeConfig', () => {
  it('409 not_found in check mode -> ok', async () => {
    const { calls } = captureFetch(jsonResponse(409, { ok: false, reason: 'not_found' }));
    const service = new OfficeRegistrationBridgeService(CONFIG);
    await expect(service.probeOfficeConfig()).resolves.toEqual({ kind: 'ok' });
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      code: expect.stringContaining('health'),
      mode: 'check',
    });
  });

  it('401 during probe -> config-invalid', async () => {
    captureFetch(jsonResponse(401, { ok: false }));
    const service = new OfficeRegistrationBridgeService(CONFIG);
    await expect(service.probeOfficeConfig()).resolves.toMatchObject({ kind: 'config-invalid' });
  });

  it('network failure during probe -> office-unavailable', async () => {
    captureFetch(async () => {
      throw new TypeError('fetch failed');
    });
    const service = new OfficeRegistrationBridgeService(CONFIG);
    await expect(service.probeOfficeConfig()).resolves.toMatchObject({
      kind: 'office-unavailable',
    });
  });
});
