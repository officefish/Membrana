import { Module } from '@nestjs/common';

import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { TaskArchiveAuditService, TaskArchiveCheckpointService } from './checkpoint';
import {
  MemoryTaskArchiveStore,
  MongoTaskArchiveStore,
  TASK_ARCHIVE_STORE,
  TaskArchiveController,
  TaskArchiveService,
} from './notary';

@Module({
  controllers: [TaskArchiveController],
  providers: [
    MemoryTaskArchiveStore,
    MongoTaskArchiveStore,
    TaskArchiveService,
    TaskArchiveCheckpointService,
    TaskArchiveAuditService,
    {
      provide: TASK_ARCHIVE_STORE,
      inject: [APP_CONFIG, MemoryTaskArchiveStore, MongoTaskArchiveStore],
      useFactory: (
        config: AppConfig,
        memoryStore: MemoryTaskArchiveStore,
        mongoStore: MongoTaskArchiveStore,
      ) => (config.TASK_ARCHIVE_MONGO_URI ? mongoStore : memoryStore),
    },
  ],
  exports: [TaskArchiveService, TaskArchiveCheckpointService, TaskArchiveAuditService],
})
export class TaskArchiveModule {}
