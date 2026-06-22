import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagGatewayService } from './rag-gateway.service';

@Module({
  providers: [RagGatewayService],
  controllers: [RagController],
  exports: [RagGatewayService],
})
export class RagModule {}
