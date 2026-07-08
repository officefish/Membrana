import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JournalModule } from '../journal/journal.module';
import { DeviceCaptureRegistry } from './device-capture.registry';
import { DeviceScenarioRegistry } from './device-scenario.registry';
import {
  SCENARIO_SELECTION_STORE,
  PrismaScenarioSelectionStore,
} from './scenario-selection.store';
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
    DeviceCaptureRegistry,
    DeviceScenarioRegistry,
    // TD2: персистентность выбора сценария поверх @Global PrismaService.
    { provide: SCENARIO_SELECTION_STORE, useClass: PrismaScenarioSelectionStore },
  ],
  exports: [NodeRealtimeService, DeviceCaptureRegistry, DeviceScenarioRegistry],
})
export class NodeRealtimeModule {}
