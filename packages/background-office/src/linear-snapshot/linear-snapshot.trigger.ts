/**
 * Триггеры снимка на office — коалесценция сигналов перед вызовом media.
 * Payload вебхука в тело не попадает.
 */
import { Injectable, Logger } from '@nestjs/common';
import { LinearSnapshotService } from './linear-snapshot.service';
import type { LinearSnapshot, LinearSnapshotTrigger } from './linear-snapshot.types';

@Injectable()
export class LinearSnapshotTriggerService {
  private readonly logger = new Logger(LinearSnapshotTriggerService.name);

  private inFlight: Promise<LinearSnapshot> | null = null;
  private queued: Promise<LinearSnapshot> | null = null;

  constructor(private readonly producer: LinearSnapshotService) {}

  signal(trigger: LinearSnapshotTrigger): Promise<LinearSnapshot> {
    if (this.inFlight !== null) {
      if (this.queued === null) {
        this.logger.log({ trigger }, 'snapshot in flight — coalescing follow-up capture');
        this.queued = this.inFlight
          .catch(() => undefined)
          .then(() => {
            this.queued = null;
            return this.signal(trigger);
          });
      }
      return this.queued;
    }
    const run = this.producer.captureSnapshot(trigger).finally(() => {
      if (this.inFlight === run) {
        this.inFlight = null;
      }
    });
    this.inFlight = run;
    return run;
  }
}
