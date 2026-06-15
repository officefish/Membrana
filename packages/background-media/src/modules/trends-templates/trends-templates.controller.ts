import { Body, Controller, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
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
import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { DeviceGuard } from '../../common/guards/device.guard';
import { TrendsTemplatePackDto } from './trends-templates.dto';
import { TrendsTemplatesService } from './trends-templates.service';

@ApiTags('Trends templates')
@Controller('v1/devices/:deviceId/trends-templates')
@UseGuards(ApiTokenGuard, DeviceGuard)
@ApiSecurity(API_TOKEN_SECURITY)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
@ApiParam({ name: 'deviceId', format: 'uuid' })
export class TrendsTemplatesController {
  constructor(private readonly templates: TrendsTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get trends template pack for device' })
  @ApiResponse({ status: 200, type: TrendsTemplatePackDto })
  @ApiStandardErrors()
  getPack(@Param('deviceId') deviceId: string) {
    return this.templates.getPack(deviceId);
  }

  @Put()
  @ApiOperation({ summary: 'Replace entire trends template pack' })
  @ApiResponse({ status: 200, type: TrendsTemplatePackDto })
  @ApiStandardErrors()
  @ApiBadRequest()
  replace(@Param('deviceId') deviceId: string, @Body() body: TrendsTemplatePackDto) {
    return this.templates.replacePack(deviceId, body);
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Upsert one user template by key' })
  @ApiParam({ name: 'key', example: 'user:my-template' })
  @ApiResponse({ status: 200, type: TrendsTemplatePackDto })
  @ApiStandardErrors()
  @ApiBadRequest()
  upsert(
    @Param('deviceId') deviceId: string,
    @Param('key') key: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.templates.upsertOne(deviceId, key, body);
  }
}
