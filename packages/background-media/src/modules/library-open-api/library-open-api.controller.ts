/**
 * Дверь открытого API библиотеки (#2271) — три ручки вердикта M2.
 *
 * ПОЧЕМУ ОТДЕЛЬНОЕ МОНТИРОВАНИЕ `/v1/open`. Вердикт M2 назвал пути `/v1/devices/:deviceId/...`,
 * не зная, что они ЗАНЯТЫ: те же три адреса обслуживает внутреннее API прибора — другая
 * авторизация (ключ узла, привязанный к прибору) и другая форма ответа (`totalPages`, без
 * ключей). Поставить дверь туда же значило бы получить тихое затенение маршрута: Nest
 * зарегистрирует оба, победит первый, и снаружи станет непредсказуемо, чей контракт отвечает.
 *
 * Слоя трансляции при этом нет — структура пути сохранена целиком
 * (`devices/:deviceId/collections/:collectionId/samples`), меняется только точка монтирования.
 * Отступление от буквы M2 решено владельцем 03.09 и записано здесь явно, как записано
 * решение о двух полях ключа: посылка вердикта о свободных путях была ложной, и обнаружил это
 * код, а не комната.
 *
 * ПОРЯДОК ПРОВЕРОК — существование, потом владение — живёт в `open-api-access.ts` и проверен
 * там перебором. Контроллер его ЗОВЁТ, а своей копии правила не заводит.
 *
 * ФОРМА ОТВЕТА берётся из пакета `@membrana/media-library-service` ДИНАМИЧЕСКИМ импортом:
 * пакет ESM, а этот — CommonJS, и статический импорт даёт `require()` к ESM-модулю (`TS1479`,
 * поймано CI на #2267). Граница между пакетами не видна изнутри ни одного из них.
 */
import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';

import { MediaDeviceAccessGuard } from '../../common/guards/media-device-access.guard';

import { LibraryOpenApiService } from './library-open-api.service';
import { NoStoreInterceptor } from './no-store.interceptor';
import { statusForAccess, type OpenApiAccess } from './open-api-access';

/** Заголовок, которым обратившийся называет свою мембрану. */
export const CALLER_MEMBRANE_HEADER = 'x-membrana-membrane-id';

@ApiTags('Library Open API')
@Controller('v1/open/devices/:deviceId')
@UseGuards(MediaDeviceAccessGuard)
@UseInterceptors(NoStoreInterceptor)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
@ApiHeader({
  name: 'X-Membrana-Membrane-Id',
  required: true,
  description: 'Мембрана обратившегося. Ось владения — она, не прибор и не набор (вердикт M1).',
})
@ApiParam({ name: 'deviceId', format: 'uuid' })
export class LibraryOpenApiController {
  constructor(private readonly service: LibraryOpenApiService) {}

  @Get('collections')
  @ApiOperation({ summary: 'Наборы прибора — только свои, по оси владения' })
  @ApiResponse({ status: 200, description: 'items/total/page/limit; флага полноты нет намеренно' })
  @ApiResponse({ status: 403, description: 'прибор есть, но принадлежит другой мембране' })
  @ApiResponse({ status: 404, description: 'прибора нет' })
  async collections(
    @Param('deviceId') deviceId: string,
    @Headers(CALLER_MEMBRANE_HEADER) caller: string | undefined,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    const access = await this.service.accessTo(deviceId, caller ?? null);
    refuseUnless(access);
    return this.service.listCollections(deviceId, page, limit);
  }

  @Get('collections/:collectionId/samples')
  @ApiOperation({ summary: 'Пробы набора со ссылками — тело является связкой ключей' })
  @ApiParam({ name: 'collectionId' })
  @ApiResponse({ status: 200, description: 'items/total/page/limit; у каждой пробы trackUrl и trackUrlExpiresAt' })
  @ApiResponse({ status: 403, description: 'прибор есть, но принадлежит другой мембране' })
  @ApiResponse({ status: 404, description: 'прибора или набора нет' })
  async samples(
    @Param('deviceId') deviceId: string,
    @Param('collectionId') collectionId: string,
    @Headers(CALLER_MEMBRANE_HEADER) caller: string | undefined,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    // Набор проверяется ТОЙ ЖЕ дорогой: прибор → существование набора. Разложить проверку
    // по ручкам значило бы завести копии правила разведения 404/403.
    const access = await this.service.accessToCollection(deviceId, caller ?? null, collectionId);
    refuseUnless(access);
    return this.service.listSamples(deviceId, collectionId, page, limit);
  }

  @Get('samples/:sampleId/blob')
  @ApiOperation({ summary: 'Файл пробы. Ключ пробы — sampleId, не изменяемый title' })
  @ApiParam({ name: 'sampleId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Поток байтов' })
  @ApiResponse({ status: 403, description: 'прибор есть, но принадлежит другой мембране' })
  @ApiResponse({ status: 404, description: 'прибора или пробы нет' })
  async blob(
    @Param('deviceId') deviceId: string,
    @Param('sampleId') sampleId: string,
    @Headers(CALLER_MEMBRANE_HEADER) caller: string | undefined,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const access = await this.service.accessTo(deviceId, caller ?? null);
    refuseUnless(access);
    const { stream, contentType } = await this.service.blob(deviceId, sampleId);
    void reply.header('Content-Type', contentType);
    void reply.send(stream);
  }
}

/**
 * Отказ по исходу — ОДНОЙ дорогой на все три ручки.
 *
 * Разложить это по ручкам значило бы завести три копии правила разведения `403`/`404`; одна из
 * них однажды разъедется, и разъедется молча.
 */
function refuseUnless(access: OpenApiAccess): void {
  if (access === 'allow') return;
  const status = statusForAccess(access);
  if (status === 404) throw new NotFoundException('нет такого прибора');
  throw new ForbiddenException('прибор принадлежит другой мембране');
}
