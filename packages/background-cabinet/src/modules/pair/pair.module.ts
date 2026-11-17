import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaBridgeService } from './media-bridge.service';
import { MediaDowngradeArchiveClient } from './media-downgrade-archive.port';
import { MembraneContextFanoutService } from './membrane-context-fanout.service';
import { MembraneTariffFanoutRunService } from './membrane-tariff-fanout-run.service';
import { PairController } from './pair.controller';
import { PairService } from './pair.service';

@Module({
  imports: [AuthModule],
  controllers: [PairController],
  // #2587 b4: порт дверей архива понижения media — отдельный класс рядом с мостом.
  providers: [PairService, MediaBridgeService, MediaDowngradeArchiveClient, MembraneContextFanoutService, MembraneTariffFanoutRunService],
  exports: [MediaBridgeService, MediaDowngradeArchiveClient, MembraneContextFanoutService, MembraneTariffFanoutRunService],
})
export class PairModule {}
