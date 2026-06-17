import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JournalModule } from '../journal/journal.module';
import { NodeRealtimeAuthService } from './node-realtime-auth.service';
import { NodeRealtimeGateway } from './node-realtime.gateway';
import { NodeRealtimeJournalHandler } from './node-realtime-journal.handler';
import { NodeRealtimeService } from './node-realtime.service';

@Module({
  imports: [AuthModule, JournalModule],
  providers: [
    NodeRealtimeService,
    NodeRealtimeAuthService,
    NodeRealtimeJournalHandler,
    NodeRealtimeGateway,
  ],
  exports: [NodeRealtimeService],
})
export class NodeRealtimeModule {}
