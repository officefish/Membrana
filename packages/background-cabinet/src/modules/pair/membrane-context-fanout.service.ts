/**
 * РАЗНОСКА КОНТЕКСТА МЕМБРАНЫ ПО ЕЁ ПРИБОРАМ (#2281).
 *
 * Зачем заведено. Квота живёт в кабинете, а СТЕРЕЖЁТ её media — по копии, лежащей у каждого
 * прибора. До сегодня эту копию обновляла ровно одна дорога: привязка (`PairService`). Значит
 * смена тарифа поднимала тариф в кабинете и НЕ трогала предел на приборе: пользователь видел
 * новый тариф и упирался в старую квоту до следующей привязки. Слово владельца 04.09: «квоту до
 * прибора доталкивает только привязка» — отсюда обязательство прогнать `syncMembraneContext` по
 * всем привязанным узлам после записи журнала.
 *
 * **Почему это отдельный носитель, а не строки внутри перехода.** У разноски своё поведение:
 * порядок «сначала журнал, потом приборы», частичный успех как ЗАКОННЫЙ исход и счёт
 * «N обновлено / M не удалось». Переход тарифа об этом знать не должен — он про то, законна ли
 * смена, а не про то, докуда доехала копия.
 *
 * **Порядок несущий: сначала журнал, потом приборы.** Обратный порядок означал бы, что приборы
 * знают тариф, которого мембрана не получила (транзакция могла упасть на гонке). Отказ media —
 * не повод откатывать смену: тариф сменён, журнал написан, обещание пользователю выполнено.
 * Незаехавшая копия чинится следующей привязкой или повтором, потерянная смена не чинится ничем.
 *
 * **Частичный успех — законный исход, а не ошибка.** Поэтому наружу едет СЧЁТ, а не булево:
 * «обновлено 3, не удалось 1» — это правда, которую пользователь и оператор могут прочитать;
 * `false` на всю операцию соврал бы про три доехавших прибора, `true` — про один недоехавший.
 */
import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { MediaBridgeService, type MediaMembraneContext } from './media-bridge.service';

/** Счёт разноски. Наружу уезжает ровно это. */
export interface MembraneContextFanoutResult {
  /** Приборов, принявших новый контекст. */
  readonly updated: number;
  /** Приборов, до которых контекст не доехал. */
  readonly failed: number;
}

@Injectable()
export class MembraneContextFanoutService {
  private readonly logger = new Logger(MembraneContextFanoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaBridge: MediaBridgeService,
  ) {}

  /**
   * Прогнать текущий контекст мембраны по всем её приборам.
   *
   * Контекст читается ЗДЕСЬ и ЗАНОВО, а не принимается параметром: вызывающий только что сменил
   * тариф, и единственный источник правды о новых пределах — сама база после смены. Принять
   * контекст сверху значило бы разрешить звонящему разнести по приборам то, чего в базе нет.
   */
  async syncAllNodes(membraneId: string): Promise<MembraneContextFanoutResult> {
    const membrane = await this.prisma.membrane.findUnique({
      where: { id: membraneId },
      include: { tariff: true },
    });
    if (!membrane) {
      // Мембраны нет — разносить нечего и некуда. Не ошибка разноски: субъект исчез.
      this.logger.warn(`разноска контекста пропущена — мембрана ${membraneId} не найдена`);
      return { updated: 0, failed: 0 };
    }

    // Приборы берём ВСЕ, включая отвязанные и отозванные: запись о приборе в media жива, и
    // предел она стережёт по своей копии. Пропустить их значило бы оставить в media заведомую
    // ложь о мембране ровно там, где она дороже всего — на неактивном, но существующем приборе.
    const devices = await this.prisma.device.findMany({
      where: { node: { membraneId: membrane.id } },
      select: { mediaDeviceId: true, nodeId: true },
    });
    if (devices.length === 0) return { updated: 0, failed: 0 };

    // Форма контекста — та же, что при привязке (`PairService.pair`). Второй сборки полей здесь
    // нет по смыслу: разойдись они, media получала бы разный контекст по разным дорогам.
    const context: MediaMembraneContext = {
      membraneId: membrane.id,
      userStorageQuotaBytes: membrane.tariff.userStorageQuotaBytes.toString(),
      bufferQuotaBytes: membrane.tariff.bufferQuotaBytes.toString(),
      datasetCatalogId: membrane.tariff.datasetCatalogId,
      maxUserWorkspaces: membrane.tariff.maxUserWorkspaces,
    };

    const outcomes = await Promise.allSettled(
      devices.map((device) => this.mediaBridge.syncMembraneContext(device.mediaDeviceId, context)),
    );

    let updated = 0;
    let failed = 0;
    outcomes.forEach((outcome, index) => {
      if (outcome.status === 'fulfilled') {
        updated += 1;
        return;
      }
      failed += 1;
      // Логируем ПОШТУЧНО: счёт говорит «сколько», журнал — «какие именно». Без второго
      // оператор знает, что кто-то отстал, и не знает кто.
      const reason = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      this.logger.warn(
        `контекст мембраны ${membrane.id} не доехал до прибора узла ${devices[index]!.nodeId}: ${reason}`,
      );
    });

    return { updated, failed };
  }
}
