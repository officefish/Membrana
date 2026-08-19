/**
 * Выдача и отзыв ключа узла (ADR-0027 Р3). Обе ручки — под служебным токеном + DeviceGuard:
 * ключ выдаёт оператор сервера, не сам узел. Сырой ключ возвращается ОДИН раз.
 * Монтируется FirebatNodeModule (ревью #2003: модуль в b2, ручки узла добавит b3).
 */
import { ConflictException, Controller, Delete, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { DeviceGuard } from '../../common/guards/device.guard';
import { ApiErrorBodyDto } from '../../common/swagger/common.dto';
import { API_TOKEN_SECURITY } from '../../common/swagger/openapi.constants';
import { NodeKeyService } from './node-key.service';

@ApiTags('Firebat node')
@Controller('v1/devices/:deviceId/node-key')
@UseGuards(ApiTokenGuard, DeviceGuard)
@ApiSecurity(API_TOKEN_SECURITY)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
@ApiParam({ name: 'deviceId', format: 'uuid' })
export class NodeKeyController {
  constructor(private readonly keys: NodeKeyService) {}

  @Post()
  @ApiOperation({ summary: 'Issue node key for a device (raw key is returned once)' })
  @ApiQuery({ name: 'rotate', required: false, description: 'true — revoke the active key and issue a new one' })
  @ApiResponse({ status: 201, description: 'Key issued; `raw` is shown once' })
  @ApiResponse({ status: 409, description: 'Active key already exists (pass ?rotate=true)', type: ApiErrorBodyDto })
  @ApiResponse({ status: 401, description: 'Invalid or missing token', type: ApiErrorBodyDto })
  async issue(@Param('deviceId') deviceId: string, @Query('rotate') rotate?: string) {
    const res = await this.keys.issue(deviceId, { rotate: rotate === 'true' });
    if (res.outcome === 'already_active') {
      throw new ConflictException(`Active node key exists for device ${deviceId}; pass ?rotate=true to replace it`);
    }
    const { key } = res;
    return {
      deviceId: key.deviceId,
      keyId: key.keyId,
      raw: key.raw,
      createdAt: key.createdAt.toISOString(),
      rotatedFrom: key.rotatedFrom,
    };
  }

  @Delete()
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke the active node key (soft: revokedAt)' })
  @ApiResponse({ status: 200, description: '{ outcome: revoked | no_active_key }' })
  async revoke(@Param('deviceId') deviceId: string) {
    return this.keys.revoke(deviceId);
  }
}
