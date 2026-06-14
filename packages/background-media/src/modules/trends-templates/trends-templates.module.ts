import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { TrendsTemplatesController } from './trends-templates.controller';
import { TrendsTemplatesService } from './trends-templates.service';

@Module({
  imports: [DevicesModule],
  controllers: [TrendsTemplatesController],
  providers: [TrendsTemplatesService],
})
export class TrendsTemplatesModule {}
