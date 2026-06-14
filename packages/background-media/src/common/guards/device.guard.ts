import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeviceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const params = req.params as { deviceId?: string };
    const deviceId = params.deviceId;
    if (!deviceId) {
      throw new NotFoundException('deviceId required');
    }

    const headerId = req.headers['x-membrana-device-id'];
    if (typeof headerId === 'string' && headerId && headerId !== deviceId) {
      throw new NotFoundException('X-Membrana-Device-Id does not match path deviceId');
    }

    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }
    return true;
  }
}
