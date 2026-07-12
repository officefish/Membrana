import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { NightTriageService } from './night-triage.service';

@Injectable()
export class NightTriageScheduler {
  private readonly logger = new Logger(NightTriageScheduler.name);

  constructor(private readonly nightTriage: NightTriageService) {}

  /** 23:30 UTC = 02:30 МСК (окно 02:00–04:00 из брифа). */
  @Cron('30 23 * * *', { name: 'night-triage', timeZone: 'UTC' })
  async nightly(): Promise<void> {
    if (!this.nightTriage.isEnabled()) {
      this.logger.debug('night-triage cron skipped (disabled)');
      return;
    }
    const result = await this.nightTriage.run();
    this.logger.log({ ...result }, 'night-triage cron finished');
  }
}
