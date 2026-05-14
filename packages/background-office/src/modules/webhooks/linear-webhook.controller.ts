import {
  BadRequestException,
  Controller,
  Inject,
  Logger,
  Post,
  Req,
  Res,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { WebhookDeliveryCache } from './webhook-delivery.cache';
import { verifyLinearWebhookSignature } from './linear-signature';
import { getLinearWebhookRawBody } from './webhook-raw-body';

@Controller('webhooks')
export class LinearWebhookController {
  private readonly logger = new Logger(LinearWebhookController.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(WebhookDeliveryCache) private readonly deliveries: WebhookDeliveryCache,
  ) {}

  @Post('linear')
  handle(@Req() req: RawBodyRequest<Request>, @Res() res: Response): void {
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
      res.status(403).end();
      return;
    }

    const deliveryHeader =
      req.get('linear-delivery') ?? req.get('Linear-Delivery') ?? '';
    const deliveryId =
      deliveryHeader.trim() ||
      createHash('sha256').update(raw).digest('hex');

    if (this.deliveries.has(deliveryId)) {
      res.status(200).json({ received: true });
      return;
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

    res.status(200).json({ received: true });
  }
}
