/**
 * Мембранный выключатель срока ключа (#2271, вердикт M3) — ручка для кабинета.
 *
 * ПИШЕТ КАБИНЕТ, ЧИТАЕТ MEDIA. Обратного хода нет: media в рантайме в кабинет не ходит (M1), и
 * настройка приходит сюда уже прочитанным снимком. Это та же граница, по которой `membraneId`
 * пишется однократно при привязке.
 *
 * ТРИ СОСТОЯНИЯ, А НЕ ДВА. `default` — умолчание; `seconds` — заданный человеком срок;
 * `lifted` — срок СНЯТ. Третье состояние существует затем, чтобы «не записано» и «записано
 * «бессрочно»» не сливались: бессрочность НАЗНАЧАЕТСЯ словом с подписью, а не возникает из
 * пустоты, порчи или прошедшей даты. Без этого различия fail-closed ветка генератора не смогла
 * бы отличить волю человека от повреждённой записи.
 *
 * МАСШТАБ — МЕМБРАНА, И ЛОТОК ПОД НЕГО ПОПАДАЕТ. Названная цена, не упущение: сняв срок ради
 * разобранных наборов, человек снимает его и с записей двора.
 *
 * ГРАНИЦА, КОТОРУЮ ЗАСЕДАНИЕ НЕ РЕШИЛО, и она названа здесь, а не спрятана: настройка лежит в
 * БД ЭТОГО media-сервера, а мембрана может охватывать несколько узлов. Пока носителя
 * мембранного масштаба поверх узлов нет, «одно движение» человека меняет срок на ТОМ узле, с
 * которым он работает. Считать это исполненным вердиктом M3 нельзя — вердикт требует одного
 * движения на всю мембрану.
 */
import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';

import { TrackKeyTtlSettingsService } from './track-key-ttl.settings.service';

/** Тело записи. Разбирается службой; контроллер своей правды о сроке не заводит. */
export interface WriteTrackKeyTtlDto {
  readonly mode: string;
  readonly seconds?: number | null;
  readonly liftedBy?: string | null;
}

@ApiTags('Track key TTL')
@Controller('v1/membranes/:membraneId/track-key-ttl')
@UseGuards(ApiTokenGuard)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
@ApiParam({ name: 'membraneId', format: 'uuid' })
export class TrackKeyTtlController {
  constructor(private readonly settings: TrackKeyTtlSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Текущий срок ключей мембраны' })
  @ApiResponse({ status: 200, description: 'mode/seconds/liftedAt/liftedBy и действующий срок' })
  async read(@Param('membraneId') membraneId: string): Promise<unknown> {
    return this.settings.describe(membraneId);
  }

  @Put()
  @ApiOperation({ summary: 'Сменить срок ключей мембраны — движение человека' })
  @ApiResponse({ status: 200, description: 'Записанная настройка и действующий срок' })
  async write(
    @Param('membraneId') membraneId: string,
    @Body() body: WriteTrackKeyTtlDto,
  ): Promise<unknown> {
    return this.settings.write(membraneId, body);
  }
}
