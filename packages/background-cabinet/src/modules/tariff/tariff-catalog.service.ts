/**
 * Витрина тарифов для страницы мембраны (#2281).
 *
 * Отделена от `TariffTransitionService` намеренно: та отвечает «законна ли смена», эта — «что
 * вообще можно выбрать». Смешать их значило бы завести в сервисе перехода второе чтение сетки
 * рядом с тем, по которому он судит.
 *
 * Правило пересечения сетки и базы живёт в чистом домене (`domain/tariff-catalog`); здесь только
 * чтение состояния и передача его вердикта.
 */
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { loadTariffGrid } from '../../domain/tariff-grid-source';
import { buildTariffCatalog, type TariffCatalogItem } from '../../domain/tariff-catalog';

/** Ответ витрины. Текущий тариф назван отдельно, чтобы читателю не искать флаг перебором. */
export interface TariffCatalogView {
  readonly currentTariffId: string;
  readonly items: readonly TariffCatalogItem[];
}

@Injectable()
export class TariffCatalogService {
  private readonly logger = new Logger(TariffCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listForMembrane(membraneId: string): Promise<TariffCatalogView> {
    const grid = loadTariffGrid();
    if (!grid) {
      /*
       * Пустая витрина здесь была бы ЛОЖЬЮ, а не осторожностью: «выбрать нечего» и «сервер не
       * смог прочитать сетку» — разные утверждения, и пользователь, увидев первое, решил бы, что
       * тарифов не существует. Поэтому отказ транспортный и громкий.
       *
       * Это НЕ противоречит `200 { ok, reason }` у смены: там отказ судит домен о переходе, здесь
       * сервер сообщает, что судить нечем.
       */
      this.logger.error('витрина тарифов недоступна — сетка не прочитана');
      throw new ServiceUnavailableException('tariff grid unavailable');
    }

    const membrane = await this.prisma.membrane.findUnique({
      where: { id: membraneId },
      select: { tariffId: true },
    });
    if (!membrane) throw new ServiceUnavailableException('membrane not found');

    const records = await this.prisma.tariff.findMany({
      select: {
        id: true,
        userStorageQuotaBytes: true,
        bufferQuotaBytes: true,
        maxNodesPerMembrane: true,
        maxUserWorkspaces: true,
      },
    });

    return {
      currentTariffId: membrane.tariffId,
      items: buildTariffCatalog(grid, records, membrane.tariffId),
    };
  }
}
