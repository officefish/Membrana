/**
 * Потребитель снимка на office: trigger → media-NL, без GraphQL Linear (M1).
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  LinearSnapshot,
  LinearSnapshotCapturePort,
  LinearSnapshotTrigger,
} from './linear-snapshot.types';
import { LINEAR_SNAPSHOT_CAPTURE } from './linear-snapshot.types';

@Injectable()
export class LinearSnapshotService {
  private readonly logger = new Logger(LinearSnapshotService.name);

  constructor(
    @Inject(LINEAR_SNAPSHOT_CAPTURE) private readonly capturePort: LinearSnapshotCapturePort,
  ) {}

  async captureSnapshot(trigger: LinearSnapshotTrigger): Promise<LinearSnapshot> {
    const snapshot = await this.capturePort.capture(trigger);
    this.logger.log(
      {
        trigger,
        recordCount: snapshot.header.recordCount,
        producedBy: snapshot.header.producedBy,
        sourceRevision: snapshot.header.sourceRevision,
      },
      'linear snapshot captured via media',
    );
    return snapshot;
  }

  snapshotFileName(snapshot: LinearSnapshot): string {
    return `linear-snapshot-${snapshot.header.capturedAt.replace(/[:.]/g, '-')}.json`;
  }

  writeSnapshot(snapshot: LinearSnapshot, dir: string): string {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const filePath = join(dir, this.snapshotFileName(snapshot));
    writeFileSync(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    return filePath;
  }
}
