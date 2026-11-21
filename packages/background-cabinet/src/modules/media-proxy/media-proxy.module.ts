import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PairModule } from '../pair/pair.module';

import { MediaProxyController } from './media-proxy.controller';
import { MediaProxyService } from './media-proxy.service';

@Module({
  imports: [AuthModule, PairModule],
  controllers: [MediaProxyController],
  providers: [MediaProxyService],
})
export class MediaProxyModule {}
