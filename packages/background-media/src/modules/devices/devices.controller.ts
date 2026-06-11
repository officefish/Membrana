import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DeviceKind } from '@prisma/client';
import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { DeviceGuard } from '../../common/guards/device.guard';
import { DevicesService } from './devices.service';

class RegisterDeviceBody {
  name!: string;
  kind!: DeviceKind;
}

@ApiTags('Devices')
@Controller('v1/devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  @UseGuards(ApiTokenGuard)
  @ApiOperation({ summary: 'Register a new field node (device)' })
  @ApiHeader({ name: 'X-Membrana-Token', required: true })
  async register(@Body() body: RegisterDeviceBody) {
    const device = await this.devices.register(body.name, body.kind);
    return {
      id: device.id,
      name: device.name,
      kind: device.kind,
      createdAt: device.createdAt.toISOString(),
    };
  }

  @Get(':deviceId')
  @UseGuards(ApiTokenGuard, DeviceGuard)
  @ApiOperation({ summary: 'Get device metadata' })
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

  @Get(':deviceId/quota')
  @UseGuards(ApiTokenGuard, DeviceGuard)
  @ApiOperation({ summary: 'Storage quota for device' })
  async quota(@Param('deviceId') deviceId: string) {
    return this.devices.getQuota(deviceId);
  }
}
