import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { HealthDeepController } from './health-deep.controller';
import { HealthDeepService } from './health-deep.service';

/** `/health/deep` — предметный прибор кабинета (кусок D #2121, вердикт M2). */
@Module({
  imports: [PrismaModule],
  controllers: [HealthDeepController],
  providers: [HealthDeepService],
})
export class HealthDeepModule {}
