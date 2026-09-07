import { Module } from '@nestjs/common';
import { AudioModule } from '../../audio/audio.module';
import { BlobModule } from '../../blob/blob.module';
import { CollectionsModule } from '../collections/collections.module';
import { DevicesModule } from '../devices/devices.module';
import { OverflowEpisodeRegistry } from './overflow-episode-registry';
import { SamplesController } from './samples.controller';
import { SamplesService } from './samples.service';

@Module({
  imports: [BlobModule, AudioModule, CollectionsModule, DevicesModule],
  controllers: [SamplesController],
  /** Реестр эпизодов переполнения — один на процесс: носитель `overflowId` (M2, #2307). */
  providers: [SamplesService, OverflowEpisodeRegistry],
  /** Единственный внешний потребитель — FirebatNodeModule (результат задания = та же загрузка, ADR-0027). */
  exports: [SamplesService],
})
export class SamplesModule {}
