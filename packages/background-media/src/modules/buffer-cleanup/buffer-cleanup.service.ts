/**
 * Управляемая уборка буфера на сервере (#2204, часть 2/4).
 *
 * ПОЧЕМУ СЕРВЕР, А НЕ КЛИЕНТ. Отбор — чистая функция, её можно было бы считать в браузере;
 * но в буфере на проде 1747 проб, и тащить весь список в UI ради счёта ранних неразумно, а
 * удалять сотню проб сотней запросов хрупко: отказ на пятидесятой оставит человека с
 * половиной уборки и без внятного ответа, сколько же ушло. Здесь — один план и одно
 * исполнение, и оба говорят числами.
 *
 * ДВА ГЛАГОЛА, И ВТОРОЙ НЕ УМЕЕТ ПЕРВОГО. `plan` считает, что уйдёт. `execute` удаляет
 * ТОЛЬКО перечисленных поимённо и не знает слов «сто самых ранних». Это и есть требование
 * владельца «удалить без показа списка запрещено», выраженное контрактом, а не дисциплиной:
 * чтобы удалить, надо сперва получить список, то есть показать его человеку.
 *
 * ЗАЩИТА ПРОВЕРЯЕТСЯ ДВАЖДЫ. План отсеивает помеченных, и `execute` отсеивает их снова: между
 * показом и подтверждением человек мог пометить пробу как хранимую — именно это и есть
 * лекарство от 22.08, когда вещдоки закрытого спринта не были помечены никак. Поздняя
 * пометка обязана побеждать ранний план.
 */
import { BadRequestException, Injectable } from '@nestjs/common';

import type {
  BufferCleanupPrinciple,
  MediaSample,
  SampleLabel,
} from '@membrana/media-library-service' with { 'resolution-mode': 'import' };

/**
 * Ядро — ESM, этот пакет собирается в CommonJS: статический импорт значений тут запрещён
 * компилятором (TS1479). Тот же приём, что у регистратора первого вала — динамический импорт.
 * Типы приходят обычным `import type` и в require не превращаются.
 */
const loadCore = () => import('@membrana/media-library-service');

import { PrismaService } from '../../prisma/prisma.service';
import { CollectionsService } from '../collections/collections.service';
import { SamplesService } from '../samples/samples.service';

export interface CleanupPlanRow {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly sizeBytes: number;
}

export interface CleanupPlanResult {
  readonly principle: BufferCleanupPrinciple;
  readonly requested: number;
  readonly doomed: readonly CleanupPlanRow[];
  readonly protectedOut: readonly { id: string; title: string; why: string }[];
  readonly freedBytes: number;
  readonly remaining: number;
  readonly inBuffer: number;
  readonly shortfall: string | null;
}

export interface CleanupExecuteResult {
  readonly deleted: number;
  readonly freedBytes: number;
  /** Кого не тронули и почему — молчаливого пропуска быть не должно. */
  readonly refused: readonly { id: string; why: string }[];
}

@Injectable()
export class BufferCleanupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collections: CollectionsService,
    private readonly samples: SamplesService,
  ) {}

  async plan(
    deviceId: string,
    collectionId: string,
    principle: BufferCleanupPrinciple,
    volume: number,
  ): Promise<CleanupPlanResult> {
    if (principle !== 'oldest' && principle !== 'newest') {
      throw new BadRequestException('principle must be oldest or newest');
    }
    const core = await loadCore();
    if (!core.isBufferCleanupVolume(volume)) {
      throw new BadRequestException('volume must come from the plugin dictionary (20/50/100/200)');
    }
    await this.collections.getOwned(deviceId, collectionId);

    const rows = await this.loadBuffer(deviceId, collectionId);
    const computed = core.planBufferCleanup(rows, { principle, volume });

    return {
      principle,
      requested: volume,
      doomed: computed.doomed.map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        sizeBytes: s.sizeBytes,
      })),
      protectedOut: computed.protectedOut.map((p) => ({ id: p.id, title: p.title, why: p.why })),
      freedBytes: computed.freedBytes,
      remaining: computed.remaining,
      inBuffer: rows.length,
      shortfall: computed.shortfall,
    };
  }

  /**
   * Удаляет ТОЛЬКО перечисленных. Список приходит из плана, показанного человеку, — иного
   * пути к удалению у плагина нет.
   */
  async execute(
    deviceId: string,
    collectionId: string,
    sampleIds: readonly string[],
  ): Promise<CleanupExecuteResult> {
    if (!Array.isArray(sampleIds) || sampleIds.length === 0) {
      throw new BadRequestException('sampleIds required — deleting without a shown list is not possible');
    }
    await this.collections.getOwned(deviceId, collectionId);
    const core = await loadCore();

    const rows = await this.prisma.sample.findMany({
      where: { deviceId, collectionId, id: { in: [...sampleIds] } },
    });
    const found = new Map(rows.map((r) => [r.id, r]));

    const refused: { id: string; why: string }[] = [];
    let deleted = 0;
    let freedBytes = 0;

    for (const id of sampleIds) {
      const row = found.get(id);
      if (!row) {
        // Ушла сама или принадлежит другому набору — это не ошибка уборки, но и не тишина.
        refused.push({ id, why: 'пробы нет в этом наборе — возможно, уже удалена' });
        continue;
      }
      // Вторая проверка защиты: пометка, поставленная ПОСЛЕ показа плана, побеждает план.
      if (core.isPinnedByHuman(toMediaSample(row))) {
        refused.push({ id, why: 'помечена как хранимая после показа списка — не удалена' });
        continue;
      }
      try {
        await this.samples.delete(deviceId, id);
        deleted += 1;
        freedBytes += row.sizeBytes;
      } catch (e) {
        refused.push({ id, why: e instanceof Error ? e.message : 'удаление отклонено' });
      }
    }

    return { deleted, freedBytes, refused };
  }

  private async loadBuffer(deviceId: string, collectionId: string) {
    const rows = await this.prisma.sample.findMany({
      where: { deviceId, collectionId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toMediaSample);
  }
}

/**
 * Строка базы → проба ядра. Перевод ОДИН на оба глагола: план и исполнение обязаны судить
 * пробу одинаково, иначе «помечена» в показе и «помечена» в удалении разошлись бы.
 */
function toMediaSample(row: {
  id: string;
  collectionId: string;
  title: string;
  class: string;
  label: string;
  durationSec: number;
  sampleRate: number;
  channels: number;
  createdAt: Date;
  storageRef: string;
  notes: string | null;
  sizeBytes: number;
}): MediaSample {
  return {
    id: row.id,
    collectionId: row.collectionId,
    title: row.title,
    class: row.class,
    label: labelOf(row.label),
    // Происхождение отбору безразлично: судят время, размер и пометка. Ставим честное
    // умолчание, а не выдумываем источник, которого база в этой ручке не спрашивает.
    source: 'mic-recording',
    durationSec: row.durationSec,
    sampleRate: row.sampleRate,
    channels: row.channels === 2 ? 2 : 1,
    createdAt: row.createdAt.toISOString(),
    storageRef: row.storageRef,
    notes: row.notes ?? undefined,
    sizeBytes: row.sizeBytes,
  };
}

/** База пишет метки через подчёркивание, ядро — через дефис; перевод один и здесь. */
function labelOf(label: string): SampleLabel {
  if (label === 'drone') return 'drone';
  if (label === 'not_drone' || label === 'not-drone') return 'not-drone';
  return 'unlabeled';
}
