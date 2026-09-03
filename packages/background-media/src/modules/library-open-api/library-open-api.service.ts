/**
 * Сервис двери открытого API (#2271).
 *
 * ЗДЕСЬ ЖИВЁТ ГРАНИЦА CJS ↔ ESM. Пакет `@membrana/media-library-service` — ESM, этот — CommonJS
 * (Nest). Статический импорт даёт `require()` к ESM-модулю и роняет сборку (`TS1479`); поймано
 * CI на #2267, изнутри ни одного из пакетов эта граница не видна. Поэтому форма берётся
 * ДИНАМИЧЕСКИМ импортом ровно один раз и кешируется — так же, как это делают тесты пакета для
 * `@membrana/plugin-handlers`.
 *
 * СЕРВИС НЕ СУДИТ ДОСТУП И НЕ СЧИТАЕТ ПОЛНОТУ. Порядок «существование → владение» живёт в
 * `open-api-access.ts`, форма и инвариант полноты — в пакете формы. Дверь их зовёт; своей
 * копии ни того, ни другого не заводит, иначе копии однажды разъедутся молча.
 */
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { SamplesService } from '../samples/samples.service';
import { TrackKeyGenerator, buildTrackUrl } from '../track-keys/track-key.generator';

import { accessForDevice, accessForNested, type OpenApiAccess } from './open-api-access';

/** Потолок страницы — факт входа заседания, а не решение двери. */
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 40;

/** Ленивая загрузка формы. Один импорт на процесс: повторный `import()` вернёт тот же модуль. */
// `resolution-mode: import` обязателен и в ТИПОВОЙ позиции: без него TS1542. Ту же форму
// несут тип-импорты в `buffer-cleanup.service.ts` и `first-wave.registrar.ts` этого пакета.
type ContractModule = typeof import('@membrana/media-library-service', { with: { 'resolution-mode': 'import' } });
let contractPromise: Promise<ContractModule> | null = null;
function contract(): Promise<ContractModule> {
  contractPromise ??= import('@membrana/media-library-service');
  return contractPromise;
}

@Injectable()
export class LibraryOpenApiService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly samples: SamplesService,
    private readonly keys: TrackKeyGenerator,
    @Inject('OPEN_API_BASE_URL') private readonly baseUrl: string,
  ) {}

  /**
   * Решение о доступе. Существование спрашивается ПЕРВЫМ — иначе `403` перестанет доказывать
   * существование ресурса (см. `open-api-access.ts`).
   */
  async accessTo(deviceId: string, callerMembraneId: string | null): Promise<OpenApiAccess> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { membraneId: true },
    });
    return accessForDevice(device, callerMembraneId);
  }

  /**
   * Решение по набору внутри прибора: сперва прибор, потом существование набора.
   *
   * Возвращает исход, а не бросает: отказ выносит контроллер ОДНОЙ дорогой (`refuseUnless`).
   * Бросать здесь значило бы завести вторую дорогу отказа рядом с первой.
   */
  async accessToCollection(
    deviceId: string,
    callerMembraneId: string | null,
    collectionId: string,
  ): Promise<OpenApiAccess> {
    const device = await this.accessTo(deviceId, callerMembraneId);
    if (device !== 'allow') return accessForNested(device, false);
    const found = await this.prisma.collection.findFirst({
      where: { id: collectionId, deviceId },
      select: { id: true },
    });
    return accessForNested(device, found !== null);
  }

  /** Наборы прибора в наружной обёртке: `items`/`total`/`page`/`limit`, без флага полноты. */
  async listCollections(deviceId: string, page?: string, limit?: string): Promise<unknown> {
    const { page: p, limit: l } = pageQuery(page, limit);
    const [total, rows] = await Promise.all([
      this.prisma.collection.count({ where: { deviceId } }),
      this.prisma.collection.findMany({
        where: { deviceId },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
    ]);
    const { toPageEnvelope } = await contract();
    return toPageEnvelope(
      rows.map((r) => ({ id: r.id, name: r.name, kind: r.kind, createdAt: r.createdAt.toISOString() })),
      { total, page: p, limit: l },
    );
  }

  /**
   * Пробы набора со ссылками.
   *
   * ТЕЛО ЭТОГО ОТВЕТА — СВЯЗКА КЛЮЧЕЙ, а не метаданные каталога (M4). Заголовки `no-store`
   * вешает перехватчик на всю ветку; здесь — то, что связкой её делает: у каждой пробы адрес и
   * срок.
   *
   * Отказ выдать ключ — ОТКАЗ ЗАПРОСА, а не проба без поля: поле обязательное по решению
   * консилиума, и пропуск был бы неотличим от «ключ не выдан».
   */
  async listSamples(
    deviceId: string,
    collectionId: string,
    page?: string,
    limit?: string,
  ): Promise<unknown> {
    const { page: p, limit: l } = pageQuery(page, limit);
    const membraneId = await this.membraneOf(deviceId);
    const [total, rows] = await Promise.all([
      this.prisma.sample.count({ where: { deviceId, collectionId } }),
      this.prisma.sample.findMany({
        where: { deviceId, collectionId },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
    ]);

    const { toPublicSample, toPageEnvelope } = await contract();
    const items = [];
    for (const row of rows) {
      const issued = await this.keys.issue({ membraneId, sampleId: row.id });
      if (issued.outcome !== 'issued') {
        // Молчания нет: причина отказа генератора едет человеку словом, а не пропуском поля.
        throw new NotFoundException(`ключ не выдан: ${issued.verdict}`);
      }
      items.push(
        toPublicSample(row as never, {
          url: buildTrackUrl(this.baseUrl, row.id, issued.link.key),
          expiresAt: issued.link.expiresAt,
        }),
      );
    }
    return toPageEnvelope(items, { total, page: p, limit: l });
  }

  /** Файл пробы. Ключ пробы — `sampleId`; изменяемый `title` ключом быть не может (M2). */
  async blob(deviceId: string, sampleId: string): Promise<{ stream: unknown; contentType: string }> {
    return this.samples.getBlob(deviceId, sampleId);
  }

  private async membraneOf(deviceId: string): Promise<string | null> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { membraneId: true },
    });
    return device?.membraneId ?? null;
  }
}

/**
 * Разбор страницы. Потолок 100 — факт входа заседания; величина сверх него УРЕЗАЕТСЯ, а не
 * отвергается: партнёр, попросивший тысячу, получит сто и увидит это в `limit` ответа.
 */
function pageQuery(page?: string, limit?: string): { page: number; limit: number } {
  const p = Number.parseInt(page ?? '', 10);
  const l = Number.parseInt(limit ?? '', 10);
  return {
    page: Number.isFinite(p) && p > 0 ? p : 1,
    limit: Number.isFinite(l) && l > 0 ? Math.min(l, MAX_LIMIT) : DEFAULT_LIMIT,
  };
}
