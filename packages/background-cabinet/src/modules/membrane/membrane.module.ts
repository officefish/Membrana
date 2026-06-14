import { Module } from '@nestjs/common';
import { MembraneController } from './membrane.controller';
import { MembraneService } from './membrane.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MembraneController],
  providers: [MembraneService],
  exports: [MembraneService],
})
export class MembraneModule {}
