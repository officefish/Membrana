import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionGuard } from '../../common/guards/session.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionGuard, AdminGuard],
  exports: [AuthService, SessionGuard, AdminGuard],
})
export class AuthModule {}
