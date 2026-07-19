/**
 * Модуль производителя снимков Linear (Р2, блок snapshot-cold-migration).
 *
 * ВНИМАНИЕ: в app.module.ts НЕ проводится — провод (импорт модуля, маршрут
 * вебхук-триггера, расписание вечернего сигнала) вносится на интеграции
 * коворка cowork-execution-registry, не в изолированной фазе.
 */
import { Module } from '@nestjs/common';
import {
  LinearSnapshotGraphqlSource,
  LinearSnapshotService,
} from './linear-snapshot.service';
import { LinearSnapshotTriggerService } from './linear-snapshot.trigger';
import { LINEAR_SNAPSHOT_SOURCE } from './linear-snapshot.types';

@Module({
  providers: [
    { provide: LINEAR_SNAPSHOT_SOURCE, useClass: LinearSnapshotGraphqlSource },
    LinearSnapshotService,
    LinearSnapshotTriggerService,
  ],
  exports: [LinearSnapshotService, LinearSnapshotTriggerService],
})
export class LinearSnapshotModule {}
