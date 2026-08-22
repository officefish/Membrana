/**
 * Выборка чарт-листа в кабинетной базе. Блок c4a спринта `chart-list-plugin`.
 *
 * ПОЧЕМУ ЗДЕСЬ, А НЕ В ДОМЕ РЕЗУЛЬТАТОВ. Т3/Т4/Т5 шторма 22.08: выборка — ПОЛЬЗОВАТЕЛЬСКИЙ
 * артефакт, у неё есть адрес, по которому человек открывает её завтра. Офис по Т4 —
 * административный сервер команды, там живёт доказательная база, а не пользовательские вещи.
 * В доме результатов остаётся ПАСПОРТ ПРОГОНА; здесь хранится то, на что человек смотрит.
 * Два носителя — не обход вердикта M3, а граница, которую вводит Т5.
 *
 * ЖУРНАЛ НЕ ТРОНУТ. Схема `telemetry-journal` не изменена ни на поле: журнал остаётся хроникой
 * факта, а отбор — отдельной сущностью со ссылкой на запись. Гибрид «дописать метрики в строку
 * журнала» отвергнут командой 3/3, включая его автора: два источника правды об одном треке
 * разъезжаются, и разъезжаются молча.
 *
 * КЛЮЧ — `membraneId`, ТОТ ЖЕ, ЧТО У ЗАПИСЕЙ ЖУРНАЛА. Не «просто так удобнее»: чужая выборка
 * обязана быть неотличима от несуществующей ровно тем же предикатом, каким чужая запись. Разные
 * предикаты на соседних сущностях — это дыра, которую однажды найдут не свои.
 */
import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

/** Строка выборки в том виде, в каком её кладут и достают. */
export interface StoredPick {
  readonly rank: number;
  readonly entryId: string;
  readonly sampleId: string;
  readonly deltaDb: number;
  readonly peakDb: number;
  readonly structure: string;
  readonly flatness: number;
  readonly displaced: number;
}

export interface StoredSelection {
  readonly id: string;
  readonly criterion: string;
  readonly volume: number;
  readonly runId: string;
  readonly inputHash: string;
  readonly asked: number;
  readonly measured: number;
  readonly shortfall: number;
  readonly createdAt: Date;
  readonly picks: readonly StoredPick[];
}

export interface SaveSelectionInput {
  readonly membraneId: string;
  readonly criterion: string;
  readonly volume: number;
  readonly runId: string;
  readonly inputHash: string;
  readonly asked: number;
  readonly measured: number;
  readonly shortfall: number;
  readonly picks: readonly StoredPick[];
}

@Injectable()
export class ChartListSelectionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Сохранить выборку целиком.
   *
   * Одной транзакцией со строками: выборка без строк — не «пустая выборка», а обломок записи, и
   * человек, открывший её завтра, не отличил бы обломок от честного нулевого результата.
   */
  async save(input: SaveSelectionInput): Promise<StoredSelection> {
    const created = await this.prisma.chartListSelection.create({
      data: {
        membraneId: input.membraneId,
        criterion: input.criterion,
        volume: input.volume,
        runId: input.runId,
        inputHash: input.inputHash,
        asked: input.asked,
        measured: input.measured,
        shortfall: input.shortfall,
        picks: {
          create: input.picks.map((p) => ({
            rank: p.rank,
            entryId: p.entryId,
            sampleId: p.sampleId,
            deltaDb: p.deltaDb,
            peakDb: p.peakDb,
            structure: p.structure,
            flatness: p.flatness,
            displaced: p.displaced,
          })),
        },
      },
      include: { picks: { orderBy: { rank: 'asc' } } },
    });
    return toStored(created);
  }

  /**
   * Открыть выборку по адресу.
   *
   * Чужая выборка даёт `NotFound`, а не «нет доступа»: разные ответы на «нет такой» и «есть, но не
   * твоя» сообщают постороннему, что адрес существует. Тот же выбор, что у ленты журнала.
   */
  async openById(membraneId: string, id: string): Promise<StoredSelection> {
    const found = await this.prisma.chartListSelection.findFirst({
      where: { id, membraneId },
      include: { picks: { orderBy: { rank: 'asc' } } },
    });
    if (!found) throw new NotFoundException(`Chart list selection ${id} not found`);
    return toStored(found);
  }

  /** Выборки пользователя, свежие первыми: список того, что он уже собирал. */
  async listRecent(membraneId: string, limit = 20): Promise<readonly StoredSelection[]> {
    const rows = await this.prisma.chartListSelection.findMany({
      where: { membraneId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { picks: { orderBy: { rank: 'asc' } } },
    });
    return rows.map(toStored);
  }
}

interface SelectionRow {
  id: string;
  criterion: string;
  volume: number;
  runId: string;
  inputHash: string;
  asked: number;
  measured: number;
  shortfall: number;
  createdAt: Date;
  picks: Array<{
    rank: number;
    entryId: string;
    sampleId: string;
    deltaDb: number;
    peakDb: number;
    structure: string;
    flatness: number;
    displaced: number;
  }>;
}

function toStored(row: SelectionRow): StoredSelection {
  return {
    id: row.id,
    criterion: row.criterion,
    volume: row.volume,
    runId: row.runId,
    inputHash: row.inputHash,
    asked: row.asked,
    measured: row.measured,
    shortfall: row.shortfall,
    createdAt: row.createdAt,
    picks: row.picks.map((p) => ({
      rank: p.rank,
      entryId: p.entryId,
      sampleId: p.sampleId,
      deltaDb: p.deltaDb,
      peakDb: p.peakDb,
      structure: p.structure,
      flatness: p.flatness,
      displaced: p.displaced,
    })),
  };
}
