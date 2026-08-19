/**
 * Дом полевого узла в background-media (ADR-0027 Р2; #1998). Наружу — только этот модуль и
 * типы через index.ts; репозитории devices, приём WAV и хранилище ключей остаются internal.
 * Правило гардов: NodeKeyGuard — ТОЛЬКО на ручках узла (b3); контроллер ключей
 * (NodeKeyController) — под ApiTokenGuard + DeviceGuard, ключ выдаёт оператор.
 * b2: монтируется выдача/отзыв ключа; ручки узла и очередь заданий добавляет b3.
 */
import { Module } from '@nestjs/common';

import { DevicesModule } from '../devices/devices.module';
import { NodeKeyController } from './node-key.controller';
import { NodeKeyGuard } from './node-key.guard';
import { NodeKeyService } from './node-key.service';

@Module({
  imports: [DevicesModule],
  controllers: [NodeKeyController],
  providers: [NodeKeyService, NodeKeyGuard],
  exports: [NodeKeyService, NodeKeyGuard],
})
export class FirebatNodeModule {}
