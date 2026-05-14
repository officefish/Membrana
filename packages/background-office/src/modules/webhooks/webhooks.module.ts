import { Module } from '@nestjs/common';
import { LinearWebhookController } from './linear-webhook.controller';
import { WebhookDeliveryCache } from './webhook-delivery.cache';

@Module({
  controllers: [LinearWebhookController],
  providers: [WebhookDeliveryCache],
})
export class WebhooksModule {}
