import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * OP5 E2E: rate-limit и сквозной no-store через реальный HTTP.
 * Лимит занижается env ДО создания приложения (config читает process.env
 * при бутстрапе) — отдельный файл, чтобы не влиять на panel-auth.e2e.
 */
describe('panel-hardening E2E (OP5)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.PANEL_RATE_LIMIT_PER_MIN = '5';
    const { AppModule } = await import('../src/app.module');
    app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
      bufferLogs: true,
    });
    app.useLogger(false);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    delete process.env.PANEL_RATE_LIMIT_PER_MIN;
    if (app) await app.close();
  });

  it('no-store стоит и на успехе, и на отказе (guard ставит до вердикта)', async () => {
    const ok = await request(app.getHttpServer()).get('/v1/panel/auth/me').expect(200);
    expect(ok.headers['cache-control']).toBe('no-store');

    const denied = await request(app.getHttpServer())
      .get('/v1/panel/auth/whoami-operator')
      .expect(401);
    expect(denied.headers['cache-control']).toBe('no-store');
  });

  it('rate-limit: превышение окна → 429 (клиент различается по XFF)', async () => {
    const agent = () =>
      request(app.getHttpServer()).get('/v1/panel/auth/me').set('X-Forwarded-For', '203.0.113.99');
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      statuses.push((await agent()).status);
    }
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThanOrEqual(1);
    // другой клиент в том же окне не задет
    const other = await request(app.getHttpServer())
      .get('/v1/panel/auth/me')
      .set('X-Forwarded-For', '198.51.100.42');
    expect(other.status).toBe(200);
  });
});
