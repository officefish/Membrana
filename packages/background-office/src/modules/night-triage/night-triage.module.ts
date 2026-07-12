import { Module } from '@nestjs/common';

import { GithubModule } from '../github/github.module';
import { OpenRouterModule } from '../openrouter/openrouter.module';
import { NightTriageController } from './night-triage.controller';
import { NightTriageScheduler } from './night-triage.scheduler';
import { NightTriageService } from './night-triage.service';

@Module({
  imports: [GithubModule, OpenRouterModule],
  controllers: [NightTriageController],
  providers: [NightTriageService, NightTriageScheduler],
  exports: [NightTriageService],
})
export class NightTriageModule {}
