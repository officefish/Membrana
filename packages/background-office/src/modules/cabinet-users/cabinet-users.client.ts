/**
 * Клиент office → кабинет: служебная дверь `/v1/internal/office/membranes` (#2588 b3; ADR-0031 п.3).
 *
 * Office НЕ знает пользователей кабинета (раздел «Пользователи» панели — операторы панели в JSON-файле);
 * список мембран и срок архива живут в кабинете, office — только экран. Контракт двери зафиксирован
 * PR #2595 (b2) и здесь не переопределяется: два маршрута, минимум полей, отдельный ключ.
 *
 * ПАРА ENV: `CABINET_API_URL` (на проде — публичный адрес кабинета: Caddy отдаёт `/v1/*` в 3020 без
 * исключений, факт сервера 05.10) и `CABINET_OFFICE_TOKEN` — тот же ключ, что в env кабинета.
 * Умолчаний с адресом в коде нет: нет пары — исход `cabinet-not-configured`, а не вызов «куда-нибудь».
 *
 * ИСХОДЫ — ЗАКРЫТЫЙ СЛОВАРЬ, не исключения: `ok` · `cabinet-not-configured` · `cabinet-unreachable`
 * (сеть, таймаут, не-JSON) · `cabinet-rejected{status, code}` (4xx/5xx кабинета с его кодом отказа).
 * Ручки панели переводят их в HTTP сами; клиент ничего не бросает.
 *
 * Наружу office ходит через прокси-переменные среды — тем же `proxyAwareFetch`, что GitHub и
 * panel-auth (#1449: голый fetch не видит HTTPS_PROXY). Подмена fetch — через конструктор (тесты).
 *
 * СЕКРЕТ: токен уходит только заголовком `X-Membrana-Token`; в исходы, лог и тексты ошибок не попадает
 * (зуб-сторож в `cabinet-users.controller.test.ts`).
 */
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import { proxyAwareFetch, proxyUrlFrom } from '../../lib/proxy-fetch';

/** Элемент списка — форма ответа двери кабинета (PR #2595), как есть. */
export interface CabinetMembraneItem {
  readonly membraneId: string;
  readonly userId: string;
  readonly displayLabel: string;
  readonly tariffId: string;
  readonly retentionDays: number;
  readonly isDefault: boolean;
  readonly createdAt: string;
}

export interface CabinetMembranesPage {
  readonly items: readonly CabinetMembraneItem[];
  readonly nextCursor: string | null;
}

export interface CabinetRetentionResult {
  readonly membraneId: string;
  readonly retentionDays: number;
  readonly isDefault: false;
  readonly updatedAt: string;
  readonly updatedBy: string;
}

export type CabinetOutcome<T> =
  | { readonly kind: 'ok'; readonly data: T }
  | { readonly kind: 'cabinet-not-configured'; readonly missing: readonly ('CABINET_API_URL' | 'CABINET_OFFICE_TOKEN')[] }
  | { readonly kind: 'cabinet-unreachable'; readonly detail: string }
  | { readonly kind: 'cabinet-rejected'; readonly status: number; readonly code: string | null };

export const CABINET_OUTCOME_KINDS = ['ok', 'cabinet-not-configured', 'cabinet-unreachable', 'cabinet-rejected'] as const;

/** Путь двери кабинета — буква в букву по контроллеру b2 (`OFFICE_USERS_ROUTE_PREFIX`). */
export const CABINET_MEMBRANES_PATH = '/v1/internal/office/membranes';

/** Таймаут одного вызова: панель владельца ждёт ответа интерактивно, минута — уже отказ. */
export const CABINET_TIMEOUT_MS = 10_000;

/** DI-токен подменного fetch (тесты); по умолчанию — `proxyAwareFetch` с прокси из конфига. */
export const CABINET_FETCH = 'CABINET_FETCH';

export type CabinetFetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal }) => Promise<{
  status: number;
  text(): Promise<string>;
}>;

