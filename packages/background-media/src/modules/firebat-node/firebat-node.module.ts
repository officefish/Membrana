/**
 * Дом полевого узла в background-media (ADR-0027 Р2; #1998). Наружу — только этот модуль и
 * типы через index.ts; репозитории devices, приём WAV и хранилище ключей остаются internal.
 * Правило гардов: NodeKeyGuard — ТОЛЬКО на ручках узла (FirebatNodeController, лицо узла);
 * контроллер ключей (NodeKeyController) — под ApiTokenGuard + DeviceGuard, ключ выдаёт оператор.
 * Единственная новая межмодульная связь — firebat-node → samples (SamplesService.upload),
 * однонаправленная; из клиента и детекторов модуль не импортируется.
 */
import { Module } from '@nestjs/common';

import { DevicesModule } from '../devices/devices.module';
import { SamplesModule } from '../samples/samples.module';
import { FirebatNodeController } from './firebat-node.controller';
import { NodeKeyController } from './node-key.controller';
import { NodeKeyGuard } from './node-key.guard';
import { NodeKeyService } from './node-key.service';
import { TaskQueueService } from './task-queue.service';

@Module({
  imports: [DevicesModule, SamplesModule],
  controllers: [NodeKeyController, FirebatNodeController],
  providers: [NodeKeyService, NodeKeyGuard, TaskQueueService],
  exports: [NodeKeyService, NodeKeyGuard],
})
export class FirebatNodeModule {}
