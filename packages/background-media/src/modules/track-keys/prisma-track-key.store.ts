/**
 * Prisma-адаптеры хранилищ ключа треков (#2271).
 *
 * ЗАВЕДЕНИЕ И ЗАМЕНА — РАЗНЫЕ ГЛАГОЛЫ, и заведение атомарно. Блок `key-ttl` коворка развёл их
 * не из вкуса: его зуб ротации поймал живую гонку — при параллельной ПЕРВОЙ выдаче ключ
 * мембраны заводился дважды, второй секрет затирал первый, и ссылка приходила с вердиктом
 * `tampered`. То есть система сообщала о ПОДДЕЛКЕ там, где тела ключа никто не трогал:
 * диагноз лгал о причине.
 *
 * Здесь атомарность держит УНИКАЛЬНЫЙ КЛЮЧ ТАБЛИЦЫ (`@@unique([membraneId])`, миграция
 * `20260903120000`), а не порядок вызовов и не наша осторожность. Ревью #2267 назвало это
 * прямо: «не считать store готовым к проводу» без него.
 */
import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import type { StoredTrackKeyTtl } from './track-key-ttl';
import type {
  TrackKeySecretRecord,
  TrackKeyStore,
  TrackKeyTtlSettingsStore,
} from './track-key.generator';

/** Код Prisma для нарушения уникальности. Ловим именно его, а не любую ошибку записи. */
const UNIQUE_VIOLATION = 'P2002';

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === UNIQUE_VIOLATION;
}

@Injectable()
export class PrismaTrackKeyStore implements TrackKeyStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async read(membraneId: string): Promise<TrackKeySecretRecord | null> {
    const row = await this.prisma.trackKeySecret.findUnique({ where: { membraneId } });
    if (!row) return null;
    return {
      membraneId: row.membraneId,
      generation: row.generation,
      secret: row.secret,
      rotatedAt: row.rotatedAt,
    };
  }

  /**
   * Завести ключ, если его нет.
   *
   * ВОЗВРАЩАЕТ ДЕЙСТВУЮЩУЮ ЗАПИСЬ — свою или ЧУЖУЮ. Проигравший гонку не падает и не заводит
   * дубль: он перечитывает победителя и работает с ним. Именно этим «заведение» отличается от
   * «замены» — второй вызов не имеет права обесценить уже выданные ссылки.
   */
  async createIfAbsent(record: TrackKeySecretRecord): Promise<TrackKeySecretRecord> {
    try {
      const created = await this.prisma.trackKeySecret.create({
        data: {
          membraneId: record.membraneId,
          generation: record.generation,
          secret: record.secret,
          rotatedAt: record.rotatedAt,
        },
      });
      return {
        membraneId: created.membraneId,
        generation: created.generation,
        secret: created.secret,
        rotatedAt: created.rotatedAt,
      };
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      // Гонку выиграл сосед. Его запись — действующая; наша попытка не состоялась и не должна
      // ничего перезаписать. Если записи вдруг нет (её удалили между вставкой и чтением) —
      // это не наш случай, и молча выдумывать ключ мы не станем.
      const winner = await this.read(record.membraneId);
      if (!winner) throw e;
      return winner;
    }
  }

  /**
   * Заменить секрет — это РОТАЦИЯ, и она обесценивает все ссылки мембраны разом.
   * Отдельный глагол именно затем, чтобы заведение никогда не сделало этого нечаянно.
   */
  async replace(record: TrackKeySecretRecord): Promise<void> {
    await this.prisma.trackKeySecret.update({
      where: { membraneId: record.membraneId },
      data: {
        generation: record.generation,
        secret: record.secret,
        rotatedAt: record.rotatedAt,
      },
    });
  }
}

/**
 * Настройка срока — снимок КАК ЕСТЬ, без разбора.
 *
 * Порт объявлен сырым (`StoredTrackKeyTtl = unknown`) намеренно: доверия к записи нет, и
 * разбирает её резолвер `resolveTrackKeyTtl` со своей fail-closed веткой. Привести значение к
 * «правильному» виду ЗДЕСЬ значило бы вылечить порчу до того, как её увидит тот, кто обязан на
 * неё отказать.
 */
@Injectable()
export class PrismaTrackKeyTtlSettingsStore implements TrackKeyTtlSettingsStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async read(membraneId: string): Promise<StoredTrackKeyTtl> {
    const row = await this.prisma.trackKeyTtlSetting.findUnique({ where: { membraneId } });
    if (!row) return null;
    if (row.mode === 'seconds') return { mode: 'seconds', seconds: row.seconds };
    if (row.mode === 'lifted') {
      return { mode: 'lifted', liftedAt: row.liftedAt?.toISOString(), liftedBy: row.liftedBy };
    }
    return { mode: row.mode };
  }
}
