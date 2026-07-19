/**
 * Триггеры снимка — ОТДЕЛЬНО от тела производителя (Р2, вердикт M2).
 *
 * Вебхук — только сигнал «пора снимать»: его payload сюда не попадает по
 * сигнатуре (`signal(kind)` принимает только род триггера). Тело снимка —
 * всегда свежий полный pull; накопление push-событий запрещено конструкцией.
 *
 * Вечерняя архивация после M3 редуцирована до такого же сигнала
 * (`evening-signal`) — своей дорожки записи она не ведёт.
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
   * ОДНУ последующую съёмку: тело — полный pull, одна досъёмка покрывает все
   * пропущенные сигналы (вебхуки и так могут теряться — снимок не считает их).
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
