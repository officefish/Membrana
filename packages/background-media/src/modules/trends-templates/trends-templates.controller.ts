import { Body, Controller, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { DeviceGuard } from '../../common/guards/device.guard';
import {
  TrendsTemplatesService,
  type TrendsTemplatePackDto,
} from './trends-templates.service';

@ApiTags('Trends templates')
@Controller('v1/devices/:deviceId/trends-templates')
@UseGuards(ApiTokenGuard, DeviceGuard)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
export class TrendsTemplatesController {
  constructor(private readonly templates: TrendsTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get trends template pack for device' })
  getPack(@Param('deviceId') deviceId: string) {
    return this.templates.getPack(deviceId);
  }

  @Put()
  @ApiOperation({ summary: 'Replace entire trends template pack' })
  replace(@Param('deviceId') deviceId: string, @Body() body: TrendsTemplatePackDto) {
    return this.templates.replacePack(deviceId, body);
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Upsert one user template by key' })
  upsert(
    @Param('deviceId') deviceId: string,
    @Param('key') key: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.templates.upsertOne(deviceId, key, body);
  }
}
