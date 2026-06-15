import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './session.guard';

/** Cabinet users with `role: admin` — tariff dataset curation (VDR1). */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.authUser;
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin role required');
    }
    return true;
  }
}
