import { Module } from '@nestjs/common';

import { PanelAuthModule } from '../panel-auth/panel-auth.module';
import { ColdArchiveSweepClient } from './cold-archive-sweep.client';
import { ColdArchiveSweepController } from './cold-archive-sweep.controller';
import { ColdArchiveSweepScheduler } from './cold-archive-sweep.scheduler';

/**
 * Модуль уборки холодного архива (#2588 b6): клиент к двери media, ежечасный пусковик с двумя
 * флагами и ручка панели sweep-preview. `ScheduleModule.forRoot()` поднимает `app.module.ts`
 * (вне test), `PanelAuthModule` даёт охрану ручки, `AppConfigModule` глобален. Подменный транспорт
 * `COLD_ARCHIVE_SWEEP_FETCH` здесь не провайдится — в графе приложения клиент берёт прокси-обвязку сам.
 */
@Module({
  imports: [PanelAuthModule],
  controllers: [ColdArchiveSweepController],
  providers: [ColdArchiveSweepClient, ColdArchiveSweepScheduler],
})
export class ColdArchiveSweepModule {}
