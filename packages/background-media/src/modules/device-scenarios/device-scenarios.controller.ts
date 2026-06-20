import { Body, Controller, Get, NotFoundException, Param, Put, UseGuards } from '@nestjs/common';
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
import { DeviceScenarioRecordDto } from './device-scenarios.dto';
import { DeviceScenariosService } from './device-scenarios.service';

@ApiTags('Device scenarios')
@Controller('v1/devices/:deviceId/device-scenario')
@UseGuards(ApiTokenGuard, DeviceGuard)
@ApiSecurity(API_TOKEN_SECURITY)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
@ApiParam({ name: 'deviceId', format: 'uuid' })
export class DeviceScenariosController {
  constructor(private readonly scenarios: DeviceScenariosService) {}

  @Get()
  @ApiOperation({ summary: 'Get device-scenario document for device' })
  @ApiResponse({ status: 200, type: DeviceScenarioRecordDto })
  @ApiStandardErrors()
  async getScenario(@Param('deviceId') deviceId: string) {
    const record = await this.scenarios.getScenario(deviceId);
    if (record === null) {
      throw new NotFoundException('Device scenario not found');
    }
    return record;
  }

  @Put()
  @ApiOperation({ summary: 'Replace device-scenario document' })
  @ApiResponse({ status: 200, type: DeviceScenarioRecordDto })
  @ApiStandardErrors()
  @ApiBadRequest()
  putScenario(@Param('deviceId') deviceId: string, @Body() body: Record<string, unknown>) {
    return this.scenarios.putScenario(deviceId, body);
  }
}
