import { Module } from '@nestjs/common';
import { GithubModule } from '../github/github.module';
import { OpenRouterModule } from '../openrouter/openrouter.module';
import { NightHuntController } from './night-hunt.controller';
import { NightHuntScheduler } from './night-hunt.scheduler';
import { NightHuntService } from './night-hunt.service';

@Module({
  imports: [GithubModule, OpenRouterModule],
  controllers: [NightHuntController],
  providers: [NightHuntService, NightHuntScheduler],
  exports: [NightHuntService],
})
export class NightHuntModule {}
