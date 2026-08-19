/**
 * Отправитель моста media → office (блок b3 спринта `plugin-results-bridge`, #1961;
 * форма — `docs/plugins/results-bridge-form.md`).
 *
 * Media результат НЕ хранит и в Mongo офиса НЕ ходит: один `POST` RunRecord в модуль
 * `plugin-results` офиса под ключом класса `X-Membrana-Token` — тем же, каким office зовёт media.
 * Исход — закрытым словарём, именем, не исключением: сид `onResult` внутри `execute`, и бросок
 * оттуда уронил бы прогон, который уже состоялся и измерен.
 *
 * Повторов-до-бесконечности нет: одна попытка и одна повторная на `office-unreachable`
 * (сеть/таймаут), дальше — отказ в лог с `runId`. Буфера нет — мост не очередь (та же линия,
 * что у M4: выключенный плагин живой сигнал теряет). Потерянный результат воспроизводим:
 * прогон детерминирован, `request` повторяется; повтор у дома идемпотентен (upsert по адресу).
 *
 * Без `OFFICE_API_URL`/`OFFICE_API_TOKEN` сервис стартует, мост отвечает `office-not-configured`:
 * «провода нет» — состояние названное, а не тихий лог под видом отправки.
 */
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { RunRecord, StateRecord } from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };
import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';

export const BRIDGE_OUTCOMES = ['sent', 'office-not-configured', 'office-unreachable', 'office-rejected'] as const;
export type BridgeOutcomeKind = (typeof BRIDGE_OUTCOMES)[number];

export interface BridgeOutcome {
  readonly outcome: BridgeOutcomeKind;
  readonly runId: string;
  /** Попыток сделано: 0 при `office-not-configured`, 1..2 иначе. */
  readonly attempts: number;
  /** HTTP-статус ответа офиса, если ответ был. */
  readonly status?: number;
  /** Причина словами: текст ошибки сети либо тело отказа офиса (обрезано). */
  readonly reason?: string;
}

/** Транспорт подменяем в зубах: fetch приходит параметром, часов и сети в ядре нет. */
export type BridgeFetch = (url: string, init: RequestInit) => Promise<Response>;

export const PLUGIN_RESULTS_RUNS_PATH = '/plugin-results/runs';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 2;
const REASON_LIMIT = 300;

@Injectable()
export class PluginResultsBridgeService {
  private readonly logger = new Logger(PluginResultsBridgeService.name);
  private readonly fetchImpl: BridgeFetch;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig, @Optional() fetchImpl?: BridgeFetch) {
    this.fetchImpl = fetchImpl ?? ((url, init) => fetch(url, init));
  }

  /** Настроен ли мост: обе переменные, без них — `office-not-configured`. */
  get configured(): boolean {
    return Boolean(this.config.OFFICE_API_URL && this.config.OFFICE_API_TOKEN);
  }

  async send(run: RunRecord, state?: StateRecord): Promise<BridgeOutcome> {
    const runId = run.address.runId;
    if (!this.configured) {
      const outcome: BridgeOutcome = { outcome: 'office-not-configured', runId, attempts: 0, reason: 'OFFICE_API_URL / OFFICE_API_TOKEN не заданы' };
      this.logger.warn({ ...outcome, pluginId: run.address.pluginId }, 'plugin-results bridge: провода нет, результат остаётся в логе');
      return outcome;
    }
    const url = `${this.config.OFFICE_API_URL!.replace(/\/+$/, '')}${PLUGIN_RESULTS_RUNS_PATH}`;
    const body = JSON.stringify({ run, ...(state ? { state } : {}) });
    let last: BridgeOutcome = { outcome: 'office-unreachable', runId, attempts: 0 };
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const res = await this.fetchImpl(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-membrana-token': this.config.OFFICE_API_TOKEN! },
          body,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (res.ok) {
          const outcome: BridgeOutcome = { outcome: 'sent', runId, attempts: attempt, status: res.status };
          this.logger.log({ ...outcome, pluginId: run.address.pluginId }, 'plugin-results bridge: RunRecord доставлен в office');
          return outcome;
        }
        // Отказ офиса — не сетевой: повтор даст тот же ответ, одной попытки достаточно.
        const text = (await res.text().catch(() => '')).slice(0, REASON_LIMIT);
        last = { outcome: 'office-rejected', runId, attempts: attempt, status: res.status, reason: text };
        break;
      } catch (error) {
        last = { outcome: 'office-unreachable', runId, attempts: attempt, reason: String((error as Error)?.message ?? error).slice(0, REASON_LIMIT) };
      }
    }
    this.logger.error({ ...last, pluginId: run.address.pluginId }, 'plugin-results bridge: RunRecord НЕ доставлен');
    return last;
  }
}
