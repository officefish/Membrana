/**
 * Ручки управляемой уборки буфера (#2204, часть 2/4).
 *
 * ДВА ВХОДА, И ОНИ НЕ РАВНОСИЛЬНЫ. `plan` ничего не меняет и его можно звать сколько угодно.
 * `execute` необратим, поэтому принимает только явный список идентификаторов — «удали сто
 * ранних» одним запросом сделать нельзя. Показ списка человеку встроен в путь, а не оставлен
 * на совесть интерфейса.
 */
import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

import { ApiBadRequest, ApiStandardErrors } from '../../common/swagger/api-decorators';
import { API_TOKEN_SECURITY } from '../../common/swagger/openapi.constants';
import { MediaDeviceAccessGuard } from '../../common/guards/media-device-access.guard';
import { BufferCleanupService } from './buffer-cleanup.service';
import {
  CleanupExecuteDto,
  CleanupExecuteResponseDto,
  CleanupPlanDto,
  CleanupPlanResponseDto,
} from './buffer-cleanup.dto';

@ApiTags('buffer-cleanup')
@Controller('v1/devices/:deviceId/collections/:collectionId/buffer-cleanup')
@UseGuards(MediaDeviceAccessGuard)
@ApiSecurity(API_TOKEN_SECURITY)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
@ApiParam({ name: 'deviceId', format: 'uuid' })
@ApiParam({ name: 'collectionId' })
export class BufferCleanupController {
  constructor(private readonly cleanup: BufferCleanupService) {}

  @Post('plan')
  @ApiOperation({ summary: 'What would leave the buffer: list, protected ones, freed bytes' })
  @ApiResponse({ status: 201, type: CleanupPlanResponseDto })
  @ApiStandardErrors()
  @ApiBadRequest()
  plan(
    @Param('deviceId') deviceId: string,
    @Param('collectionId') collectionId: string,
    @Body() body: CleanupPlanDto,
  ) {
    return this.cleanup.plan(deviceId, collectionId, body.principle, Number(body.volume));
  }

  @Post('execute')
  @ApiOperation({ summary: 'Delete exactly the listed samples (the list comes from a shown plan)' })
  @ApiResponse({ status: 201, type: CleanupExecuteResponseDto })
  @ApiStandardErrors()
  @ApiBadRequest()
  execute(
    @Param('deviceId') deviceId: string,
    @Param('collectionId') collectionId: string,
    @Body() body: CleanupExecuteDto,
  ) {
    return this.cleanup.execute(deviceId, collectionId, body.sampleIds ?? []);
  }
}
