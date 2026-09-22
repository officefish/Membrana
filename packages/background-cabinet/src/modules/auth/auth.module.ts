import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService, REGISTRATION_CODE_REDEEMER } from './auth.service';
import { SessionGuard } from '../../common/guards/session.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
// Клиент двери офиса — модуль сессии B (решение M2). Расширение границы C — явное (M3):
// без импорта модуля B у сервиса регистрации нет клиента для гашения кода.
// Имена ниже — по вердикту M2 (`office-registration.module.ts`, `office-registration-bridge.service.ts`,
// публичная поверхность через `index.ts`); сверить с PR сессии B перед слиянием — C сливается после B.
import { OfficeRegistrationBridgeService, OfficeRegistrationModule } from '../office-registration';

@Module({
  imports: [OfficeRegistrationModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionGuard,
    AdminGuard,
    // Порт гашения кода → сервис B. `useExisting`: один экземпляр клиента на приложение,
    // `AuthService` не знает путей модуля B во время выполнения (зубы — на подменном клиенте).
    { provide: REGISTRATION_CODE_REDEEMER, useExisting: OfficeRegistrationBridgeService },
  ],
  exports: [AuthService, SessionGuard, AdminGuard],
})
export class AuthModule {}
