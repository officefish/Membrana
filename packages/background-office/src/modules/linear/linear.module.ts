import { Module } from '@nestjs/common';
import { LinearService } from './linear.service';
import { LinearController } from './linear.controller';

@Module({
  providers: [LinearService],
  controllers: [LinearController],
  exports: [LinearService],
})
export class LinearModule {}
