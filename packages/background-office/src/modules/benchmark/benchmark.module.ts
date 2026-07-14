import { Module } from '@nestjs/common';

import { PanelAuthModule } from '../panel-auth/panel-auth.module';
import { BenchmarkController } from './benchmark.controller';
import { BenchmarkService } from './benchmark.service';

@Module({
  imports: [PanelAuthModule],
  controllers: [BenchmarkController],
  providers: [BenchmarkService],
})
export class BenchmarkModule {}
