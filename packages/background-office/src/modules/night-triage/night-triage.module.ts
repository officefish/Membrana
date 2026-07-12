import { Module } from '@nestjs/common';

import { ClaudeModule } from '../claude/claude.module';
import { GithubModule } from '../github/github.module';
import { NightTriageController } from './night-triage.controller';
import { NightTriageScheduler } from './night-triage.scheduler';
import { NightTriageService } from './night-triage.service';

@Module({
  imports: [GithubModule, ClaudeModule],
  controllers: [NightTriageController],
  providers: [NightTriageService, NightTriageScheduler],
  exports: [NightTriageService],
})
export class NightTriageModule {}
