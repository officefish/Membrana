import { HttpException, HttpStatus, Inject, Injectable, Optional } from '@nestjs/common';

export interface PromoRateLimitAttempt {
  readonly accountId: string;
  readonly ip?: string | null;
  readonly nowMs?: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export const PROMO_REDEMPTION_RATE_LIMIT_OPTIONS = Symbol('PROMO_REDEMPTION_RATE_LIMIT_OPTIONS');

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 60_000;

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class PromoRedemptionRateLimiter {
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    @Optional()
    @Inject(PROMO_REDEMPTION_RATE_LIMIT_OPTIONS)
    options: { maxAttempts?: number; windowMs?: number } = {},
  ) {
    this.maxAttempts =
      options.maxAttempts ?? positiveInt(process.env.PROMO_REDEMPTION_RATE_LIMIT_MAX, DEFAULT_MAX_ATTEMPTS);
    this.windowMs =
      options.windowMs ?? positiveInt(process.env.PROMO_REDEMPTION_RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
  }

  assertAllowed(attempt: PromoRateLimitAttempt): void {
    const nowMs = attempt.nowMs ?? Date.now();
    const keys = [`account:${attempt.accountId}`];
    if (attempt.ip) keys.push(`ip:${attempt.ip}`);
    if (keys.some((key) => this.bucketFor(key, nowMs).count >= this.maxAttempts)) {
      throw new HttpException('promo redemption rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    for (const key of keys) this.bucketFor(key, nowMs).count += 1;
  }

  private bucketFor(key: string, nowMs: number): Bucket {
    const bucket = this.buckets.get(key);
    if (bucket && bucket.resetAt > nowMs) return bucket;
    const next = { count: 0, resetAt: nowMs + this.windowMs };
    this.buckets.set(key, next);
    return next;
  }
}
