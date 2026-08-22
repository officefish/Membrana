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
 * ТРАНСПОРТА ЗДЕСЬ НЕТ — и это исправление по зубу сети. Первая версия держала свой `fetch`, и
 * зуб `network:bare-fetch` покраснел: голый вызов в серверной зоне не видит `HTTPS_PROXY`, а
 * бюджет таких вызовов закрытый. Мой файл занял чужой слот и вытеснил за бюджет
 * `server-storage-backend.ts` — амнистировать чужое ради своего было бы нечестно.
 *
 * Правильный ответ дал сам зуб: «снизь вызов». У кабинета УЖЕ есть один разговор с media
 * (`MediaBridgeService`) — с базой, внутренним токеном и разбором недоступности. Порт зовёт его,
 * а своего транспорта не держит: один сервис — один разговор с соседом.
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

/**
 * Кто умеет заказать прогон у media. Порт, а не служба: зуб подменяет его, не поднимая ни сети,
 * ни модуля пары.
 */
export interface MediaRunCaller {
  requestPluginRun(deviceId: string, collectionId: string, pluginId: string, body: unknown): Promise<Response>;
}

const MEASURE_PLUGIN_ID = 'membrana.report.chart-list-measure';

@Injectable()
export class MediaRunPort {
  private readonly logger = new Logger(MediaRunPort.name);

  constructor(
    private readonly config: MediaRunPortConfig,
    private readonly caller: MediaRunCaller,
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
    const res = await this.caller.requestPluginRun(
      task.deviceId,
      this.config.bufferCollectionId,
      MEASURE_PLUGIN_ID,
      { sampleIds: [...task.sampleIds] },
    );

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
