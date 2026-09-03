/**
 * Служба мембранного выключателя срока (#2271).
 *
 * ЧТО ЗДЕСЬ ЕСТЬ И ЧЕГО НЕТ. Служба ЗАПИСЫВАЕТ волю человека и ПОКАЗЫВАЕТ действующий срок.
 * Судить срок она не умеет и не должна: разбор лежит в `resolveTrackKeyTtl` вместе с его
 * fail-closed веткой, и второй разборщик рядом означал бы два несводимых мнения о том, сколько
 * живёт ссылка.
 *
 * ЗАПИСЬ СНЯТИЯ ОБЯЗАНА НЕСТИ ПОДПИСЬ. `lifted` без `liftedBy` — не «бессрочно», а порча:
 * снятие срока это движение человека, и неподписанное движение неотличимо от повреждённой
 * записи. Служба отказывает на входе, а не кладёт в базу то, что резолвер потом отвергнет.
 */
import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { DEFAULT_TRACK_KEY_TTL, MAX_TRACK_KEY_TTL, resolveTrackKeyTtl } from './track-key-ttl';
import { PrismaTrackKeyTtlSettingsStore } from './prisma-track-key.store';

/** Словарь режимов — закрытый. Незнакомый режим это поломка запроса, а не «наверное умолчание». */
export const TRACK_KEY_TTL_MODES = ['default', 'seconds', 'lifted'] as const;
export type TrackKeyTtlMode = (typeof TRACK_KEY_TTL_MODES)[number];

export interface TrackKeyTtlWrite {
  readonly mode: string;
  readonly seconds?: number | null;
  readonly liftedBy?: string | null;
}

@Injectable()
export class TrackKeyTtlSettingsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly store: PrismaTrackKeyTtlSettingsStore,
  ) {}

  /** Что записано и что из этого следует. Действующий срок считает резолвер, не эта служба. */
  async describe(membraneId: string): Promise<unknown> {
    const stored = await this.store.read(membraneId);
    const resolved = resolveTrackKeyTtl(stored, { now: new Date() });
    return {
      stored,
      effective: resolved,
      defaultSeconds: DEFAULT_TRACK_KEY_TTL,
      maxSeconds: MAX_TRACK_KEY_TTL,
      /**
       * Названная граница, а не украшение ответа: настройка лежит в БД ЭТОГО узла, а мембрана
       * может охватывать несколько. Пока носителя поверх узлов нет, движение человека меняет
       * срок здесь, а не на всей мембране.
       */
      scopeCaveat: 'настройка узловая; мембранный масштаб вердикта M3 требует носителя поверх узлов',
    };
  }

  async write(membraneId: string, body: TrackKeyTtlWrite): Promise<unknown> {
    const mode = this.parseMode(body.mode);

    if (mode === 'seconds') {
      const seconds = Number(body.seconds);
      if (!Number.isInteger(seconds) || seconds <= 0) {
        throw new BadRequestException('срок — целое число секунд больше нуля');
      }
      if (seconds > MAX_TRACK_KEY_TTL) {
        // Величина сверх потолка неотличима от опечатки. Бессрочность назначается СЛОВОМ
        // (`lifted`), а не огромным числом — иначе «навсегда» можно получить промахом по клавише.
        throw new BadRequestException(
          `срок больше потолка ${MAX_TRACK_KEY_TTL} с; бессрочность назначается режимом «снят», а не числом`,
        );
      }
      await this.upsert(membraneId, { mode, seconds, liftedAt: null, liftedBy: null });
      return this.describe(membraneId);
    }

    if (mode === 'lifted') {
      const liftedBy = typeof body.liftedBy === 'string' ? body.liftedBy.trim() : '';
      if (liftedBy === '') {
        throw new BadRequestException('снятие срока обязано нести подпись: кто снял');
      }
      await this.upsert(membraneId, {
        mode,
        seconds: null,
        liftedAt: new Date(),
        liftedBy,
      });
      return this.describe(membraneId);
    }

    await this.upsert(membraneId, { mode: 'default', seconds: null, liftedAt: null, liftedBy: null });
    return this.describe(membraneId);
  }

  private parseMode(value: string): TrackKeyTtlMode {
    if ((TRACK_KEY_TTL_MODES as readonly string[]).includes(value)) return value as TrackKeyTtlMode;
    throw new BadRequestException(
      `неизвестный режим «${value}»; знаем: ${TRACK_KEY_TTL_MODES.join(', ')}`,
    );
  }

  private async upsert(
    membraneId: string,
    data: { mode: string; seconds: number | null; liftedAt: Date | null; liftedBy: string | null },
  ): Promise<void> {
    await this.prisma.trackKeyTtlSetting.upsert({
      where: { membraneId },
      create: { membraneId, ...data },
      update: data,
    });
  }
}
