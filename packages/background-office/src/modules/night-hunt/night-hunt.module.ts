import { Module } from '@nestjs/common';
import { ClaudeModule } from '../claude/claude.module';
import { DeepSeekModule } from '../deepseek/deepseek.module';
import { GithubModule } from '../github/github.module';
import { NightHuntController } from './night-hunt.controller';
import { NightHuntScheduler } from './night-hunt.scheduler';
import { NightHuntService } from './night-hunt.service';

@Module({
  imports: [GithubModule, ClaudeModule, DeepSeekModule],
  controllers: [NightHuntController],
  providers: [NightHuntService, NightHuntScheduler],
  exports: [NightHuntService],
})
export class NightHuntModule {}
