import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import { NodeKeyService } from '../../modules/firebat-node/node-key.service';
import { DeviceGuard } from './device.guard';

@Injectable()
export class MediaDeviceAccessGuard implements CanActivate {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly deviceGuard: DeviceGuard,
    private readonly keys: NodeKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const token = req.headers['x-membrana-token'];
    if (typeof token !== 'string' || !token) {
      throw new UnauthorizedException('Missing X-Membrana-Token header');
    }

    if (token === this.config.API_INTERNAL_TOKEN) {
      return this.deviceGuard.canActivate(context);
    }

    const deviceId = (req.params as { deviceId?: string }).deviceId;
    if (!deviceId) throw new ForbiddenException('deviceId required');
    const res = await this.keys.verify(token, deviceId, { audience: 'client' });
    switch (res.verdict) {
      case 'ok':
        return this.deviceGuard.canActivate(context);
      case 'foreign_device':
        throw new ForbiddenException('client media key belongs to another device');
      case 'foreign_audience':
        throw new ForbiddenException('client media key audience mismatch');
      case 'revoked':
        throw new UnauthorizedException('client media key revoked');
      default:
        throw new UnauthorizedException('Invalid token');
    }
  }
}
