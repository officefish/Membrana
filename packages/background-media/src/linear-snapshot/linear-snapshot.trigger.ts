/**
 * Триггеры снимка — ОТДЕЛЬНО от тела производителя.
 * Payload вебхука / office-trigger в тело не попадает: `signal(kind)` принимает
 * только род триггера. Тело — всегда свежий полный pull.
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

  /**
   * Сигнал «пора снимать». Сигналы во время идущей съёмки коалесцируются в
   * одну последующую съёмку.
   */
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
