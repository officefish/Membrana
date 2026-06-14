import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';

@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const token = req.headers['x-membrana-token'];
    if (typeof token !== 'string' || !token) {
      throw new UnauthorizedException('Missing X-Membrana-Token header');
    }
    if (token !== this.config.API_INTERNAL_TOKEN) {
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }
}
