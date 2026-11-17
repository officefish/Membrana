import { Module } from '@nestjs/common';

import { OfficeTokenGuard } from '../../common/guards/office-token.guard';
import { ArchiveRetentionModule } from '../archive-retention/archive-retention.module';
import { OfficeUsersController } from './office-users.controller';
import { OfficeUsersService } from './office-users.service';

/**
 * Модуль служебной двери кабинета для office (#2588 b2). Тянет `ArchiveRetentionModule` (b1)
 * в граф приложения — до этого модуля store жил без провода. `PrismaModule` и `AppConfigModule`
 * глобальны (`@Global()`), импортировать не надо.
 */
@Module({
  imports: [ArchiveRetentionModule],
  controllers: [OfficeUsersController],
  providers: [OfficeUsersService, OfficeTokenGuard],
})
export class OfficeUsersModule {}
