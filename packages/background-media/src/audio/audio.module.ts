import { Module } from '@nestjs/common';
import { AudioIngestService } from './audio-ingest.service';

@Module({
  providers: [AudioIngestService],
  exports: [AudioIngestService],
})
export class AudioModule {}
