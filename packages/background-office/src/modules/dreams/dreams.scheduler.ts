import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { DreamsService } from './dreams.service';

@Injectable()
export class DreamsScheduler {
  private readonly logger = new Logger(DreamsScheduler.name);

  constructor(private readonly dreams: DreamsService) {}

  /** Каждый час UTC — один тик сна (M5: 24/сутки). Пропуск слота = skipped/slot-exists. */
  @Cron('0 * * * *', { name: 'dreams-hourly', timeZone: 'UTC' })
  async hourly(): Promise<void> {
    if (!this.dreams.isEnabled()) {
      this.logger.debug('dreams cron skipped (DREAMS_ENABLED off)');
      return;
    }
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const hour = now.getUTCHours();
    const result = await this.dreams.tick(day, hour);
    this.logger.log({ day, hour, ...result }, 'dreams hourly cron');
    // После тика часа 5 UTC — доставка дайджеста к ритуалу (окно ~утро).
    if (hour === 5) {
      const delivered = await this.dreams.deliverToRitual(day);
      this.logger.log(delivered, 'dreams digest delivered to ritual');
    }
  }
}