/** Пара env → адрес и ключ, или список недостающих имён (без значений). */
export function resolveCabinetPair(config: Pick<AppConfig, 'CABINET_API_URL' | 'CABINET_OFFICE_TOKEN'>):
  | { ok: true; baseUrl: string; token: string }
  | { ok: false; missing: ('CABINET_API_URL' | 'CABINET_OFFICE_TOKEN')[] } {
  const baseUrl = config.CABINET_API_URL?.trim().replace(/\/+$/, '') ?? '';
  const token = config.CABINET_OFFICE_TOKEN?.trim() ?? '';
  const missing: ('CABINET_API_URL' | 'CABINET_OFFICE_TOKEN')[] = [];
  if (!baseUrl) missing.push('CABINET_API_URL');
  if (!token) missing.push('CABINET_OFFICE_TOKEN');
  return missing.length > 0 ? { ok: false, missing } : { ok: true, baseUrl, token };
}

/** Код отказа кабинета из тела `{code}`; иное тело → null (статус остаётся). */
export function refusalCodeFrom(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as { code?: unknown };
    return typeof parsed?.code === 'string' ? parsed.code : null;
  } catch {
    return null;
  }
}

@Injectable()
export class CabinetUsersClient {
  private readonly logger = new Logger(CabinetUsersClient.name);
  private readonly fetchImpl: CabinetFetch;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Optional() @Inject(CABINET_FETCH) fetchImpl?: CabinetFetch,
  ) {
    this.fetchImpl =
      fetchImpl ??
      ((url, init) => proxyAwareFetch(url, init, proxyUrlFrom(this.config)) as unknown as ReturnType<CabinetFetch>);
  }

  listMembranes(query: { cursor?: string; limit?: string }): Promise<CabinetOutcome<CabinetMembranesPage>> {
    const params = new URLSearchParams();
    if (query.cursor) params.set('cursor', query.cursor);
    if (query.limit) params.set('limit', query.limit);
    const qs = params.toString();
    return this.call<CabinetMembranesPage>('GET', `${CABINET_MEMBRANES_PATH}${qs ? `?${qs}` : ''}`);
  }

  setArchiveRetention(membraneId: string, days: unknown, actor: string): Promise<CabinetOutcome<CabinetRetentionResult>> {
    return this.call<CabinetRetentionResult>(
      'PUT',
      `${CABINET_MEMBRANES_PATH}/${encodeURIComponent(membraneId)}/archive-retention`,
      { days, actor },
    );
  }

  private async call<T>(method: 'GET' | 'PUT', path: string, body?: unknown): Promise<CabinetOutcome<T>> {
    const pair = resolveCabinetPair(this.config);
    if (!pair.ok) return { kind: 'cabinet-not-configured', missing: pair.missing };

    let res: Awaited<ReturnType<CabinetFetch>>;
    try {
      res = await this.fetchImpl(`${pair.baseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          'X-Membrana-Token': pair.token,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(CABINET_TIMEOUT_MS),
      });
    } catch (error) {
      // Сообщение сети не содержит заголовков; URL и токен в лог не пишем — только метод, путь, класс.
      const detail = error instanceof Error ? `${error.name}: ${error.message}` : 'fetch failed';
      this.logger.warn({ method, path, detail }, 'cabinet door unreachable');
      return { kind: 'cabinet-unreachable', detail };
    }

    const text = await res.text().catch(() => '');
    if (res.status < 200 || res.status >= 300) {
      const code = refusalCodeFrom(text);
      this.logger.warn({ method, path, status: res.status, code }, 'cabinet door rejected');
      return { kind: 'cabinet-rejected', status: res.status, code };
    }
    try {
      return { kind: 'ok', data: JSON.parse(text) as T };
    } catch {
      this.logger.warn({ method, path, status: res.status }, 'cabinet door returned non-JSON body');
      return { kind: 'cabinet-unreachable', detail: 'invalid JSON from cabinet' };
    }
  }
}
