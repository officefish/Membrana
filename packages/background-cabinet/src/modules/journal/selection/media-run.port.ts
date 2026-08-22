/**
 * Порт заказа измерения: кабинет → media. Блок c5c спринта `chart-list-plugin`.
 *
 * ЦЕНА НАЗВАНА ДО НАЧАЛА. Это горизонтальная связь, которой в графе сервисов не было. Взята
 * сознательно, вариантом A: звук лежит в media, и тащить двести wav в кабинет ради мер, которые
 * media умеет считать локально, дороже и по полосе, и по смыслу — мерить надо там, где материал.
 * Через порт течёт ЗАКАЗ и ИЗМЕРЕННОЕ; звук через кабинет не проходит вовсе.
 *
 * ПОЧЕМУ ИЗМЕРЕННОЕ ПРИХОДИТ ОТВЕТОМ, А НЕ ИЗ ДОМА РЕЗУЛЬТАТОВ. Замерено по контрактам:
 * `RunResult` — ровно два поля (`completedAt`, `kind`), `RunRecord` добавляет адрес, отпечатки и
 * режим. Измеренному в паспорте прогона места НЕТ, и офис срезал бы лишнее схемой. Расширять
 * контракты задание запрещает (Т6), писать измеренное мимо `plugin-results` запрещает норма #1950.
 * Остаётся синхронный ответ входа `request` — им и пользуемся. Паспорт при этом уезжает в дом
 * результатов как обычно: двух источников правды нет, потому что паспорт измерений не несёт.
 *
 * ТОКЕН — ВНУТРЕННИЙ. Вход media принимает `X-Membrana-Token: API_INTERNAL_TOKEN` наравне с
 * ключом устройства; заводить второй способ входа ради кабинета незачем.
 */
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import type { DeviceSampleTask } from './entry-samples';

/** Измеренный кандидат в том виде, в каком его отдаёт media. */
export interface MeasuredFromMedia {
  readonly sampleId: string;
  readonly deltaDb: number;
  readonly peakDb: number;
  readonly flatness: number;
  readonly structure: string;
  readonly durationSec: number;
  readonly features: Record<string, number>;
}

export interface MediaMeasureOutcome {
  readonly runId: string;
  readonly candidates: readonly MeasuredFromMedia[];
  /** Фон, от которого считалось превышение, и был ли он измерен. */
  readonly floor: { readonly value: number; readonly measured: boolean };
  readonly refusalReason: string | null;
}

export interface MediaRunPortConfig {
  readonly mediaApiUrl: string;
  readonly internalToken: string;
  /** Коллекция, в которой лежат пробы устройства. Сегодня — приёмный буфер. */
  readonly bufferCollectionId: string;
}

export type PortFetch = (url: string, init: RequestInit) => Promise<Response>;

const MEASURE_PLUGIN_ID = 'membrana.report.chart-list-measure';
const REQUEST_TIMEOUT_MS = 60_000;

@Injectable()
export class MediaRunPort {
  private readonly logger = new Logger(MediaRunPort.name);

  constructor(
    private readonly config: MediaRunPortConfig,
    private readonly fetchImpl: PortFetch = (url, init) => fetch(url, init),
  ) {}

  get configured(): boolean {
    return Boolean(this.config.mediaApiUrl && this.config.internalToken);
  }

  /**
   * Заказать измерение набора проб одного устройства.
   *
   * Ненастроенный порт — ОТКАЗ, а не пустой результат: пустая выборка читалась бы как «ничего не
   * нашлось», тогда как на деле не позвонили.
   */
  async measure(task: DeviceSampleTask): Promise<MediaMeasureOutcome> {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Порт media не настроен (MEDIA_API_URL / API_INTERNAL_TOKEN) — измерение не заказано',
      );
    }
    const base = this.config.mediaApiUrl.replace(/\/+$/, '');
    const url =
      `${base}/v1/devices/${encodeURIComponent(task.deviceId)}` +
      `/collections/${encodeURIComponent(this.config.bufferCollectionId)}` +
      `/plugins/${encodeURIComponent(MEASURE_PLUGIN_ID)}/request`;

    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Membrana-Token': this.config.internalToken },
      body: JSON.stringify({ sampleIds: [...task.sampleIds] }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.warn({ deviceId: task.deviceId, status: res.status }, 'media отказал в измерении');
      throw new ServiceUnavailableException(`media отказал в измерении: ${res.status} ${detail.slice(0, 300)}`);
    }

    const body = (await res.json()) as {
      runId?: string;
      result?: {
        candidates?: readonly MeasuredFromMedia[];
        floor?: { value: number; measured: boolean };
        refusal?: { reason: string } | null;
      };
    };

    // Прогон без результата — не «ноль кандидатов». Плагин мог быть заглушкой, а ответ прийти 200:
    // молча превратить это в пустую выборку значило бы соврать человеку о материале.
    if (!body.result) {
      throw new ServiceUnavailableException(
        `media вернул прогон ${body.runId ?? '?'} без измеренного — измеритель не отработал`,
      );
    }

    return {
      runId: body.runId ?? '',
      candidates: body.result.candidates ?? [],
      floor: body.result.floor ?? { value: 0, measured: false },
      refusalReason: body.result.refusal?.reason ?? null,
    };
  }
}
