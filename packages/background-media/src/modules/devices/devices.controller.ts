import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { MediaDeviceAccessGuard } from '../../common/guards/media-device-access.guard';
import { DevicesService } from './devices.service';
import {
  ClientDeviceKeyResponseDto,
  DeviceMembraneSyncResponseDto,
  DeviceResponseDto,
  PatchDeviceMembraneContextDto,
  QuotaResponseDto,
  RegisterDeviceDto,
  RegisterDeviceResponseDto,
} from './devices.dto';
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
      // Сырым: гейт параметров проверяет сервис, а не форма DTO (#2308).
      ...(membrane.bufferPolicy !== undefined ? { bufferPolicy: membrane.bufferPolicy } : {}),
    };
  }

  @Post()
  @UseGuards(ApiTokenGuard)
  @ApiSecurity(API_TOKEN_SECURITY)
  @ApiOperation({ summary: 'Register a new field node (device)' })
  @ApiHeader({ name: 'X-Membrana-Token', required: true })
  @ApiResponse({ status: 201, description: 'Device registered; raw client key is returned once', type: RegisterDeviceResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or missing token', type: ApiErrorBodyDto })
  @ApiBadRequest()
  async register(@Body() body: RegisterDeviceDto) {
    const { device, clientKey } = await this.devices.register(
      body.name,
      body.kind,
      this.parseMembraneContext(body.membrane),
    );
    return {
      id: device.id,
      name: device.name,
      kind: device.kind,
      createdAt: device.createdAt.toISOString(),
      clientKey: {
        keyId: clientKey.keyId,
        raw: clientKey.raw,
        createdAt: clientKey.createdAt.toISOString(),
        rotatedFrom: null,
      },
    };
  }

  @Get(':deviceId')
  @UseGuards(MediaDeviceAccessGuard)
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
  @ApiOperation({
    summary: 'Sync membrane tariff limits and buffer overflow policy for paired device (cabinet internal)',
    description:
      'Domain refusal is `200 { ok:false, reason }`; nothing is written then. Reasons, in check order: `smart_cleanup_unavailable` — the smart-cleanup availability gate (#2318, off until the T12 algorithm exists; judged BEFORE params completeness), then the params gate (#2308). 4xx stay with transport.',
  })
  @ApiParam({ name: 'deviceId', format: 'uuid' })
  @ApiHeader({ name: 'X-Membrana-Token', required: true })
  @ApiResponse({ status: 200, type: DeviceMembraneSyncResponseDto })
  @ApiStandardErrors()
  async syncMembrane(
    @Param('deviceId') deviceId: string,
    @Body() body: PatchDeviceMembraneContextDto,
  ): Promise<DeviceMembraneSyncResponseDto> {
    const result = await this.devices.syncMembraneContext(
      deviceId,
      this.parseMembraneContext(body.membrane)!,
    );
    if (!result.ok) return { ok: false, reason: result.reason };
    const { device } = result;
    return {
      ok: true,
      id: device.id,
      name: device.name,
      kind: device.kind,
      createdAt: device.createdAt.toISOString(),
      bufferPolicy: result.bufferPolicy,
    };
  }

  @Post(':deviceId/client-key')
  @UseGuards(ApiTokenGuard, DeviceGuard)
  @ApiSecurity(API_TOKEN_SECURITY)
  @ApiOperation({ summary: 'Issue/rotate client media key for paired device (raw key is returned once)' })
  @ApiParam({ name: 'deviceId', format: 'uuid' })
  @ApiHeader({ name: 'X-Membrana-Token', required: true })
  @ApiResponse({ status: 201, type: ClientDeviceKeyResponseDto })
  @ApiStandardErrors()
  async issueClientKey(@Param('deviceId') deviceId: string) {
    const key = await this.devices.issueClientKey(deviceId);
    return {
      keyId: key.keyId,
      raw: key.raw,
      createdAt: key.createdAt.toISOString(),
      rotatedFrom: key.rotatedFrom,
    };
  }

  @Delete(':deviceId/client-key')
  @HttpCode(200)
  @UseGuards(ApiTokenGuard, DeviceGuard)
  @ApiSecurity(API_TOKEN_SECURITY)
  @ApiOperation({ summary: 'Revoke active client media key for paired device' })
  @ApiParam({ name: 'deviceId', format: 'uuid' })
  @ApiHeader({ name: 'X-Membrana-Token', required: true })
  @ApiResponse({ status: 200, description: '{ outcome: revoked | no_active_key }' })
  @ApiStandardErrors()
  revokeClientKey(@Param('deviceId') deviceId: string) {
    return this.devices.revokeClientKey(deviceId);
  }

  @Get(':deviceId/quota')
  @UseGuards(MediaDeviceAccessGuard)
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
