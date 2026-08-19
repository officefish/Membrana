import { Module } from '@nestjs/common';
import { AudioModule } from '../../audio/audio.module';
import { BlobModule } from '../../blob/blob.module';
import { CollectionsModule } from '../collections/collections.module';
import { DevicesModule } from '../devices/devices.module';
import { SamplesController } from './samples.controller';
import { SamplesService } from './samples.service';

@Module({
  imports: [BlobModule, AudioModule, CollectionsModule, DevicesModule],
  controllers: [SamplesController],
  providers: [SamplesService],
  /** Единственный внешний потребитель — FirebatNodeModule (результат задания = та же загрузка, ADR-0027). */
  exports: [SamplesService],
})
export class SamplesModule {}
