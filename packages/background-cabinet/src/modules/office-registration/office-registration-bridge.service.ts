import { Inject, Injectable } from '@nestjs/common';
import { ProxyAgent } from 'undici';

import { APP_CONFIG } from '../../config/config.tokens';
import type { CabinetConfigWithOffice, OfficeEnv } from '../../config/office-env.schema';
import {
  OFFICE_REGISTRATION_CONSUME_PATH,
  OFFICE_REGISTRATION_TIMEOUT_MS,
  type ConfigProbeOutcome,
  type RegistrationCodeMode,
  type RegistrationOutcome,
  isRegistrationRefusalReason,
} from './modes';

type OfficeConsumeBody = {
  code: string;
  mode: RegistrationCodeMode;
};

type OfficeRequestInit = RequestInit & {
  dispatcher?: ProxyAgent;
};

function resolveProxyUrl(): string | null {
  const raw = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  const proxyUrl = raw.trim();
  return proxyUrl.length > 0 ? proxyUrl : null;
}

@Injectable()
export class OfficeRegistrationBridgeService {
  private officeProxyAgent: ProxyAgent | null | undefined;

  constructor(@Inject(APP_CONFIG) private readonly config: CabinetConfigWithOffice) {}

  async redeemRegistrationCode(code: string): Promise<RegistrationOutcome> {
    const office = this.config.office;
    if (office === null) {
      return { kind: 'config-invalid', detail: 'OFFICE_URL/OFFICE_API_TOKEN pair is not configured' };
    }
    const res = await this.consume(office, { code, mode: 'redeem' });
    return this.mapRedeemResponse(res);
  }

  async probeOfficeConfig(): Promise<ConfigProbeOutcome> {
    const office = this.config.office;
    if (office === null) {
      return { kind: 'config-invalid', detail: 'OFFICE_URL/OFFICE_API_TOKEN pair is not configured' };
    }
    const res = await this.consume(office, {
      code: `health-${Date.now()}-missing-registration-code`,
      mode: 'check',
    });
    return this.mapProbeResponse(res);
  }

  private async consume(
    office: OfficeEnv,
    body: OfficeConsumeBody,
  ): Promise<Response | { kind: 'transport-error'; detail: string }> {
    try {
      return await this.officeFetch(office, OFFICE_REGISTRATION_CONSUME_PATH, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch (error) {
      return { kind: 'transport-error', detail: this.errorDetail(error) };
    }
  }

  /**
   * Единственный исходящий вызов модуля офиса. Носитель ключа — `OFFICE_API_TOKEN`,
   * значение переносит владелец; код его не печатает и не синхронизирует.
   */
  private async officeFetch(office: OfficeEnv, path: string, init: RequestInit): Promise<Response> {
    const request: OfficeRequestInit = {
      ...init,
      headers: this.officeHeaders(office),
      signal: AbortSignal.timeout(OFFICE_REGISTRATION_TIMEOUT_MS),
    };
    const dispatcher = this.officeDispatcher();
    if (dispatcher) request.dispatcher = dispatcher;
    return fetch(`${this.officeBase(office)}${path}`, request);
  }

  private officeDispatcher(): ProxyAgent | null {
    const proxyUrl = resolveProxyUrl();
    if (!proxyUrl) return null;
    this.officeProxyAgent ??= new ProxyAgent(proxyUrl);
    return this.officeProxyAgent;
  }

  private officeHeaders(office: OfficeEnv): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Membrana-Token': office.token,
    };
  }

  private officeBase(office: OfficeEnv): string {
    return office.url.replace(/\/+$/, '');
  }

  private async mapRedeemResponse(
    res: Response | { kind: 'transport-error'; detail: string },
  ): Promise<RegistrationOutcome> {
    if ('kind' in res) return { kind: 'office-unavailable', detail: res.detail };
    if (res.status === 200) return { kind: 'ok', payload: await this.safeJson(res) };
    if (res.status === 409) {
      const body = await this.safeJson(res);
      if (isRegistrationRefusalReason(body?.reason)) {
        return { kind: 'refused', reason: body.reason };
      }
      return { kind: 'office-unavailable', detail: `office refused with unknown reason (${String(body?.reason)})` };
    }
    if (res.status === 401 || res.status === 403) {
      return { kind: 'config-invalid', detail: `office returned ${res.status}` };
    }
    return { kind: 'office-unavailable', detail: `office returned ${res.status}` };
  }

  private async mapProbeResponse(
    res: Response | { kind: 'transport-error'; detail: string },
  ): Promise<ConfigProbeOutcome> {
    if ('kind' in res) return { kind: 'office-unavailable', detail: res.detail };
    if (res.status === 409) {
      const body = await this.safeJson(res);
      if (body?.reason === 'not_found') return { kind: 'ok' };
      return { kind: 'office-unavailable', detail: `office probe refused with ${String(body?.reason)}` };
    }
    if (res.status === 401 || res.status === 403) {
      return { kind: 'config-invalid', detail: `office returned ${res.status}` };
    }
    if (res.status === 200) return { kind: 'ok' };
    return { kind: 'office-unavailable', detail: `office returned ${res.status}` };
  }

  private async safeJson(res: Response): Promise<Record<string, unknown> | null> {
    return (await res.json().catch(() => null)) as Record<string, unknown> | null;
  }

  private errorDetail(error: unknown): string {
    if (error instanceof Error) return `${error.name}: ${error.message}`;
    return String(error);
  }
}
