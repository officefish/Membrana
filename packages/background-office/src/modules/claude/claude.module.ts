import { Module } from '@nestjs/common';
import { ClaudeService } from './claude.service';
import { ClaudeController } from './claude.controller';
import { PersonaLoaderService } from './persona-loader.service';
import { PersonaAskService } from './persona-ask.service';
import { GithubModule } from '../github/github.module';
import { LinearModule } from '../linear/linear.module';

@Module({
  imports: [GithubModule, LinearModule],
  providers: [ClaudeService, PersonaLoaderService, PersonaAskService],
  controllers: [ClaudeController],
})
export class ClaudeModule {}
