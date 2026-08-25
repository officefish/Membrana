import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { API_TOKEN_SECURITY } from '../../common/swagger/openapi.constants';
import { DeployPreflightService, type LastSampleProbeDto } from './deploy-preflight.service';

@ApiTags('Deploy preflight')
@Controller('v1/deploy-preflight')
@UseGuards(ApiTokenGuard)
@ApiSecurity(API_TOKEN_SECURITY)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
export class DeployPreflightController {
  constructor(private readonly preflight: DeployPreflightService) {}

  @Get('last-sample')
  @ApiOperation({ summary: 'Latest accepted sample timestamp for deploy live-session guard (#2048)' })
  @ApiResponse({ status: 200, description: '{ lastSampleAt, sampleId, deviceId }' })
  lastSample(): Promise<LastSampleProbeDto> {
    return this.preflight.lastSample();
  }
}
