import { Injectable } from '@nestjs/common';

const TTL_MS = 10 * 60 * 1000;

@Injectable()
export class WebhookDeliveryCache {
  private readonly map = new Map<string, number>();

  has(id: string): boolean {
    this.prune();
    const exp = this.map.get(id);
    return exp !== undefined && exp > Date.now();
  }

  remember(id: string): void {
    this.prune();
    this.map.set(id, Date.now() + TTL_MS);
  }

  private prune(): void {
    const now = Date.now();
    for (const [k, exp] of this.map) {
      if (exp <= now) {
        this.map.delete(k);
      }
    }
  }
}
