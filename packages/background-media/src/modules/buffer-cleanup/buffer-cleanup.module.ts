import { Module } from '@nestjs/common';

import { CollectionsModule } from '../collections/collections.module';
import { DevicesModule } from '../devices/devices.module';
import { SamplesModule } from '../samples/samples.module';
import { BufferCleanupController } from './buffer-cleanup.controller';
import { BufferCleanupService } from './buffer-cleanup.service';

/**
 * Удаление идёт через `SamplesService`, а не через prisma напрямую: там живут запреты
 * (тарифный набор), снятие блоба и владение пробой. Дубль этих правил в уборке означал бы
 * второй свод правил удаления — ровно то, чего быть не должно.
 */
@Module({
  imports: [CollectionsModule, SamplesModule, DevicesModule],
  controllers: [BufferCleanupController],
  providers: [BufferCleanupService],
})
export class BufferCleanupModule {}
