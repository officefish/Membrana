import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiBadRequest, ApiStandardErrors } from '../../common/swagger/api-decorators';
import { ApiErrorBodyDto } from '../../common/swagger/common.dto';
import { API_TOKEN_SECURITY } from '../../common/swagger/openapi.constants';
import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { DeviceGuard } from '../../common/guards/device.guard';
import { DevicesService } from './devices.service';
import { DeviceResponseDto, PatchDeviceMembraneContextDto, QuotaResponseDto, RegisterDeviceDto } from './devices.dto';
import type { DeviceMembraneContext } from './devices.service';

@ApiTags('Devices')
@Controller('v1/devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  private parseMembraneContext(
    membrane: RegisterDeviceDto['membrane'],
  ): DeviceMembraneContext | undefined {
    if (!membrane?.membraneId) return undefined;
    return {
      membraneId: membrane.membraneId,
      userStorageQuotaBytes: membrane.userStorageQuotaBytes,
      bufferQuotaBytes: membrane.bufferQuotaBytes,
      datasetCatalogId: membrane.datasetCatalogId,
      maxUserWorkspaces: membrane.maxUserWorkspaces,
    };
  }

  @Post()
  @UseGuards(ApiTokenGuard)
  @ApiSecurity(API_TOKEN_SECURITY)
  @ApiOperation({ summary: 'Register a new field node (device)' })
  @ApiHeader({ name: 'X-Membrana-Token', required: true })
  @ApiResponse({ status: 201, description: 'Device registered', type: DeviceResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or missing token', type: ApiErrorBodyDto })
  @ApiBadRequest()
  async register(@Body() body: RegisterDeviceDto) {
    const device = await this.devices.register(
      body.name,
      body.kind,
      this.parseMembraneContext(body.membrane),
    );
    return {
      id: device.id,
      name: device.name,
      kind: device.kind,
      createdAt: device.createdAt.toISOString(),
    };
  }

  @Get(':deviceId')
  @UseGuards(ApiTokenGuard, DeviceGuard)
  @ApiSecurity(API_TOKEN_SECURITY)
  @ApiOperation({ summary: 'Get device metadata' })
  @ApiParam({ name: 'deviceId', format: 'uuid' })
  @ApiHeader({ name: 'X-Membrana-Token', required: true })
  @ApiHeader({ name: 'X-Membrana-Device-Id', required: false })
  @ApiResponse({ status: 200, type: DeviceResponseDto })
  @ApiStandardErrors()
  async getOne(@Param('deviceId') deviceId: string) {
    const device = await this.devices.getById(deviceId);
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }
    return {
      id: device.id,
      name: device.name,
      kind: device.kind,
      createdAt: device.createdAt.toISOString(),
    };
  }

  @Patch(':deviceId/membrane')
  @UseGuards(ApiTokenGuard, DeviceGuard)
  @ApiSecurity(API_TOKEN_SECURITY)
  @ApiOperation({ summary: 'Sync membrane tariff limits for paired device (cabinet internal)' })
  @ApiParam({ name: 'deviceId', format: 'uuid' })
  @ApiHeader({ name: 'X-Membrana-Token', required: true })
  @ApiResponse({ status: 200, type: DeviceResponseDto })
  @ApiStandardErrors()
  async syncMembrane(
    @Param('deviceId') deviceId: string,
    @Body() body: PatchDeviceMembraneContextDto,
  ) {
    const device = await this.devices.syncMembraneContext(
      deviceId,
      this.parseMembraneContext(body.membrane)!,
    );
    return {
      id: device.id,
      name: device.name,
      kind: device.kind,
      createdAt: device.createdAt.toISOString(),
    };
  }

  @Get(':deviceId/quota')
  @UseGuards(ApiTokenGuard, DeviceGuard)
  @ApiSecurity(API_TOKEN_SECURITY)
  @ApiOperation({ summary: 'Storage quota for device' })
  @ApiParam({ name: 'deviceId', format: 'uuid' })
  @ApiHeader({ name: 'X-Membrana-Token', required: true })
  @ApiResponse({ status: 200, type: QuotaResponseDto })
  @ApiStandardErrors()
  async quota(@Param('deviceId') deviceId: string) {
    return this.devices.getQuota(deviceId);
  }
}
