/**
 * Модуль потребителя снимков на office.
 * GraphQL Linear здесь нет — съёмка делегируется media-NL (M1/M2).
 */
import { Module } from '@nestjs/common';
import { LinearSnapshotService } from './linear-snapshot.service';
import { LinearSnapshotTriggerService } from './linear-snapshot.trigger';
import { MediaSnapshotClient } from './media-snapshot.client';
import { LINEAR_SNAPSHOT_CAPTURE } from './linear-snapshot.types';

@Module({
  providers: [
    { provide: LINEAR_SNAPSHOT_CAPTURE, useClass: MediaSnapshotClient },
    LinearSnapshotService,
    LinearSnapshotTriggerService,
  ],
  exports: [LinearSnapshotService, LinearSnapshotTriggerService],
})
export class LinearSnapshotModule {}
