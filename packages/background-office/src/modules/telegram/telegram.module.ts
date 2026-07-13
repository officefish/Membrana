import { Module } from '@nestjs/common';

import { TelegramClient } from './telegram.client';
import { TelegramController } from './telegram.controller';

@Module({
  controllers: [TelegramController],
  providers: [TelegramClient],
  exports: [TelegramClient],
})
export class TelegramModule {}
