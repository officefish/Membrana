import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { DeviceGuard } from '../../common/guards/device.guard';
import { CollectionsService } from './collections.service';

class CreateCollectionBody {
  name!: string;
}

@ApiTags('Collections')
@Controller('v1/devices/:deviceId/collections')
@UseGuards(ApiTokenGuard, DeviceGuard)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
@ApiHeader({ name: 'X-Membrana-Device-Id', required: false })
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List collections for device' })
  list(@Param('deviceId') deviceId: string) {
    return this.collections.list(deviceId);
  }

  @Post()
  @ApiOperation({ summary: 'Create user collection' })
  create(@Param('deviceId') deviceId: string, @Body() body: CreateCollectionBody) {
    return this.collections.createUser(deviceId, body.name);
  }

  @Post('ensure-reserved')
  @ApiOperation({ summary: 'Ensure buffer and system benchmark collections exist' })
  ensureReserved(@Param('deviceId') deviceId: string) {
    return this.collections.ensureReserved(deviceId);
  }

  @Delete(':collectionId')
  @ApiOperation({ summary: 'Delete user collection' })
  async remove(
    @Param('deviceId') deviceId: string,
    @Param('collectionId') collectionId: string,
  ) {
    await this.collections.delete(deviceId, collectionId);
    return { ok: true };
  }
}
