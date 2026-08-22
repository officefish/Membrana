/**
 * Порт измерения для чарт-листа: адреса ленты → измеренные кандидаты. Блок c5c/c6a.
 *
 * Соединяет три уже готовые вещи и своей логики почти не несёт — и это правильно: перевод адресов
 * живёт в `entry-samples.ts`, разговор с media в `media-run.port.ts`, меры в media. Здесь только
 * сборка, и если она разрастётся, значит что-то из трёх сделано не на своём месте.
 *
 * ЗАПИСИ БЕЗ ЗВУКА НЕ ПАДАЮТ И НЕ ПРЯЧУТСЯ. Отчёт звука не имеет; трек без пробы — тоже. Они не
 * доезжают до измерения, но их число видно вызывающему через расхождение «спросили / измерили».
 */
import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { splitByDevice, type EntrySampleRow } from './entry-samples';
import { MediaRunPort } from './media-run.port';

/** Кандидат в том виде, в каком его ждёт отбор: с адресом ЗАПИСИ, а не только пробы. */
export interface EntryCandidate {
  readonly entryId: string;
  readonly sampleId: string;
  readonly at: number;
  readonly deltaDb: number;
  readonly peakDb: number;
  readonly flatness: number;
  readonly structure: 'tonal' | 'broadband';
  readonly durationSec: number;
  readonly features: Record<string, number>;
}

export interface MeasuredEntries {
  readonly candidates: readonly EntryCandidate[];
  readonly asked: number;
  readonly withoutSound: readonly string[];
  readonly withoutDevice: readonly string[];
  /** runId каждого заказанного прогона: у разных устройств прогоны разные. */
  readonly runIds: readonly string[];
}

@Injectable()
export class ChartListMeasureAdapter {
  private readonly logger = new Logger(ChartListMeasureAdapter.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly port: MediaRunPort,
  ) {}

  /**
   * Измерить записи ленты.
   *
   * Читает СВОИ строки: `membraneId` в запросе — тот же предикат, каким лента отделяет чужое.
   * Записи, которых у пользователя нет, просто не найдутся и уйдут в расхождение счёта.
   */
  async measureEntries(userId: string, entryIds: readonly string[]): Promise<MeasuredEntries> {
    const membrane = await this.prisma.membrane.findUnique({ where: { userId }, select: { id: true } });
    if (!membrane) return { candidates: [], asked: entryIds.length, withoutSound: [], withoutDevice: [...entryIds], runIds: [] };
    const membraneId = membrane.id;
    const live = await this.prisma.telemetryLiveRecord.findMany({
      where: { id: { in: [...entryIds] }, membraneId },
      select: { id: true, mediaDeviceId: true, payload: true },
    });

    const rows: EntrySampleRow[] = live.map((r) => ({
      entryId: r.id,
      mediaDeviceId: r.mediaDeviceId,
      sampleId: sampleIdOf(r.payload),
    }));
    // Адреса, которых не нашлось среди живых записей: отчёты и чужое. Звука у них нет.
    const found = new Set(rows.map((r) => r.entryId));
    for (const id of entryIds) if (!found.has(id)) rows.push({ entryId: id, mediaDeviceId: null, sampleId: null });

    const split = splitByDevice(rows);
    const candidates: EntryCandidate[] = [];
    const runIds: string[] = [];

    for (const task of split.tasks) {
      const outcome = await this.port.measure(task);
      if (outcome.runId) runIds.push(outcome.runId);
      if (outcome.refusalReason) {
        this.logger.warn({ deviceId: task.deviceId, reason: outcome.refusalReason }, 'измеритель отказал');
        continue;
      }
      for (const c of outcome.candidates) {
        const entryId = task.entryOf.get(c.sampleId);
        if (!entryId) continue; // проба вне задания — чужая; в выборку не берём
        candidates.push({
          entryId,
          sampleId: c.sampleId,
          at: 0,
          deltaDb: c.deltaDb,
          peakDb: c.peakDb,
          flatness: c.flatness,
          structure: c.structure === 'tonal' ? 'tonal' : 'broadband',
          durationSec: c.durationSec,
          features: c.features,
        });
      }
    }

    return {
      candidates,
      asked: entryIds.length,
      withoutSound: split.withoutSound,
      withoutDevice: split.withoutDevice,
      runIds,
    };
  }
}

/** Адрес пробы из нагрузки живой записи. Форму читаем ту же, что и маппер ленты. */
function sampleIdOf(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as Record<string, unknown>;
  const nested = typeof p.item === 'object' && p.item !== null ? (p.item as Record<string, unknown>) : p;
  const v = nested.sampleId;
  return typeof v === 'string' && v.length > 0 ? v : null;
}
