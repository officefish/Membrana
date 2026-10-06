/**
 * Клиент office → media: уборка холодного архива понижения (#2588 b6; ADR-0031 п.4).
 *
 * Дверь media `POST /v1/internal/downgrade-archive/purge-expired {dryRun}` (контракт плана
 * блока 2 v2; реализация двери — b5, здесь только вызов). Ответ зеркалит `PurgeOutcome`
 * media-store (`downgrade-archive.store.ts`): `candidates[]` — «что удалил бы», `purged[]` — что
 * удалено этим вызовом, `refusal` — названный отказ media (например `purge_not_implemented`, пока
 * b5 не влит). Даты в JSON приходят строками.
 *
 * ИСХОДЫ — ЗАКРЫТЫЙ СЛОВАРЬ, не исключения: `ok` · `media-not-configured` (нет MEDIA_API_URL) ·
 * `media-unreachable` (сеть, таймаут, не-JSON) · `media-rejected{status, code}`. Клиент ничего не
 * бросает; cron пишет исход в лог, ручка панели переводит его в HTTP своим кодом.
 *
 * Пара — существующая MEDIA_API_URL/MEDIA_API_TOKEN (умолчание токена — API_INTERNAL_TOKEN, как у
 * `media-snapshot.client.ts`). Наружу — через прокси-обвязку `lib/proxy-fetch` (#1449); подменный
 * транспорт — `@Optional @Inject(COLD_ARCHIVE_SWEEP_FETCH)` (тесты).
 *
 * СЕКРЕТ: токен уходит только заголовком `X-Membrana-Token`; в исходы, лог и тексты — никогда.
 * Сообщения сети санируются от URL/host/IP тем же приёмом, что у клиента кабинета (ревью #2596 P1).
 */
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import { proxyAwareFetch, proxyUrlFrom } from '../../lib/proxy-fetch';

/** Партия-кандидат на удаление — форма `PurgeCandidate` media, даты строками. */
export interface SweepCandidate {
  readonly batchId: string;
  readonly deviceId: string;
  readonly expiresAt: string;
  readonly sampleCount: number;
  readonly frozenBytes: number;
}

export interface SweepReport {
  readonly dryRun: boolean;
  readonly now: string;
  readonly candidates: readonly SweepCandidate[];
  readonly purged: readonly string[];
  readonly refusal: { readonly reason: string; readonly detail?: string } | null;
}

export type SweepOutcome =
  | { readonly kind: 'ok'; readonly report: SweepReport }
  | { readonly kind: 'media-not-configured'; readonly missing: readonly 'MEDIA_API_URL'[] }
  | { readonly kind: 'media-unreachable'; readonly detail: string }
  | { readonly kind: 'media-rejected'; readonly status: number; readonly code: string | null };

export const SWEEP_OUTCOME_KINDS = ['ok', 'media-not-configured', 'media-unreachable', 'media-rejected'] as const;

/** Путь двери media — буква в букву по плану блока 2 v2 (`//design`, b5). */
export const PURGE_EXPIRED_PATH = '/v1/internal/downgrade-archive/purge-expired';

/** Уборка ходит по диску media; минута на вызов — потолок, дальше это уже отказ. */
export const SWEEP_TIMEOUT_MS = 60_000;

export const COLD_ARCHIVE_SWEEP_FETCH = 'COLD_ARCHIVE_SWEEP_FETCH';

export type SweepFetch = (
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<{ status: number; text(): Promise<string> }>;

/** Адрес и ключ media из конфига, или имя недостающей переменной (без значений). */
export function resolveMediaPair(config: Pick<AppConfig, 'MEDIA_API_URL' | 'MEDIA_API_TOKEN' | 'API_INTERNAL_TOKEN'>):
  | { ok: true; baseUrl: string; token: string }
  | { ok: false; missing: 'MEDIA_API_URL'[] } {
  const baseUrl = config.MEDIA_API_URL?.trim().replace(/\/+$/, '') ?? '';
  if (!baseUrl) return { ok: false, missing: ['MEDIA_API_URL'] };
  return { ok: true, baseUrl, token: config.MEDIA_API_TOKEN?.trim() || config.API_INTERNAL_TOKEN };
}

/** Detail сетевого отказа без адресов: класс и сообщение с вырезанными URL, host:port и IPv4:port. */
export function sanitizeNetworkDetail(error: unknown): string {
  if (!(error instanceof Error)) return 'fetch failed';
  const message = error.message
    .replace(/https?:\/\/\S+/giu, '<url>')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/gu, '<host>')
    .replace(/\b[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}(?::\d+)?\b/giu, '<host>');
  return `${error.name}: ${message}`;
}

function refusalCodeFrom(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as { code?: unknown; message?: unknown };
    if (typeof parsed?.code === 'string') return parsed.code;
    return typeof parsed?.message === 'string' ? parsed.message.slice(0, 64) : null;
  } catch {
    return null;
  }
}

@Injectable()
export class ColdArchiveSweepClient {
  private readonly logger = new Logger(ColdArchiveSweepClient.name);
  private readonly fetchImpl: SweepFetch;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Optional() @Inject(COLD_ARCHIVE_SWEEP_FETCH) fetchImpl?: SweepFetch,
  ) {
    this.fetchImpl =
      fetchImpl ?? ((url, init) => proxyAwareFetch(url, init, proxyUrlFrom(this.config)) as unknown as ReturnType<SweepFetch>);
  }

  /** Один вызов двери. `dryRun` в теле всегда явный — умолчания «боевой» у двери нет (P25 плана). */
  async purgeExpired(dryRun: boolean): Promise<SweepOutcome> {
    const pair = resolveMediaPair(this.config);
    if (!pair.ok) return { kind: 'media-not-configured', missing: pair.missing };

    let res: Awaited<ReturnType<SweepFetch>>;
    try {
      res = await this.fetchImpl(`${pair.baseUrl}${PURGE_EXPIRED_PATH}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Membrana-Token': pair.token },
        body: JSON.stringify({ dryRun }),
        signal: AbortSignal.timeout(SWEEP_TIMEOUT_MS),
      });
    } catch (error) {
      const detail = sanitizeNetworkDetail(error);
      this.logger.warn({ dryRun, detail }, 'cold-archive sweep: media unreachable');
      return { kind: 'media-unreachable', detail };
    }

    const text = await res.text().catch(() => '');
    if (res.status < 200 || res.status >= 300) {
      const code = refusalCodeFrom(text);
      this.logger.warn({ dryRun, status: res.status, code }, 'cold-archive sweep: media rejected');
      return { kind: 'media-rejected', status: res.status, code };
    }
    try {
      const report = JSON.parse(text) as SweepReport;
      if (!Array.isArray(report?.candidates) || !Array.isArray(report?.purged)) {
        this.logger.warn({ dryRun, status: res.status }, 'cold-archive sweep: media returned unexpected shape');
        return { kind: 'media-unreachable', detail: 'unexpected report shape from media' };
      }
      return { kind: 'ok', report };
    } catch {
      this.logger.warn({ dryRun, status: res.status }, 'cold-archive sweep: media returned non-JSON body');
      return { kind: 'media-unreachable', detail: 'invalid JSON from media' };
    }
  }
}
