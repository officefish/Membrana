import { Module } from '@nestjs/common';
import { MembraneController } from './membrane.controller';
import { MembraneBufferPolicyService } from './membrane-buffer-policy.service';
import { MembraneDowngradePolicyController } from './membrane-downgrade-policy.controller';
import { MembraneDowngradePolicyService } from './membrane-downgrade-policy.service';
import { MembraneService } from './membrane.service';
import { AuthModule } from '../auth/auth.module';
import { NodeRealtimeModule } from '../node-realtime/node-realtime.module';
import { DeviceCaptureModule } from '../device-capture/device-capture.module';
import { PairModule } from '../pair/pair.module';

@Module({
  // PL4: DeviceCaptureModule — для форс-release захвата при отзыве/удалении ключа.
  // PairModule — мост в media и разноска контекста (квоты + политика переполнения, #2308).
  imports: [AuthModule, NodeRealtimeModule, DeviceCaptureModule, PairModule],
  // #2587 b4a: режим отбора при понижении — свой контроллер и сервис; сервис экспортируется для
  // оркестратора понижения в TariffModule (блок b4b, следующим PR).
  controllers: [MembraneController, MembraneDowngradePolicyController],
  providers: [MembraneService, MembraneBufferPolicyService, MembraneDowngradePolicyService],
  exports: [MembraneService, MembraneDowngradePolicyService],
})
export class MembraneModule {}
