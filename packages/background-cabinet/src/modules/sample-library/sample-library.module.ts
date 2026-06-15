import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PairModule } from '../pair/pair.module';
import { SampleLibraryController } from './sample-library.controller';
import { SampleLibraryService } from './sample-library.service';

@Module({
  imports: [AuthModule, PairModule],
  controllers: [SampleLibraryController],
  providers: [SampleLibraryService],
  exports: [SampleLibraryService],
})
export class SampleLibraryModule {}
