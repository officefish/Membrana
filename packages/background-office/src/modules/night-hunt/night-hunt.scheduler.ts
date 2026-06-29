import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NightHuntService } from './night-hunt.service';

@Injectable()
export class NightHuntScheduler {
  private readonly logger = new Logger(NightHuntScheduler.name);

  constructor(private readonly nightHunt: NightHuntService) {}

  @Cron('0 7 * * 3', { name: 'night-hunt-design-token-drift', timeZone: 'UTC' })
  async designTokenDrift(): Promise<void> {
    await this.safeRun('design-token-drift');
  }

  @Cron('0 11 * * 1', { name: 'night-hunt-services-api', timeZone: 'UTC' })
  async servicesApiDrift(): Promise<void> {
    await this.safeRun('services-api-contract-drift');
  }

  @Cron('30 8 * * 2', { name: 'night-hunt-graph', timeZone: 'UTC' })
  async graphDrift(): Promise<void> {
    await this.safeRun('monorepo-dependency-graph');
  }

  private async safeRun(jobId: 'design-token-drift' | 'services-api-contract-drift' | 'monorepo-dependency-graph'): Promise<void> {
    if (!this.nightHunt.isEnabled()) {
      this.logger.debug('night-hunt cron skipped (disabled)');
      return;
    }
    const result = await this.nightHunt.runJob(jobId);
    this.logger.log({ jobId, ...result }, 'night-hunt cron finished');
  }
}
