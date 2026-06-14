import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiBadRequest, ApiStandardErrors } from '../../common/swagger/api-decorators';
import { OkResponseDto } from '../../common/swagger/common.dto';
import { API_TOKEN_SECURITY } from '../../common/swagger/openapi.constants';
import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { DeviceGuard } from '../../common/guards/device.guard';
import { CollectionResponseDto, CreateCollectionDto } from './collections.dto';
import { CollectionsService } from './collections.service';

@ApiTags('Collections')
@Controller('v1/devices/:deviceId/collections')
@UseGuards(ApiTokenGuard, DeviceGuard)
@ApiSecurity(API_TOKEN_SECURITY)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
@ApiHeader({ name: 'X-Membrana-Device-Id', required: false })
@ApiParam({ name: 'deviceId', format: 'uuid' })
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List collections for device' })
  @ApiResponse({ status: 200, type: [CollectionResponseDto] })
  @ApiStandardErrors()
  list(@Param('deviceId') deviceId: string) {
    return this.collections.list(deviceId);
  }

  @Post()
  @ApiOperation({ summary: 'Create user collection' })
  @ApiResponse({ status: 201, type: CollectionResponseDto })
  @ApiStandardErrors()
  @ApiBadRequest()
  create(@Param('deviceId') deviceId: string, @Body() body: CreateCollectionDto) {
    return this.collections.createUser(deviceId, body.name);
  }

  @Post('ensure-reserved')
  @ApiOperation({ summary: 'Ensure buffer and tariff dataset collections exist' })
  @ApiResponse({ status: 200, type: [CollectionResponseDto] })
  @ApiStandardErrors()
  ensureReserved(@Param('deviceId') deviceId: string) {
    return this.collections.ensureReserved(deviceId);
  }

  @Delete(':collectionId')
  @ApiOperation({ summary: 'Delete user collection' })
  @ApiParam({ name: 'collectionId' })
  @ApiResponse({ status: 200, type: OkResponseDto })
  @ApiStandardErrors()
  @ApiBadRequest()
  async remove(
    @Param('deviceId') deviceId: string,
    @Param('collectionId') collectionId: string,
  ) {
    await this.collections.delete(deviceId, collectionId);
    return { ok: true };
  }
}
