import { Module } from '@nestjs/common';
import { LinearSnapshotController } from './linear-snapshot.controller';
import {
  LinearSnapshotGraphqlSource,
  LinearSnapshotService,
} from './linear-snapshot.service';
import { LinearSnapshotTriggerService } from './linear-snapshot.trigger';
import { LINEAR_SNAPSHOT_SOURCE } from './linear-snapshot.types';

@Module({
  controllers: [LinearSnapshotController],
  providers: [
    { provide: LINEAR_SNAPSHOT_SOURCE, useClass: LinearSnapshotGraphqlSource },
    LinearSnapshotService,
    LinearSnapshotTriggerService,
  ],
  exports: [LinearSnapshotService, LinearSnapshotTriggerService],
})
export class LinearSnapshotModule {}
