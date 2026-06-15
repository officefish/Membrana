import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthService } from '../../modules/auth/auth.service';
import type { AuthUser } from '../../modules/auth/auth.types';

export type AuthenticatedRequest = FastifyRequest & { authUser?: AuthUser };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }
    const user = await this.authService.validateSessionToken(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }
    req.authUser = user;
    return true;
  }

  private extractBearerToken(req: FastifyRequest): string | null {
    const header = req.headers.authorization;
    if (typeof header !== 'string') return null;
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    const token = match?.[1]?.trim();
    return token || null;
  }
}
