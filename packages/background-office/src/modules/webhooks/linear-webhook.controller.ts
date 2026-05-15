import {
  BadRequestException,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { WebhookDeliveryCache } from './webhook-delivery.cache';
import { verifyLinearWebhookSignature } from './linear-signature';
import { getLinearWebhookRawBody } from './webhook-raw-body';

@ApiTags('Webhooks')
@Controller('webhooks')
export class LinearWebhookController {
  private readonly logger = new Logger(LinearWebhookController.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(WebhookDeliveryCache) private readonly deliveries: WebhookDeliveryCache,
  ) {}

  @Post('linear')
  @ApiOperation({ summary: 'Linear webhook receiver' })
  @ApiHeader({
    name: 'Linear-Signature',
    description: 'HMAC-SHA256 signature of the raw body (hex encoded)',
    required: true,
  })
  @ApiHeader({
    name: 'Linear-Delivery',
    description: 'Unique delivery identifier for idempotency',
    required: false,
  })
  @ApiHeader({
    name: 'Linear-Event',
    description: 'Type of Linear event',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Webhook received', schema: { type: 'object', properties: { received: { type: 'boolean' } } } })
  @ApiResponse({ status: 400, description: 'Missing raw JSON body' })
  @ApiResponse({ status: 403, description: 'Invalid webhook signature' })
  @HttpCode(HttpStatus.OK)
  handle(@Req() req: RawBodyRequest<Request>): { received: boolean } {
    const raw = getLinearWebhookRawBody(req);
    if (!raw) {
      throw new BadRequestException('Expected raw JSON body');
    }

    const sig =
      req.get('linear-signature') ??
      req.get('Linear-Signature') ??
      undefined;

    if (
      !verifyLinearWebhookSignature(
        this.config.LINEAR_WEBHOOK_SECRET,
        raw,
        sig,
      )
    ) {
      throw new ForbiddenException();
    }

    const deliveryHeader =
      req.get('linear-delivery') ?? req.get('Linear-Delivery') ?? '';
    const deliveryId =
      deliveryHeader.trim() ||
      createHash('sha256').update(raw).digest('hex');

    if (this.deliveries.has(deliveryId)) {
      return { received: true };
    }

    this.deliveries.remember(deliveryId);

    const rawStr = raw.toString('utf8');
    setImmediate(() => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawStr) as unknown;
      } catch {
        parsed = { parseError: true };
      }
      this.logger.log(
        `Linear webhook (background) delivery=${deliveryId} event=${req.get('linear-event') ?? req.get('Linear-Event') ?? ''} payload=${JSON.stringify(parsed)}`,
      );
    });

    return { received: true };
  }
}
