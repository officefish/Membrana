/** Отправляет паспорт журнального прогона в существующий дом результатов office. */
import { Injectable, Logger } from '@nestjs/common';
import type { RunRecord } from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };
import { ProxyAgent } from 'undici';

import type { CabinetConfigWithOffice, OfficeEnv } from '../../../config/office-env.schema';

export const JOURNAL_RESULTS_OUTCOMES = [
  'sent',
  'office-not-configured',
  'office-unreachable',
  'office-rejected',
] as const;

export type JournalResultsOutcomeKind = (typeof JOURNAL_RESULTS_OUTCOMES)[number];

export interface JournalResultsOutcome {
  readonly outcome: JournalResultsOutcomeKind;
  readonly runId: string;
  readonly attempts: number;
  readonly status?: number;
  readonly reason?: string;
}

export type JournalResultsFetch = (url: string, init: RequestInit & { dispatcher?: ProxyAgent }) => Promise<Response>;

export const PLUGIN_RESULTS_RUNS_PATH = '/plugin-results/runs';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 2;
const REASON_LIMIT = 300;

function proxyUrl(): string | null {
  const value = (process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '').trim();
  return value.length > 0 ? value : null;
}

@Injectable()
export class JournalResultsBridgeService {
  private readonly logger = new Logger(JournalResultsBridgeService.name);
  private readonly fetchImpl: JournalResultsFetch;
  private officeProxyAgent: ProxyAgent | null | undefined;

  constructor(
    private readonly config: CabinetConfigWithOffice,
    fetchImpl?: JournalResultsFetch,
  ) {
    this.fetchImpl = fetchImpl ?? ((url, init) => fetch(url, init));
  }

  async send(run: RunRecord): Promise<JournalResultsOutcome> {
    const runId = run.address.runId;
    const office = this.config.office;
    if (office === null) {
      const outcome: JournalResultsOutcome = {
        outcome: 'office-not-configured',
        runId,
        attempts: 0,
        reason: 'OFFICE_URL / OFFICE_API_TOKEN не заданы',
      };
      this.logger.warn({ ...outcome, pluginId: run.address.pluginId }, 'journal results bridge: провода нет');
      return outcome;
    }

    let last: JournalResultsOutcome = { outcome: 'office-unreachable', runId, attempts: 0 };
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await this.officeFetch(office, run);
        if (response.ok) {
          const outcome: JournalResultsOutcome = {
            outcome: 'sent',
            runId,
            attempts: attempt,
            status: response.status,
          };
          this.logger.log({ ...outcome, pluginId: run.address.pluginId }, 'journal RunRecord доставлен в office');
          return outcome;
        }
        last = {
          outcome: 'office-rejected',
          runId,
          attempts: attempt,
          status: response.status,
          reason: (await response.text().catch(() => '')).slice(0, REASON_LIMIT),
        };
        break;
      } catch (error) {
        last = {
          outcome: 'office-unreachable',
          runId,
          attempts: attempt,
          reason: String((error as Error)?.message ?? error).slice(0, REASON_LIMIT),
        };
      }
    }
    this.logger.error({ ...last, pluginId: run.address.pluginId }, 'journal RunRecord НЕ доставлен в office');
    return last;
  }

  private officeFetch(office: OfficeEnv, run: RunRecord): Promise<Response> {
    const request: RequestInit & { dispatcher?: ProxyAgent } = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-membrana-token': office.token,
      },
      body: JSON.stringify({ run }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    };
    const dispatcher = this.officeDispatcher();
    if (dispatcher) request.dispatcher = dispatcher;
    return this.fetchImpl(`${office.url.replace(/\/+$/, '')}${PLUGIN_RESULTS_RUNS_PATH}`, request);
  }

  private officeDispatcher(): ProxyAgent | null {
    const url = proxyUrl();
    if (!url) return null;
    this.officeProxyAgent ??= new ProxyAgent(url);
    return this.officeProxyAgent;
  }
}
