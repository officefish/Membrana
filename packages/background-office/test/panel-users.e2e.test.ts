import 'reflect-metadata';
import { rmSync } from 'node:fs';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import {
  mintSessionToken,
  PANEL_SESSION_COOKIE,
} from '../src/modules/panel-auth/panel-auth-core';

const SECRET = 'test-panel-session-secret'; // = setup-env.ts

function ownerCookie(): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${PANEL_SESSION_COOKIE}=${mintSessionToken(SECRET, 'owner', 'github:1:owner', exp)}`;
}

/**
 * E2E PU1 (#463, ADR 0005): партнёрский сценарий конец-в-конец через реальный
 * HTTP — чеканка кода owner'ом, регистрация, permVersion-эпоха в /me
 * (тихое переиздание cookie), revoke → public, 404 admin-ручек не-owner'у.
 */
describe('panel-users E2E (PU1): промокод → регистрация → эпоха → revoke', () => {
  let app: INestApplication;

  beforeAll(async () => {
    rmSync(process.env.PANEL_USERS_STORE_PATH!, { force: true });
    app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), {
      bufferLogs: true,
    });
    app.useLogger(false);
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    rmSync(process.env.PANEL_USERS_STORE_PATH!, { force: true });
  });

  it('admin-ручки для public и ally — 404 (существование не подтверждаем)', async () => {
    await request(app.getHttpServer()).get('/v1/panel/admin/users').expect(404);
    const allyExp = Math.floor(Date.now() / 1000) + 3600;
    await request(app.getHttpServer())
      .get('/v1/panel/admin/promo-codes')
      .set('Cookie', `${PANEL_SESSION_COOKIE}=${mintSessionToken(SECRET, 'ally', 'invite:x', allyExp)}`)
      .expect(404);
  });

  it('регистрация с несуществующим кодом — 403 одной формулировкой', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/panel/register')
      .send({ code: 'WRONGCODE0000000', name: 'Петров' })
      .expect(403);
    expect(res.body.message).toBe('code was not accepted');
  });

  it('полный цикл: чеканка → регистрация → галочки (эпоха) → revoke', async () => {
    const server = app.getHttpServer();

    // owner чеканит код «на всё» — код виден целиком только здесь.
    const mint = await request(server)
      .post('/v1/panel/admin/promo-codes')
      .set('Cookie', ownerCookie())
      .send({ label: 'press-2026', grants: ['*'], days: 7, maxUses: 2 })
      .expect(201);
    expect(mint.body.code).toMatch(/^[A-Z0-9]{16}$/);

    // в admin-списке — только префикс, не сам код.
    const list = await request(server)
      .get('/v1/panel/admin/promo-codes')
      .set('Cookie', ownerCookie())
      .expect(200);
    expect(list.body.codes[0].codePrefix).toBe(`${mint.body.code.slice(0, 4)}…`);
    expect(JSON.stringify(list.body)).not.toContain(mint.body.code);

    // партнёр регистрируется: ally + wildcard-гранты + партнёрская cookie.
    const reg = await request(server)
      .post('/v1/panel/register')
      .send({ code: mint.body.code, name: 'Партнёр Пётр' })
      .expect(201);
    expect(reg.body).toMatchObject({ ok: true, role: 'ally', grants: ['*'] });
    const partnerCookie = String(reg.headers['set-cookie']![0]).split(';')[0]!;

    // /me с актуальной эпохой — гранты из cookie, без переиздания.
    const me1 = await request(server).get('/v1/panel/auth/me').set('Cookie', partnerCookie).expect(200);
    expect(me1.body.role).toBe('ally');
    expect(me1.body.grants).toEqual(['*']);

    // owner сужает гранты — permVersion растёт.
    const users = await request(server).get('/v1/panel/admin/users').set('Cookie', ownerCookie()).expect(200);
    const userId = users.body.users[0].id as string;
    await request(server)
      .patch(`/v1/panel/admin/users/${userId}/grants`)
      .set('Cookie', ownerCookie())
      .send({ grants: ['detector-compare'] })
      .expect(200);

    // старая cookie отстала: /me отдаёт СВЕЖИЕ гранты и тихо переиздаёт cookie.
    const me2 = await request(server).get('/v1/panel/auth/me').set('Cookie', partnerCookie).expect(200);
    expect(me2.body.grants).toEqual(['detector-compare']);
    const reissued = String(me2.headers['set-cookie']![0]).split(';')[0]!;
    expect(reissued).not.toBe(partnerCookie);

    // revoke → /me гасит cookie → public.
    await request(server)
      .post(`/v1/panel/admin/users/${userId}/revoke`)
      .set('Cookie', ownerCookie())
      .expect(201);
    const me3 = await request(server).get('/v1/panel/auth/me').set('Cookie', reissued).expect(200);
    expect(me3.body).toEqual({ role: 'public', sub: null, grants: [] });

    // аудит содержит регистрацию и смену грантов.
    const audit = await request(server).get('/v1/panel/admin/users').set('Cookie', ownerCookie()).expect(200);
    const actions = (audit.body.audit as { action: string }[]).map((a) => a.action);
    expect(actions).toEqual(
      expect.arrayContaining(['mint-code', 'register', 'grants', 'revoke-user']),
    );
  });
});
