/**
 * Мембранный выключатель срока ключа (#2271, вердикт M3) — ручка для кабинета.
 *
 * ПИШЕТ КАБИНЕТ, ЧИТАЕТ MEDIA. Обратного хода нет: media в рантайме в кабинет не ходит (M1).
 *
 * ПОЧЕМУ РУЧКА ПРИВЯЗАНА К ПРИБОРУ, А НЕ К МЕМБРАНЕ НАПРЯМУЮ. Первая редакция стояла на
 * `/v1/membranes/:membraneId/...` под внутренним токеном — и была НЕИСПОЛНИМОЙ для кабинета:
 * он ходит в media с ключом устройства, внутреннего токена у него нет. Ручка, которую некому
 * позвать, — это «объявлено, но не сделано», ровно тот класс, что мы ловим весь спринт.
 *
 * Вторая причина сильнее первой: приняв `membraneId` ИЗ ЗАПРОСА, дверь поверила бы
 * обратившемуся на слово. Здесь мембрана ВЫВОДИТСЯ из прибора, к которому обратившийся уже
 * допущен охраной, — та же ось владения, что у выборки (M1: угадывать владельца дверь не
 * вправе, а верить на слово — частный случай угадывания).
 *
 * ТРИ СОСТОЯНИЯ, А НЕ ДВА. `default` — умолчание; `seconds` — заданный человеком срок;
 * `lifted` — срок СНЯТ. Третье существует затем, чтобы «не записано» и «записано «бессрочно»»
 * не сливались: бессрочность НАЗНАЧАЕТСЯ словом с подписью, а не возникает из пустоты, порчи
 * или прошедшей даты.
 *
 * МАСШТАБ — МЕМБРАНА, И ЛОТОК ПОД НЕГО ПОПАДАЕТ. Названная цена, не упущение: сняв срок ради
 * разобранных наборов, человек снимает его и с записей двора.
 *
 * ГРАНИЦА, КОТОРУЮ ЗАСЕДАНИЕ НЕ РЕШИЛО, названа и здесь, и в ТЕЛЕ ответа (`scopeCaveat`):
 * настройка лежит в БД ЭТОГО media-сервера, а мембрана может охватывать несколько узлов. Пока
 * носителя поверх узлов нет, движение человека меняет срок на том узле, с которым он работает.
 * Считать вердикт M3 «одно движение на всю мембрану» исполненным нельзя.
 */
import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { MediaDeviceAccessGuard } from '../../common/guards/media-device-access.guard';

import { TrackKeyTtlSettingsService } from './track-key-ttl.settings.service';

/** Тело записи. Разбирается службой; контроллер своей правды о сроке не заводит. */
export interface WriteTrackKeyTtlDto {
  readonly mode: string;
  readonly seconds?: number | null;
  readonly liftedBy?: string | null;
}

@ApiTags('Track key TTL')
@Controller('v1/devices/:deviceId/track-key-ttl')
@UseGuards(MediaDeviceAccessGuard)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
@ApiParam({ name: 'deviceId', format: 'uuid' })
export class TrackKeyTtlController {
  constructor(private readonly settings: TrackKeyTtlSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Текущий срок ключей мембраны этого прибора' })
  @ApiResponse({ status: 200, description: 'mode/seconds/liftedAt/liftedBy и действующий срок' })
  @ApiResponse({ status: 409, description: 'прибор не привязан к мембране — владельца нет' })
  async read(@Param('deviceId') deviceId: string): Promise<unknown> {
    return this.settings.describeForDevice(deviceId);
  }

  @Put()
  @ApiOperation({ summary: 'Сменить срок ключей мембраны — движение человека' })
  @ApiResponse({ status: 200, description: 'Записанная настройка и действующий срок' })
  @ApiResponse({ status: 400, description: 'снятие без подписи или величина сверх потолка' })
  @ApiResponse({ status: 409, description: 'прибор не привязан к мембране — владельца нет' })
  async write(
    @Param('deviceId') deviceId: string,
    @Body() body: WriteTrackKeyTtlDto,
  ): Promise<unknown> {
    return this.settings.writeForDevice(deviceId, body);
  }
}
